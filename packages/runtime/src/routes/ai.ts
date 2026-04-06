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
} from '../ai-orchestrator.js';
import { ModelStore } from '@ea-workbench/bcm-core';
import { DocumentStore } from '@ea-workbench/editor-core';

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

    // Build prompt based on action prefix
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
