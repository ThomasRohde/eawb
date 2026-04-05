import type {
  IACPAdapter,
  ACPPromptResult,
  ACPCapabilities,
  ACPMode,
  ACPModel,
  ACPCommand,
  ACPConfigOption,
  ACPPermissionRequest,
  ACPSessionInfo,
} from '@ea-workbench/acp-core';
import { EMPTY_CAPABILITIES } from '@ea-workbench/acp-core';
import { CopilotACPAdapter } from '@ea-workbench/acp-copilot';
import { broadcast } from './ws.js';

let adapter: IACPAdapter | null = null;

// Pending permission requests: requestId → { sessionId, resolve }
const pendingPermissions = new Map<
  string,
  {
    sessionId: string;
    resolve: (result: { outcome: 'selected'; optionId: string } | { outcome: 'cancelled' }) => void;
  }
>();

export function getAdapter(): IACPAdapter {
  if (!adapter) {
    adapter = new CopilotACPAdapter();
    // Register the permission handler that bridges to the UI
    // Register the session event handler for updates outside of prompts
    adapter.setSessionEventHandler((sessionId, update) => {
      broadcastSessionUpdate(sessionId, update);
    });
    // Register the permission handler that bridges to the UI
    adapter.setPermissionHandler(async (request: ACPPermissionRequest) => {
      return new Promise((resolve) => {
        pendingPermissions.set(request.requestId, {
          sessionId: request.sessionId,
          resolve,
        });
        broadcast({
          type: 'ai:permission',
          sessionId: request.sessionId,
          requestId: request.requestId,
          title: request.toolCall.title ?? 'Permission requested',
          description: request.toolCall.kind ?? null,
          options: request.options.map((o) => ({ id: o.optionId, label: o.name })),
        });
      });
    });
  }
  return adapter;
}

/** Resolve a pending permission request from the UI. Requires matching sessionId. */
export function resolvePermission(
  requestId: string,
  sessionId: string,
  optionId: string | null,
): boolean {
  const entry = pendingPermissions.get(requestId);
  if (!entry) return false;
  // Verify the caller owns this session
  if (entry.sessionId !== sessionId) return false;
  pendingPermissions.delete(requestId);
  if (optionId) {
    entry.resolve({ outcome: 'selected', optionId });
  } else {
    entry.resolve({ outcome: 'cancelled' });
  }
  return true;
}

export async function initializeAI(): Promise<boolean> {
  const a = getAdapter();
  try {
    await a.initialize();
    return await a.isAvailable();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export async function getAICapabilities(): Promise<ACPCapabilities> {
  const a = getAdapter();
  try {
    await a.initialize();
  } catch {
    return { ...EMPTY_CAPABILITIES };
  }
  return a.getCapabilities();
}

// ---------------------------------------------------------------------------
// Eager session creation
// ---------------------------------------------------------------------------

export async function createAISession(workingDirectory?: string): Promise<string> {
  const a = getAdapter();
  if (!(await a.isAvailable())) {
    throw new Error('AI provider not available. Run "eawb doctor" to check Copilot CLI status.');
  }
  const session = await a.createSession({ workingDirectory });
  return session.id;
}

// ---------------------------------------------------------------------------
// Session history
// ---------------------------------------------------------------------------

export async function listAISessions(cwd?: string): Promise<{
  sessions: ACPSessionInfo[];
  nextCursor?: string | null;
}> {
  const a = getAdapter();
  try {
    await a.initialize();
  } catch {
    return { sessions: [] };
  }
  if (!a.getCapabilities().listSessions) return { sessions: [] };
  return a.listSessions({ cwd });
}

export async function loadAISession(
  acpSessionId: string,
  cwd: string,
): Promise<{
  localSessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}> {
  const a = getAdapter();
  if (!(await a.isAvailable())) {
    throw new Error('AI provider not available. Run "eawb doctor" to check Copilot CLI status.');
  }
  const { session, messages } = await a.loadSession(acpSessionId, cwd);
  return { localSessionId: session.id, messages };
}

// ---------------------------------------------------------------------------
// Conversational prompt (persistent session for chat)
// ---------------------------------------------------------------------------

/**
 * Prompt using a persistent ACP session. If `existingSessionId` is provided,
 * reuses that session; otherwise creates a new one and returns its ID.
 */
export async function conversationalPrompt(
  input: string,
  workingDirectory?: string,
  existingSessionId?: string | null,
  onChunk?: (text: string) => void,
): Promise<ACPPromptResult & { sessionId: string }> {
  const a = getAdapter();
  if (!(await a.isAvailable())) {
    throw new Error('AI provider not available. Run "eawb doctor" to check Copilot CLI status.');
  }

  let sessionId = existingSessionId ?? null;

  if (!sessionId) {
    const session = await a.createSession({ workingDirectory });
    sessionId = session.id;
  }

  const result = await a.prompt(sessionId, input, (update) => {
    broadcastSessionUpdate(sessionId!, update);
    // Only stream agent message chunks to the chat; skip thinking tokens
    if (onChunk && update.type === 'partial') {
      const content = (update.data as any)?.update?.content ?? (update.data as any)?.content;
      if (content?.type === 'text' && content.text) {
        onChunk(content.text);
      }
    }
  });

  return { ...result, sessionId };
}

/**
 * Simple prompt: create a session, send a prompt, return the response.
 * Used by BCM AI actions (ephemeral — session destroyed after).
 */
export async function simplePrompt(
  input: string,
  workingDirectory?: string,
  onChunk?: (text: string) => void,
): Promise<ACPPromptResult> {
  const a = getAdapter();
  if (!(await a.isAvailable())) {
    throw new Error('AI provider not available. Run "eawb doctor" to check Copilot CLI status.');
  }

  const session = await a.createSession({ workingDirectory });

  try {
    const result = await a.prompt(session.id, input, (update) => {
      broadcastSessionUpdate(session.id, update);
      if (onChunk && update.type === 'partial') {
        const content = (update.data as any)?.update?.content ?? (update.data as any)?.content;
        if (content?.type === 'text' && content.text) {
          onChunk(content.text);
        }
      }
    });
    return result;
  } finally {
    await a.destroySession(session.id);
  }
}

/**
 * Execute a structured BCM AI action: build a prompt from the action template and input,
 * send it to the AI, return structured output.
 */
export async function executeAIAction(
  promptText: string,
  workingDirectory?: string,
): Promise<ACPPromptResult> {
  const a = getAdapter();
  if (!(await a.isAvailable())) {
    throw new Error('AI provider not available. Run "eawb doctor" to check Copilot CLI status.');
  }

  const session = await a.createSession({ workingDirectory });
  const sessionId = session.id;

  broadcast({
    type: 'ai:progress',
    sessionId,
    data: { status: 'started' },
  });

  try {
    const result = await a.prompt(sessionId, promptText, (update) => {
      broadcastSessionUpdate(sessionId, update);
    });

    broadcast({
      type: 'ai:complete',
      sessionId,
      data: { status: 'complete', result: result.structured ?? result.content },
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI action failed';
    broadcast({
      type: 'ai:complete',
      sessionId,
      data: { status: 'error', error: message },
    });
    throw err;
  } finally {
    await a.destroySession(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Session management (delegated to adapter)
// ---------------------------------------------------------------------------

export async function cancelAIPrompt(sessionId: string): Promise<void> {
  if (!adapter) return;
  await adapter.cancelPrompt(sessionId);
}

export async function destroyAISession(sessionId: string): Promise<void> {
  if (!adapter) return;
  await adapter.destroySession(sessionId);
}

export async function getSessionModes(
  sessionId: string,
): Promise<{ modes: ACPMode[]; currentModeId: string | null }> {
  return getAdapter().getSessionModes(sessionId);
}

export async function setSessionMode(sessionId: string, modeId: string): Promise<void> {
  await getAdapter().setSessionMode(sessionId, modeId);
}

export async function getSessionModels(
  sessionId: string,
): Promise<{ models: ACPModel[]; currentModelId: string | null }> {
  return getAdapter().getSessionModels(sessionId);
}

export async function setSessionModel(sessionId: string, modelId: string): Promise<void> {
  await getAdapter().setSessionModel(sessionId, modelId);
}

export function getAvailableCommands(sessionId: string): ACPCommand[] {
  return getAdapter().getAvailableCommands(sessionId);
}

export function getSessionConfigOptions(sessionId: string): ACPConfigOption[] {
  return getAdapter().getSessionConfigOptions(sessionId);
}

export async function setSessionConfigOption(
  sessionId: string,
  optionId: string,
  value: unknown,
): Promise<void> {
  await getAdapter().setSessionConfigOption(sessionId, optionId, value);
}

export async function shutdownAI(): Promise<void> {
  if (adapter) {
    await adapter.shutdown();
    adapter = null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function broadcastSessionUpdate(sessionId: string, update: { type: string; data: unknown }): void {
  switch (update.type) {
    case 'partial':
      broadcast({ type: 'ai:progress', sessionId, data: update });
      break;
    case 'commands': {
      const cmds = update.data as any;
      broadcast({
        type: 'ai:commands',
        sessionId,
        commands: (cmds.availableCommands ?? []).map((c: any) => ({
          name: c.name,
          description: c.description,
          inputHint: c.input?.hint ?? null,
        })),
      });
      break;
    }
    case 'mode': {
      const mode = update.data as any;
      broadcast({ type: 'ai:mode', sessionId, currentModeId: mode.currentModeId });
      break;
    }
    case 'usage': {
      const usage = update.data as any;
      broadcast({
        type: 'ai:usage',
        sessionId,
        used: usage.used,
        size: usage.size,
        cost: usage.cost ?? null,
      });
      break;
    }
    case 'plan': {
      const plan = update.data as any;
      broadcast({
        type: 'ai:plan',
        sessionId,
        entries: plan.entries ?? [],
      });
      break;
    }
    case 'config': {
      broadcast({ type: 'ai:config', sessionId });
      break;
    }
    case 'tool_call':
    case 'tool_call_update': {
      const tc = update.data as any;
      broadcast({
        type: 'ai:tool_call',
        sessionId,
        toolCallId: tc.toolCallId,
        title: tc.title ?? '',
        status: tc.status ?? null,
        kind: tc.kind ?? null,
      });
      break;
    }
    default:
      broadcast({ type: 'ai:progress', sessionId, data: update });
      break;
  }
}
