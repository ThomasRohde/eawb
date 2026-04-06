/**
 * Prompt builders for JSON Forms AI actions. Each builder produces a single
 * plain-text prompt that the AI orchestrator passes to Copilot CLI verbatim.
 *
 * Every prompt explicitly tells the AI to respond ONLY with one JSON object
 * (no markdown fences, no commentary) so the ACP layer's automatic JSON
 * extraction always succeeds.
 */

export interface ActiveSchemaContext {
  title: string;
  jsonSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
}

export interface JsonFormsPromptInput {
  actionId: string;
  activeSchema?: ActiveSchemaContext;
  /** Free-text user input from the action dialog (e.g. description, instruction). */
  userInput?: string;
}

const VOCABULARY_BLURB = `
Vocabulary you may use:
- JSON Schema: type=object|string|integer|number|boolean|array, properties, required, minLength, maxLength, minimum, maximum, minItems, maxItems, pattern, default, description, title, enum, oneOf (for titled enums: { "const": "P0", "title": "Critical" }).
- String formats: "date" (yyyy-mm-dd), "time" (HH:mm:ss), "date-time" (ISO 8601), "email", "uri".
- Object arrays: items as { type: "object", properties: ... }.
- UI Schema: top-level layout is one of VerticalLayout, HorizontalLayout, Group (with label), or Categorization (with elements: [{ type: "Category", label, elements: [...] }]).
- Inside layouts use Control elements with scope: "#/properties/fieldName".
- For multi-line strings, set the Control's options: { "multi": true }.
`.trim();

const STRICT_OUTPUT = `Respond ONLY with one JSON object. No markdown fences, no commentary, no explanations.`;

export function buildGeneratePrompt(userInput: string): string {
  return `You are an expert form designer. Generate a JSON Schema and a JSON Forms UI Schema for the following form.

Description:
${userInput || '(no description provided)'}

${VOCABULARY_BLURB}

Requirements:
- The JSON Schema MUST have type: "object" at the root.
- Pick a meaningful "title" for the JSON Schema.
- Mark genuinely required fields in the "required" array.
- Use enums (or oneOf with titles) for fixed sets of choices.
- Add a one-sentence "description" on every property.
- Use formats (date, time, date-time, email, uri) where the field semantics call for it.
- Group related fields with Group layouts. For forms with more than 12 fields use a Categorization with 2-4 categories.

${STRICT_OUTPUT}

Output shape:
{ "jsonSchema": { ... }, "uiSchema": { ... } }`;
}

export function buildRefinePrompt(active: ActiveSchemaContext, instruction: string): string {
  return `You are an expert form designer. Apply the following refinement to an existing form schema and return the COMPLETE revised schema.

Form title: ${active.title}

Current JSON Schema:
${JSON.stringify(active.jsonSchema, null, 2)}

Current UI Schema:
${JSON.stringify(active.uiSchema, null, 2)}

Refinement instruction:
${instruction || '(no instruction)'}

${VOCABULARY_BLURB}

Requirements:
- Return the FULL revised JSON Schema and UI Schema (not a diff).
- Preserve existing field IDs/property names where possible so existing data is not orphaned.
- Only change what the instruction asks for; leave the rest untouched.
- Keep validation constraints unless the instruction says otherwise.

${STRICT_OUTPUT}

Output shape:
{ "jsonSchema": { ... }, "uiSchema": { ... } }`;
}

export function buildValidationsPrompt(active: ActiveSchemaContext): string {
  return `You are an expert form designer. Inspect this JSON Schema and propose validation constraints for fields that lack them.

Form title: ${active.title}

JSON Schema:
${JSON.stringify(active.jsonSchema, null, 2)}

For each field, suggest constraints that fit the field's semantic meaning:
- string: minLength, maxLength, pattern (regex), format (email/uri/date/time/date-time)
- integer/number: minimum, maximum
- enums where the field clearly has a fixed set of values

Skip fields that already have appropriate constraints. Be conservative — only suggest constraints you are confident about.

${STRICT_OUTPUT}

Output shape:
{
  "suggestions": [
    {
      "pointer": "/properties/fieldName",
      "field": "fieldName",
      "current": { ...current schema fragment for this field, optional... },
      "proposed": { ...proposed JSON Schema fragment to merge into the field... },
      "rationale": "One short sentence explaining why."
    }
  ]
}`;
}

export function buildDescriptionsPrompt(active: ActiveSchemaContext): string {
  return `You are an expert form designer. Write a concise one-sentence description for every property in this JSON Schema that does not already have a description. Skip properties that already have a non-empty description.

Form title: ${active.title}

JSON Schema:
${JSON.stringify(active.jsonSchema, null, 2)}

Each description should explain what the field captures and (where useful) when to fill it in. Keep it under 140 characters.

${STRICT_OUTPUT}

Output shape:
{
  "descriptions": [
    { "pointer": "/properties/fieldName", "field": "fieldName", "description": "One sentence." }
  ]
}`;
}

export function buildLayoutPrompt(active: ActiveSchemaContext): string {
  return `You are an expert form designer. Reorganise this UI Schema into a clearer layout. The JSON Schema and the set of fields are FIXED — only restructure the layout containers (Group / Categorization / Vertical / Horizontal).

Form title: ${active.title}

JSON Schema (read-only — list of fields):
${JSON.stringify(active.jsonSchema, null, 2)}

Current UI Schema:
${JSON.stringify(active.uiSchema, null, 2)}

Goals:
- Cluster semantically related fields into Group layouts with clear labels.
- For forms with more than 12 fields, use a Categorization at the top with 2-4 Categories.
- Place short related fields side-by-side using HorizontalLayout where it makes sense.
- Do NOT add, remove, or rename any Control element. Every existing scope must still appear exactly once.

${STRICT_OUTPUT}

Output shape:
{ "uiSchema": { ... } }`;
}

/**
 * Single dispatch function used by the runtime route. Picks the right prompt
 * builder for the given action id.
 */
export function buildJsonFormsPrompt(input: JsonFormsPromptInput): string {
  switch (input.actionId) {
    case 'json-forms.generate_schema':
      return buildGeneratePrompt(input.userInput ?? '');
    case 'json-forms.refine_schema':
      if (!input.activeSchema) throw new Error('refine_schema requires an active schema');
      return buildRefinePrompt(input.activeSchema, input.userInput ?? '');
    case 'json-forms.suggest_validations':
      if (!input.activeSchema) throw new Error('suggest_validations requires an active schema');
      return buildValidationsPrompt(input.activeSchema);
    case 'json-forms.add_descriptions':
      if (!input.activeSchema) throw new Error('add_descriptions requires an active schema');
      return buildDescriptionsPrompt(input.activeSchema);
    case 'json-forms.improve_layout':
      if (!input.activeSchema) throw new Error('improve_layout requires an active schema');
      return buildLayoutPrompt(input.activeSchema);
    default:
      throw new Error(`Unknown json-forms action: ${input.actionId}`);
  }
}

/** Action ids that require an active schema. */
export const ACTIONS_REQUIRING_SCHEMA = new Set([
  'json-forms.refine_schema',
  'json-forms.suggest_validations',
  'json-forms.add_descriptions',
  'json-forms.improve_layout',
]);
