import type { FastifyInstance } from 'fastify';
import { success, failure } from '@ea-workbench/shared-schema';
import {
  getAdapter,
  executeAIAction,
  initializeAI,
  getAICapabilities,
  createAISession,
  cancelAIPrompt,
  getSessionModes,
  setSessionMode,
  getSessionModels,
  setSessionModel,
  getAvailableCommands,
  getSessionConfigOptions,
  setSessionConfigOption,
  resolvePermission,
  listAISessions,
  loadAISession,
  getActiveSessionIds,
} from '../ai-orchestrator.js';
import { ModelStore } from '@ea-workbench/bcm-core';
import { DocumentStore } from '@ea-workbench/editor-core';
import {
  FormStore,
  NotFoundError as FormNotFoundError,
  compileSchema,
  validateUiSchema,
  collectControlScopes,
  InvalidJsonSchemaError,
  InvalidUiSchemaError,
} from '@ea-workbench/json-forms-core';
import type { ACPPromptResult } from '@ea-workbench/acp-core';
import {
  ACTIONS_REQUIRING_SCHEMA,
  buildJsonFormsPrompt,
  parseActionResult,
} from '@ea-workbench/json-forms-ai';
import { AIPreferencesSchema } from '@ea-workbench/shared-schema';
import {
  loadPreferences,
  savePreferences,
  updateCachedOptions,
  withPreferenceLock,
} from '../ai-preferences.js';

/**
 * Build a prompt for a BCM AI action based on the action ID, model data, and input.
 */
function buildBcmPrompt(
  actionId: string,
  model: { header: any; nodes: any[] },
  input: any,
): string {
  const capList = model.nodes
    .map((n: any) => {
      const depth = getDepth(model.nodes, n.id);
      const indent = '  '.repeat(depth);
      return `${indent}- ${n.name}${n.description ? `: ${n.description}` : ''}`;
    })
    .join('\n');

  switch (actionId) {
    case 'bcm.generate_first_level':
      return `You are an expert enterprise architect specializing in Business Capability Modeling.

Generate a first-level capability decomposition for the following domain.

Model: ${model.header.title}
Domain context: ${input.context || model.header.description || model.header.title}

Requirements:
- Follow MECE principles (Mutually Exclusive, Collectively Exhaustive)
- Use clear, business-oriented naming (noun phrases)
- Aim for 5-9 top-level capabilities
- Each capability should represent a distinct business function

Respond ONLY with a JSON array, no other text:
[
  { "name": "Capability Name", "description": "Brief scope description", "order": 0 },
  ...
]`;

    case 'bcm.expand_node': {
      const node = model.nodes.find((n: any) => n.id === input.nodeId);
      const nodeName = node?.name ?? 'Unknown';
      const siblings = model.nodes
        .filter((n: any) => n.parent === node?.parent && n.id !== node?.id)
        .map((n: any) => n.name);
      return `You are an expert enterprise architect. Decompose this business capability into sub-capabilities.

Capability: ${nodeName}
${node?.description ? `Description: ${node.description}` : ''}
${siblings.length > 0 ? `Siblings: ${siblings.join(', ')}` : ''}

Requirements:
- Follow MECE principles
- Aim for 4-7 sub-capabilities
- Each should be clearly scoped

Respond ONLY with a JSON array, no other text:
[
  { "name": "Sub-capability Name", "description": "Brief scope description", "order": 0 },
  ...
]`;
    }

    case 'bcm.review_mece':
      return `You are an expert reviewer of Business Capability Models. Analyze this capability structure for MECE quality.

Model: ${model.header.title}
Capabilities:
${capList}

Review for:
1. Mutual Exclusivity: overlapping capabilities?
2. Collective Exhaustiveness: gaps or missing capabilities?
3. Naming consistency at each level
4. Depth balance
5. Abstraction level consistency

Respond ONLY with JSON, no other text:
{
  "overallScore": "good|fair|poor",
  "findings": [
    { "type": "overlap|gap|naming|balance|abstraction", "severity": "high|medium|low", "message": "..." }
  ],
  "suggestions": ["..."]
}`;

    case 'bcm.normalize_names':
      return `Review these capability names for naming consistency and suggest improvements.

Capabilities:
${capList}

Rules: use consistent noun phrases, avoid abbreviations, be self-explanatory.

Respond ONLY with a JSON array of suggested renames (empty if all names are good):
[
  { "nodeId": "...", "currentName": "...", "suggestedName": "...", "reason": "..." }
]`;

    case 'bcm.suggest_merges':
      return `Analyze these business capabilities for potential merges or deduplication.

Capabilities:
${capList}

Respond ONLY with JSON:
{ "suggestions": [{ "nodeIds": ["..."], "reason": "...", "suggestedName": "...", "confidence": "high|medium|low" }] }`;

    case 'bcm.enrich_descriptions': {
      const noDesc = model.nodes.filter((n: any) => !n.description || n.description.trim() === '');
      const needsList = noDesc.map((n: any) => `- ${n.name} (id: ${n.id})`).join('\n');
      return `Generate concise descriptions for these business capabilities. Each description should define scope and boundaries in 1-2 sentences.

Model: ${model.header.title}
Capabilities needing descriptions:
${needsList}

Respond ONLY with a JSON array:
[{ "nodeId": "...", "description": "..." }]`;
    }

    case 'bcm.fix_mece_finding': {
      const finding = input.finding ?? {};
      return `You are an expert enterprise architect. Fix this specific MECE issue in the Business Capability Model.

Model: ${model.header.title}
Current capabilities:
${capList}

Finding to fix:
- Type: ${finding.type ?? 'unknown'}
- Severity: ${finding.severity ?? 'unknown'}
- Issue: ${finding.message ?? 'No description'}
${Array.isArray(finding.nodeIds) && finding.nodeIds.length > 0 ? `- Affected nodes: ${finding.nodeIds.join(', ')}` : ''}

Generate the minimal set of operations to fix this issue. Supported operations:
- { "op": "add", "name": "...", "description": "...", "parent": "parentNodeId", "order": 0 } — add a new capability
- { "op": "update", "nodeId": "...", "name": "...", "description": "..." } — rename or update an existing capability

Respond ONLY with a JSON array of operations:
[{ "op": "add"|"update", ... }]

Return an empty array if no automated fix is possible.`;
    }

    case 'bcm.generate_review_brief':
      return `Generate a review brief for this Business Capability Model.

Model: ${model.header.title}
${model.header.description ? `Description: ${model.header.description}` : ''}
Capabilities:
${capList}

Include: executive summary, key capabilities overview, coverage assessment, open questions, recommendations.
Respond in markdown.`;

    default:
      return `Action: ${actionId}\nModel: ${model.header.title}\nInput: ${JSON.stringify(input)}`;
  }
}

/**
 * Build a prompt for a Markdown Editor AI action.
 */
function buildEditorPrompt(actionId: string, doc: { title: string; content: string }): string {
  switch (actionId) {
    case 'md.improve_clarity':
      return `You are an expert editor. Rewrite the following markdown document for improved clarity, conciseness, and readability. Preserve the meaning and structure. Keep it in markdown format.

Title: ${doc.title}

Document:
${doc.content}

Respond ONLY with the improved markdown document, no other text.`;

    case 'md.summarize':
      return `You are an expert writer. Generate a concise executive summary of the following markdown document. The summary should capture the key points and conclusions.

Title: ${doc.title}

Document:
${doc.content}

Respond ONLY with the summary in markdown format, no other text.`;

    case 'md.expand':
      return `You are an expert writer. Expand the following markdown document by elaborating on each point, adding detail, examples, and fuller prose. Maintain the existing structure and headings.

Title: ${doc.title}

Document:
${doc.content}

Respond ONLY with the expanded markdown document, no other text.`;

    case 'md.fix_grammar':
      return `You are an expert proofreader. Fix all grammar, spelling, punctuation, and style issues in the following markdown document. Preserve the meaning and structure exactly. Keep it in markdown format.

Title: ${doc.title}

Document:
${doc.content}

Respond ONLY with the corrected markdown document, no other text.`;

    default:
      return `Action: ${actionId}\nDocument: ${doc.title}\nContent: ${doc.content}`;
  }
}

function getDepth(nodes: any[], nodeId: string): number {
  let depth = 0;
  let current = nodes.find((n: any) => n.id === nodeId);
  while (current?.parent) {
    depth++;
    current = nodes.find((n: any) => n.id === current.parent);
  }
  return depth;
}

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ai/status', async () => {
    const available = await initializeAI();
    return success({ available });
  });

  app.post<{
    Body: { actionId: string; input: any };
  }>('/ai/execute', async (request, reply) => {
    const { actionId, input } = request.body;
    const workspacePath = (app as any).workspacePath as string;

    // ---- json-forms.* — handled inline (load active schema, build prompt,
    // run AI, parse + validate the structured result, return).
    if (actionId.startsWith('json-forms.')) {
      // 1. Validate selection requirement.
      const requiresSchema = ACTIONS_REQUIRING_SCHEMA.has(actionId);
      const schemaId =
        typeof input?.schemaId === 'string' && input.schemaId.length > 0
          ? (input.schemaId as string)
          : null;
      if (requiresSchema && !schemaId) {
        return reply
          .code(400)
          .send(
            failure('Select a form schema first to run this action.', 'JSON_FORMS_NO_SELECTION'),
          );
      }

      // 2. Load active schema if required.
      let activeSchema: { title: string; jsonSchema: any; uiSchema: any } | undefined;
      if (requiresSchema && schemaId) {
        try {
          const store = new FormStore(workspacePath);
          const def = store.getSchema(schemaId);
          activeSchema = {
            title: def.meta.title,
            jsonSchema: def.jsonSchema,
            uiSchema: def.uiSchema,
          };
        } catch (err) {
          if (err instanceof FormNotFoundError) {
            return reply.code(404).send(failure(err.message, 'NOT_FOUND'));
          }
          const message = err instanceof Error ? err.message : 'Failed to load schema';
          return reply.code(500).send(failure(message, 'ARTIFACT_LOAD_FAILED'));
        }
      }

      // 3. Build prompt.
      let promptText: string;
      try {
        promptText = buildJsonFormsPrompt({
          actionId,
          activeSchema,
          userInput: typeof input?.context === 'string' ? (input.context as string) : undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to build prompt';
        return reply.code(400).send(failure(message, 'PROMPT_BUILD_FAILED'));
      }

      // 4. Execute the AI action.
      let aiResult: ACPPromptResult;
      try {
        aiResult = await executeAIAction(promptText, workspacePath);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI action failed';
        return reply.code(500).send(failure(message, 'AI_EXECUTION_FAILED'));
      }

      // 5. Server-side parse the structured response with the action's Zod schema.
      const parsed = parseActionResult(actionId, aiResult.structured);
      if (!parsed.ok) {
        return reply.code(422).send({
          ok: false,
          error: parsed.error,
          code: 'AI_PARSE_FAILED',
          details: { issues: parsed.issues, rawContent: aiResult.content },
        });
      }

      // 6. For any output containing a JSON Schema or UI Schema, validate it.
      const data = parsed.data as Record<string, unknown>;
      const proposedJsonSchema = (data.jsonSchema ?? null) as Record<string, unknown> | null;
      const proposedUiSchema = (data.uiSchema ?? null) as Record<string, unknown> | null;
      const validationErrors: { type: string; message: string }[] = [];
      if (proposedJsonSchema) {
        try {
          compileSchema(proposedJsonSchema);
        } catch (err) {
          validationErrors.push({
            type: 'jsonSchema',
            message:
              err instanceof InvalidJsonSchemaError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : String(err),
          });
        }
      }
      if (proposedUiSchema) {
        // For improve_layout the jsonSchema is unchanged on the wire — pair the
        // proposed uiSchema with the *active* jsonSchema so scope resolution
        // catches dropped or mistyped controls.
        const schemaForUiCheck =
          proposedJsonSchema ??
          (actionId === 'json-forms.improve_layout' ? activeSchema?.jsonSchema : undefined);
        try {
          validateUiSchema(proposedUiSchema, schemaForUiCheck);
        } catch (err) {
          validationErrors.push({
            type: 'uiSchema',
            message:
              err instanceof InvalidUiSchemaError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : String(err),
          });
        }
      }

      // 6b. For improve_layout (and refine, which can also reorganise layouts),
      // verify the proposed uiSchema still references every Control scope that
      // existed in the active uiSchema. Refactoring layout must NOT silently
      // drop fields.
      if (
        validationErrors.length === 0 &&
        proposedUiSchema &&
        activeSchema?.uiSchema &&
        (actionId === 'json-forms.improve_layout' || actionId === 'json-forms.refine_schema')
      ) {
        const before = new Set(collectControlScopes(activeSchema.uiSchema));
        const after = new Set(collectControlScopes(proposedUiSchema));

        // For improve_layout the property set is unchanged, so a dropped scope
        // is always an error. For refine_schema the AI may legitimately remove
        // a field — only flag scopes whose underlying property STILL exists in
        // the (proposed or unchanged) jsonSchema.
        const referenceJsonSchema = proposedJsonSchema ?? activeSchema?.jsonSchema;
        const referenceProps =
          referenceJsonSchema && typeof referenceJsonSchema === 'object'
            ? ((referenceJsonSchema as { properties?: Record<string, unknown> }).properties ?? {})
            : {};

        const dropped: string[] = [];
        for (const scope of before) {
          if (after.has(scope)) continue;
          if (actionId === 'json-forms.improve_layout') {
            dropped.push(scope);
          } else {
            // refine: only complain if the property is still present in the
            // referenced jsonSchema (i.e. it was kept but its control was lost).
            const segments = scope.slice(2).split('/').filter(Boolean);
            const propName = segments[segments.length - 1];
            if (propName && propName in referenceProps) {
              dropped.push(scope);
            }
          }
        }
        if (dropped.length > 0) {
          validationErrors.push({
            type: 'uiSchema',
            message: `Proposed UI schema is missing controls for: ${dropped.join(', ')}`,
          });
        }
      }

      if (validationErrors.length > 0) {
        return reply.code(422).send({
          ok: false,
          error: 'AI output failed schema validation',
          code: 'AI_INVALID_SCHEMA',
          details: { errors: validationErrors, proposed: parsed.data },
        });
      }

      // 7. Success — return the parsed structured payload alongside content for debugging.
      return success({ content: aiResult.content, structured: parsed.data });
    }

    // ---- bcm.* / md.* / fallback (existing dispatch).
    let promptText: string;
    try {
      if (actionId.startsWith('bcm.') && input.modelId) {
        const store = new ModelStore(workspacePath);
        const model = store.loadModel(input.modelId);
        promptText = buildBcmPrompt(actionId, model, input);
      } else if (actionId.startsWith('md.') && input.documentId) {
        const docStore = new DocumentStore(workspacePath);
        const doc = docStore.getDocument(input.documentId);
        promptText = buildEditorPrompt(actionId, {
          title: doc.meta.title,
          content: doc.content,
        });
      } else {
        promptText = JSON.stringify({ actionId, input });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load artifact';
      return reply.code(400).send(failure(message, 'ARTIFACT_LOAD_FAILED'));
    }

    try {
      const result = await executeAIAction(promptText, workspacePath);
      return success(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI action failed';
      return reply.code(500).send(failure(message, 'AI_EXECUTION_FAILED'));
    }
  });

  // --- ACP capabilities ---

  app.get('/ai/capabilities', async () => {
    return success(await getAICapabilities());
  });

  // --- Eager session creation ---

  app.post('/ai/sessions', async (_request, reply) => {
    const workspacePath = (app as any).workspacePath as string;
    try {
      const sessionId = await createAISession(workspacePath);
      return success({ sessionId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      return reply.code(500).send(failure(message, 'SESSION_CREATE_FAILED'));
    }
  });

  // --- Session history ---

  app.get<{ Querystring: { cwd?: string } }>('/ai/sessions/history', async (request) => {
    const cwd = request.query.cwd || ((app as any).workspacePath as string);
    const result = await listAISessions(cwd);
    return success(result);
  });

  app.post<{ Body: { sessionId: string; cwd?: string } }>(
    '/ai/sessions/load',
    async (request, reply) => {
      const cwd = request.body.cwd || ((app as any).workspacePath as string);
      try {
        const result = await loadAISession(request.body.sessionId, cwd);
        return success(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load session';
        return reply.code(500).send(failure(message, 'SESSION_LOAD_FAILED'));
      }
    },
  );

  // --- Session cancel ---

  app.post<{ Params: { id: string } }>('/ai/sessions/:id/cancel', async (request) => {
    await cancelAIPrompt(request.params.id);
    return success({ cancelled: true });
  });

  // --- Modes ---

  app.get<{ Params: { id: string } }>('/ai/sessions/:id/modes', async (request) => {
    const result = await getSessionModes(request.params.id);
    return success(result);
  });

  app.put<{ Params: { id: string }; Body: { modeId: string } }>(
    '/ai/sessions/:id/mode',
    async (request) => {
      await setSessionMode(request.params.id, request.body.modeId);
      return success({ modeId: request.body.modeId });
    },
  );

  // --- Models ---

  app.get<{ Params: { id: string } }>('/ai/sessions/:id/models', async (request) => {
    const result = await getSessionModels(request.params.id);
    return success(result);
  });

  app.put<{ Params: { id: string }; Body: { modelId: string } }>(
    '/ai/sessions/:id/model',
    async (request) => {
      await setSessionModel(request.params.id, request.body.modelId);
      return success({ modelId: request.body.modelId });
    },
  );

  // --- Slash commands ---

  app.get<{ Params: { id: string } }>('/ai/sessions/:id/commands', async (request) => {
    const commands = getAvailableCommands(request.params.id);
    return success(commands);
  });

  // --- Config options ---

  app.get<{ Params: { id: string } }>('/ai/sessions/:id/config', async (request) => {
    const options = getSessionConfigOptions(request.params.id);
    return success(options);
  });

  app.put<{ Params: { id: string }; Body: { optionId: string; value: unknown } }>(
    '/ai/sessions/:id/config',
    async (request) => {
      await setSessionConfigOption(request.params.id, request.body.optionId, request.body.value);
      return success({ optionId: request.body.optionId });
    },
  );

  // --- AI Preferences ---

  app.get('/ai/preferences', async () => {
    const workspacePath = (app as any).workspacePath as string;
    return success(loadPreferences(workspacePath));
  });

  app.put<{ Body: Record<string, unknown> }>('/ai/preferences', async (request) => {
    const workspacePath = (app as any).workspacePath as string;
    const validated = await withPreferenceLock(workspacePath, () => {
      const current = loadPreferences(workspacePath);
      // Deep-merge configOverrides to prevent concurrent edits from erasing each other
      const body = request.body;
      let mergedOverrides = current.configOverrides;
      if (body.configOverrides && typeof body.configOverrides === 'object') {
        mergedOverrides = { ...current.configOverrides };
        for (const [k, v] of Object.entries(body.configOverrides as Record<string, unknown>)) {
          if (v === null) {
            delete mergedOverrides[k];
          } else {
            mergedOverrides[k] = v;
          }
        }
      }
      const merged = { ...current, ...body, configOverrides: mergedOverrides };
      const result = AIPreferencesSchema.parse(merged);
      savePreferences(workspacePath, result);
      return result;
    });
    return success(validated);
  });

  app.post('/ai/preferences/refresh', async (_request, reply) => {
    const workspacePath = (app as any).workspacePath as string;
    try {
      // Reuse an existing live session to avoid creating orphan provider sessions
      const activeIds = getActiveSessionIds();
      const sessionId = activeIds.length > 0 ? activeIds[0] : null;
      if (!sessionId) {
        return reply
          .code(409)
          .send(
            failure(
              'No active AI session. Start a conversation first, then refresh.',
              'NO_ACTIVE_SESSION',
            ),
          );
      }
      const prefs = await updateCachedOptions(workspacePath, sessionId);
      return success(prefs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh options';
      return reply.code(500).send(failure(message, 'REFRESH_FAILED'));
    }
  });

  // --- Permissions ---

  app.post<{
    Params: { requestId: string };
    Body: { sessionId: string; optionId?: string | null };
  }>('/ai/permissions/:requestId/resolve', async (request, reply) => {
    if (!request.body.sessionId) {
      return reply.code(400).send(failure('sessionId is required', 'MISSING_SESSION'));
    }
    const resolved = resolvePermission(
      request.params.requestId,
      request.body.sessionId,
      request.body.optionId ?? null,
    );
    if (!resolved) {
      return reply
        .code(404)
        .send(
          failure(
            'Permission request not found, already resolved, or session mismatch',
            'NOT_FOUND',
          ),
        );
    }
    return success({ resolved: true });
  });
}
