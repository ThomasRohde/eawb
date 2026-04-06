import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormatsModule from 'ajv-formats';

// ajv-formats is a CJS default export; under Node16 + tsup DTS the synthetic
// default sometimes resolves as the module namespace, so unwrap and re-type it
// as a plain callable.
const addFormats = ((addFormatsModule as unknown as { default?: unknown }).default ??
  addFormatsModule) as (ajv: Ajv) => Ajv;

/**
 * Shared Ajv instance. `strict: false` so user-authored schemas with extra
 * keywords (e.g. JSON Forms `options`) don't trip the meta-schema check.
 */
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export class InvalidJsonSchemaError extends Error {
  constructor(
    message: string,
    public readonly errors: ErrorObject[] = [],
  ) {
    super(message);
    this.name = 'InvalidJsonSchemaError';
  }
}

export class InvalidUiSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUiSchemaError';
  }
}

const KNOWN_UI_TYPES = new Set([
  'VerticalLayout',
  'HorizontalLayout',
  'Group',
  'Categorization',
  'Category',
  'Control',
  'Label',
]);

const CONTAINER_TYPES = new Set(['VerticalLayout', 'HorizontalLayout', 'Group']);

/**
 * Compile a JSON Schema. Throws InvalidJsonSchemaError if the schema itself
 * is malformed (bad keywords, broken $refs, invalid meta-schema, etc.).
 */
export function compileSchema(jsonSchema: unknown): ValidateFunction {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    throw new InvalidJsonSchemaError('JSON Schema must be a non-null object');
  }
  try {
    return ajv.compile(jsonSchema as object);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new InvalidJsonSchemaError(message);
  }
}

/**
 * Resolve a JSON Forms `Control.scope` (e.g. `#/properties/foo/properties/bar`)
 * inside the supplied JSON Schema. Returns true when every segment exists.
 */
function resolveScopeInSchema(jsonSchema: Record<string, unknown>, scope: string): boolean {
  if (!scope.startsWith('#/')) return false;
  const segments = scope
    .slice(2)
    .split('/')
    .filter(Boolean)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cursor: unknown = jsonSchema;
  for (const segment of segments) {
    if (cursor && typeof cursor === 'object' && segment in (cursor as object)) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return false;
    }
  }
  return cursor != null;
}

interface WalkContext {
  jsonSchema: Record<string, unknown> | undefined;
  seenScopes: Set<string>;
}

function walkUiElement(element: unknown, ctx: WalkContext, path: string): void {
  const where = path || 'root';
  if (!element || typeof element !== 'object' || Array.isArray(element)) {
    throw new InvalidUiSchemaError(`UI Schema element at ${where} must be an object`);
  }
  const el = element as Record<string, unknown>;
  const type = el.type;
  if (typeof type !== 'string' || !KNOWN_UI_TYPES.has(type)) {
    throw new InvalidUiSchemaError(
      `UI Schema element at ${where} has unknown type: ${JSON.stringify(type)}. ` +
        `Expected one of: ${[...KNOWN_UI_TYPES].join(', ')}`,
    );
  }

  if (type === 'Control') {
    const scope = el.scope;
    if (typeof scope !== 'string' || !scope.startsWith('#/')) {
      throw new InvalidUiSchemaError(
        `Control at ${where} requires a string "scope" starting with "#/"`,
      );
    }
    if (ctx.seenScopes.has(scope)) {
      throw new InvalidUiSchemaError(`Duplicate Control scope detected: ${scope} (at ${where})`);
    }
    ctx.seenScopes.add(scope);
    if (ctx.jsonSchema && !resolveScopeInSchema(ctx.jsonSchema, scope)) {
      throw new InvalidUiSchemaError(
        `Control scope "${scope}" at ${where} does not resolve in the JSON Schema`,
      );
    }
    return;
  }

  if (type === 'Label') {
    return;
  }

  if (CONTAINER_TYPES.has(type)) {
    const elements = el.elements;
    if (!Array.isArray(elements)) {
      throw new InvalidUiSchemaError(`${type} at ${where} requires an "elements" array`);
    }
    elements.forEach((child, idx) => walkUiElement(child, ctx, `${where}/${type}[${idx}]`));
    return;
  }

  if (type === 'Categorization') {
    const elements = el.elements;
    if (!Array.isArray(elements) || elements.length === 0) {
      throw new InvalidUiSchemaError(
        `Categorization at ${where} requires a non-empty "elements" array of Category entries`,
      );
    }
    elements.forEach((cat, idx) => {
      if (!cat || typeof cat !== 'object' || Array.isArray(cat)) {
        throw new InvalidUiSchemaError(
          `Categorization child at ${where}/Categorization[${idx}] must be a Category object`,
        );
      }
      const c = cat as Record<string, unknown>;
      if (c.type !== 'Category') {
        throw new InvalidUiSchemaError(
          `Categorization child at ${where}/Categorization[${idx}] must have type "Category"`,
        );
      }
      const catElements = c.elements;
      if (!Array.isArray(catElements)) return;
      catElements.forEach((child: unknown, j: number) =>
        walkUiElement(child, ctx, `${where}/Category[${idx}][${j}]`),
      );
    });
    return;
  }

  if (type === 'Category') {
    const elements = el.elements;
    if (Array.isArray(elements)) {
      elements.forEach((child: unknown, idx: number) =>
        walkUiElement(child, ctx, `${where}/Category[${idx}]`),
      );
    }
    return;
  }
}

/**
 * Walk a UI Schema and collect every `Control.scope` reference.
 * Used by the AI route to verify a layout-only refactor didn't drop any
 * controls referenced by the original schema.
 */
export function collectControlScopes(uiSchema: unknown): string[] {
  const out: string[] = [];
  function visit(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (obj.type === 'Control' && typeof obj.scope === 'string') {
      out.push(obj.scope);
      return;
    }
    if (Array.isArray(obj.elements)) {
      for (const child of obj.elements) visit(child);
    }
  }
  visit(uiSchema);
  return out;
}

/**
 * Recursive structural validator for JSON Forms UI Schemas.
 *
 * - Every element must be an object with a known `type`.
 * - Container layouts (`VerticalLayout`, `HorizontalLayout`, `Group`) require
 *   an `elements` array.
 * - `Categorization` requires a non-empty `elements` array of `Category`
 *   entries; each Category may have its own `elements`.
 * - Every `Control` must have a string `scope` starting with `#/`.
 * - No two Controls may share a scope.
 * - When `jsonSchema` is supplied, every Control scope must resolve into it.
 *
 * This is the server-side gate for both the REST CRUD routes and the AI
 * execution path. A broken layout (missing controls, dangling scopes, wrong
 * shapes) gets rejected before it touches disk.
 */
export function validateUiSchema(uiSchema: unknown, jsonSchema?: unknown): void {
  if (!uiSchema || typeof uiSchema !== 'object' || Array.isArray(uiSchema)) {
    throw new InvalidUiSchemaError('UI Schema must be a non-null object');
  }
  const resolvedJsonSchema =
    jsonSchema && typeof jsonSchema === 'object' && !Array.isArray(jsonSchema)
      ? (jsonSchema as Record<string, unknown>)
      : undefined;
  walkUiElement(
    uiSchema,
    {
      jsonSchema: resolvedJsonSchema,
      seenScopes: new Set<string>(),
    },
    '',
  );
}

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

/**
 * Validate `data` against a JSON Schema. Compiles every call (cheap for the
 * sizes we expect; revisit if a hot path appears).
 */
export function validateData(jsonSchema: unknown, data: unknown): ValidationResult {
  const validate = compileSchema(jsonSchema);
  const valid = validate(data) as boolean;
  return { valid, errors: validate.errors ?? [] };
}
