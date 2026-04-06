import type { FastifyInstance } from 'fastify';
import { success, failure } from '@ea-workbench/shared-schema';
import { FormStore, NotFoundError } from './storage/form-store.js';
import {
  CreateSchemaBodySchema,
  ListSubmissionsQuerySchema,
  SubmissionBodySchema,
  UpdateSchemaBodySchema,
} from './schemas.js';
import {
  InvalidJsonSchemaError,
  InvalidUiSchemaError,
  compileSchema,
  validateData,
  validateUiSchema,
} from './validation/json-schema-validator.js';

interface ValidationFailureBody {
  ok: false;
  error: string;
  code: string;
  details?: unknown;
}

function validationFailure(error: string, code: string, details?: unknown): ValidationFailureBody {
  return { ok: false, error, code, details };
}

export async function jsonFormsRoutes(app: FastifyInstance): Promise<void> {
  const getStore = () => {
    const workspacePath = (app as any).workspacePath as string;
    return new FormStore(workspacePath);
  };

  const notifyAutoCheckpoint = (label: string) => {
    (app as any).autoCheckpoint?.notifyArtifactSaved?.(label);
  };

  // List schemas
  app.get('/schemas', async () => {
    const store = getStore();
    return success(store.listSchemas());
  });

  // Create schema
  app.post('/schemas', async (request, reply) => {
    const parsed = CreateSchemaBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send(validationFailure('Invalid request body', 'INVALID_BODY', parsed.error.issues));
    }
    const { title, description, jsonSchema, uiSchema } = parsed.data;

    // If a body was supplied, validate it before creating anything on disk.
    if (jsonSchema !== undefined || uiSchema !== undefined) {
      if (jsonSchema === undefined || uiSchema === undefined) {
        return reply
          .code(400)
          .send(
            validationFailure('jsonSchema and uiSchema must be provided together', 'INVALID_BODY'),
          );
      }
      try {
        compileSchema(jsonSchema);
        validateUiSchema(uiSchema, jsonSchema);
      } catch (err) {
        return reply.code(400).send(toValidationFailure(err));
      }
    }

    const store = getStore();
    const meta = store.createSchema(title, { description, jsonSchema, uiSchema });
    notifyAutoCheckpoint(meta.id);
    return success(meta);
  });

  // Get schema
  app.get<{ Params: { id: string } }>('/schemas/:id', async (request, reply) => {
    const store = getStore();
    try {
      return success(store.getSchema(request.params.id));
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.code(404).send(failure(err.message, 'NOT_FOUND'));
      }
      throw err;
    }
  });

  // Update schema (full body required)
  app.put<{ Params: { id: string } }>('/schemas/:id', async (request, reply) => {
    const parsed = UpdateSchemaBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send(validationFailure('Invalid request body', 'INVALID_BODY', parsed.error.issues));
    }
    const { title, description, jsonSchema, uiSchema } = parsed.data;

    try {
      compileSchema(jsonSchema);
      validateUiSchema(uiSchema, jsonSchema);
    } catch (err) {
      return reply.code(400).send(toValidationFailure(err));
    }

    const store = getStore();
    try {
      const meta = store.updateSchema(request.params.id, {
        title,
        description,
        jsonSchema,
        uiSchema,
      });
      notifyAutoCheckpoint(meta.id);
      return success(meta);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.code(404).send(failure(err.message, 'NOT_FOUND'));
      }
      throw err;
    }
  });

  // Delete schema
  app.delete<{ Params: { id: string } }>('/schemas/:id', async (request) => {
    const store = getStore();
    store.deleteSchema(request.params.id);
    notifyAutoCheckpoint(request.params.id);
    return success({ deleted: true });
  });

  // List submissions (bounded)
  app.get<{ Params: { id: string }; Querystring: Record<string, unknown> }>(
    '/schemas/:id/submissions',
    async (request, reply) => {
      const parsed = ListSubmissionsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .code(400)
          .send(validationFailure('Invalid query', 'INVALID_QUERY', parsed.error.issues));
      }
      const store = getStore();
      try {
        // Confirm the schema exists so callers get a clean 404 instead of [].
        store.getSchema(request.params.id);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.code(404).send(failure(err.message, 'NOT_FOUND'));
        }
        throw err;
      }
      return success(store.listSubmissions(request.params.id, parsed.data));
    },
  );

  // Submit form data
  app.post<{ Params: { id: string } }>('/schemas/:id/submissions', async (request, reply) => {
    const parsedBody = SubmissionBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply
        .code(400)
        .send(validationFailure('Invalid request body', 'INVALID_BODY', parsedBody.error.issues));
    }

    const store = getStore();
    let definition;
    try {
      definition = store.getSchema(request.params.id);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.code(404).send(failure(err.message, 'NOT_FOUND'));
      }
      throw err;
    }

    let result;
    try {
      result = validateData(definition.jsonSchema, parsedBody.data.data);
    } catch (err) {
      // The stored schema itself is invalid — surface that, don't append.
      return reply.code(400).send(toValidationFailure(err));
    }
    if (!result.valid) {
      return reply
        .code(400)
        .send(
          validationFailure(
            'Submission does not match schema',
            'INVALID_SUBMISSION',
            result.errors,
          ),
        );
    }

    const submission = store.appendSubmission(request.params.id, parsedBody.data.data);
    notifyAutoCheckpoint(request.params.id);
    return success(submission);
  });
}

function toValidationFailure(err: unknown): ValidationFailureBody {
  if (err instanceof InvalidJsonSchemaError) {
    return validationFailure(err.message, 'INVALID_JSON_SCHEMA', err.errors);
  }
  if (err instanceof InvalidUiSchemaError) {
    return validationFailure(err.message, 'INVALID_UI_SCHEMA');
  }
  const message = err instanceof Error ? err.message : String(err);
  return validationFailure(message, 'VALIDATION_ERROR');
}
