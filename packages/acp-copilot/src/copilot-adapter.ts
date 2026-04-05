import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { ClientSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import type {
  IACPAdapter,
  ACPPromptResult,
  ACPProgressCallback,
  ACPSession,
  SessionOptions,
  ACPCapabilities,
  ACPMode,
  ACPModel,
  ACPCommand,
  ACPConfigOption,
  ACPPermissionHandler,
  ACPSessionEventCallback,
  ACPSessionInfo,
  ACPReplayedMessage,
} from '@ea-workbench/acp-core';
import { EMPTY_CAPABILITIES } from '@ea-workbench/acp-core';
import { generateId, timestamp } from '@ea-workbench/shared-schema';
import { discoverCopilot } from './discovery.js';

/** Internal record linking our session to the ACP session and its state. */
interface SessionRecord {
  session: ACPSession;
  acpSessionId: string | null;
  /** Slash commands advertised by the agent for this session. */
  commands: ACPCommand[];
  /** Current mode ID (set by current_mode_update). */
  currentModeId: string | null;
  /** Available modes (set from newSession response). */
  modes: ACPMode[];
  /** Current model ID. */
  currentModelId: string | null;
  /** Available models (set from newSession response). */
  models: ACPModel[];
  /** Config options. */
  configOptions: ACPConfigOption[];
  /** Per-session prompt state — only set during an active prompt. */
  promptState: { callback: ACPProgressCallback | null; chunks: string[] } | null;
  /** Replay buffer — only set during loadSession to capture replayed conversation. */
  replayBuffer: {
    messages: ACPReplayedMessage[];
    currentRole: 'user' | 'assistant' | null;
    currentChunks: string[];
  } | null;
}

export class CopilotACPAdapter implements IACPAdapter {
  private sessions = new Map<string, SessionRecord>();
  private connection: ClientSideConnection | null = null;
  private childProcess: ChildProcess | null = null;
  private capabilities: ACPCapabilities = { ...EMPTY_CAPABILITIES };

  // Map ACP session ID → our session ID for routing session updates
  private acpToLocal = new Map<string, string>();
  // Permission handler registered by the runtime
  private permissionHandler: ACPPermissionHandler | null = null;
  // Session event handler for updates outside of prompts
  private sessionEventHandler: ACPSessionEventCallback | null = null;
  // Workspace root for file system operations
  private workspaceRoot: string = process.cwd();
  // Active terminal processes
  private terminals = new Map<
    string,
    {
      process: ChildProcess;
      output: string;
      truncated: boolean;
      exited: boolean;
      exitCode: number | null;
      signal: string | null;
      waiters: Array<(v: any) => void>;
    }
  >();
  private terminalCounter = 0;

  async initialize(): Promise<void> {
    if (this.connection) return;

    const discovery = discoverCopilot();
    if (!discovery.available || !discovery.path) {
      throw new Error('Copilot CLI not found. Run "eawb doctor" to check.');
    }

    const args =
      discovery.method === 'npx'
        ? ['-y', '@github/copilot-language-server', '--acp', '--stdio']
        : ['--acp', '--stdio'];
    const command = discovery.method === 'npx' ? 'npx' : discovery.path;

    this.childProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    this.childProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.error('[copilot]', msg);
    });

    this.childProcess.on('exit', (code) => {
      console.log(`[copilot] Process exited with code ${code}`);
      this.connection = null;
      this.childProcess = null;
    });

    const input = Writable.toWeb(this.childProcess.stdin!) as WritableStream<Uint8Array>;
    const output = Readable.toWeb(this.childProcess.stdout!) as ReadableStream<Uint8Array>;
    const stream = ndJsonStream(input, output);

    const self = this;

    const toClient = (_connection: ClientSideConnection) => ({
      sessionUpdate: async (params: any) => {
        self.handleSessionUpdate(params);
      },
      requestPermission: async (params: any) => {
        return self.handlePermissionRequest(params);
      },
      // File system operations
      readTextFile: async (params: any) => {
        return self.handleReadTextFile(params);
      },
      writeTextFile: async (params: any) => {
        return self.handleWriteTextFile(params);
      },
      // Terminal operations
      createTerminal: async (params: any) => {
        return self.handleCreateTerminal(params);
      },
      terminalOutput: async (params: any) => {
        return self.handleTerminalOutput(params);
      },
      waitForTerminalExit: async (params: any) => {
        return self.handleWaitForTerminalExit(params);
      },
      killTerminal: async (params: any) => {
        return self.handleKillTerminal(params);
      },
      releaseTerminal: async (params: any) => {
        return self.handleReleaseTerminal(params);
      },
    });

    this.connection = new ClientSideConnection(toClient as any, stream);

    const initResult = await this.connection.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: true,
      },
    });

    // Derive capability flags from agent response
    const agent = initResult.agentCapabilities;
    if (agent) {
      this.capabilities = {
        loadSession: agent.loadSession === true,
        listSessions: !!agent.sessionCapabilities?.list,
        modes: true, // Modes are returned in newSession if supported
        models: true, // Models are returned in newSession if supported
        configOptions: true, // Config options returned in newSession if supported
        cancel: true, // cancel is always available per spec
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return discoverCopilot().available;
  }

  getCapabilities(): ACPCapabilities {
    return { ...this.capabilities };
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  async createSession(opts: SessionOptions): Promise<ACPSession> {
    if (!this.connection) {
      await this.initialize();
    }
    // Track workspace root for file system scoping
    this.workspaceRoot = opts.workingDirectory ?? process.cwd();

    const session: ACPSession = {
      id: generateId(),
      createdAt: timestamp(),
      status: 'active',
    };

    const record: SessionRecord = {
      session,
      acpSessionId: null,
      commands: [],
      currentModeId: null,
      modes: [],
      currentModelId: null,
      models: [],
      configOptions: [],
      promptState: null,
      replayBuffer: null,
    };

    try {
      const result = await this.connection!.newSession({
        cwd: opts.workingDirectory ?? process.cwd(),
        mcpServers: [],
      });
      record.acpSessionId = result.sessionId;
      this.acpToLocal.set(result.sessionId, session.id);

      // Capture initial state from newSession response
      if (result.modes) {
        record.modes = result.modes.availableModes.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
        }));
        record.currentModeId = result.modes.currentModeId;
      }
      if (result.models) {
        record.models = result.models.availableModels.map((m: any) => ({
          id: m.modelId,
          name: m.name,
          description: m.description,
        }));
        record.currentModelId = result.models.currentModelId;
      }
      if (result.configOptions) {
        record.configOptions = result.configOptions.map(mapConfigOption);
      }
    } catch (err) {
      console.error('[copilot] Failed to create ACP session:', err);
    }

    this.sessions.set(session.id, record);
    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    const record = this.sessions.get(sessionId);
    if (record?.acpSessionId) {
      // Only remove the mapping if it still points to this session
      if (this.acpToLocal.get(record.acpSessionId) === sessionId) {
        this.acpToLocal.delete(record.acpSessionId);
      }
    }
    this.sessions.delete(sessionId);
  }

  // ---------------------------------------------------------------------------
  // Session history
  // ---------------------------------------------------------------------------

  async listSessions(opts: { cwd?: string; cursor?: string | null }): Promise<{
    sessions: ACPSessionInfo[];
    nextCursor?: string | null;
  }> {
    if (!this.connection) await this.initialize();
    const result = await this.connection!.listSessions({
      cwd: opts.cwd ?? null,
      cursor: opts.cursor ?? null,
    });
    return {
      sessions: result.sessions.map((s: any) => ({
        sessionId: s.sessionId,
        title: s.title ?? null,
        updatedAt: s.updatedAt ?? null,
        cwd: s.cwd,
      })),
      nextCursor: result.nextCursor ?? null,
    };
  }

  async loadSession(
    acpSessionId: string,
    cwd: string,
  ): Promise<{ session: ACPSession; messages: ACPReplayedMessage[] }> {
    if (!this.connection) await this.initialize();

    // Idempotency: if this ACP session is already loaded, return it
    const existingLocalId = this.acpToLocal.get(acpSessionId);
    if (existingLocalId) {
      const existing = this.sessions.get(existingLocalId);
      if (existing) {
        return { session: existing.session, messages: [] };
      }
    }

    this.workspaceRoot = cwd;

    const session: ACPSession = {
      id: generateId(),
      createdAt: timestamp(),
      status: 'active',
    };

    const record: SessionRecord = {
      session,
      acpSessionId,
      commands: [],
      currentModeId: null,
      modes: [],
      currentModelId: null,
      models: [],
      configOptions: [],
      promptState: null,
      replayBuffer: {
        messages: [],
        currentRole: null,
        currentChunks: [],
      },
    };

    // Register mapping BEFORE the call so sessionUpdate notifications route correctly
    this.sessions.set(session.id, record);
    this.acpToLocal.set(acpSessionId, session.id);

    try {
      const result = await this.connection!.loadSession({
        sessionId: acpSessionId,
        cwd,
        mcpServers: [],
      });

      // Flush any remaining replay content
      this.flushReplayMessage(record);
      const messages = record.replayBuffer?.messages ?? [];
      record.replayBuffer = null;

      // Apply state from response (same as createSession)
      if (result.modes) {
        record.modes = result.modes.availableModes.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
        }));
        record.currentModeId = result.modes.currentModeId;
      }
      if (result.models) {
        record.models = result.models.availableModels.map((m: any) => ({
          id: m.modelId,
          name: m.name,
          description: m.description,
        }));
        record.currentModelId = result.models.currentModelId;
      }
      if (result.configOptions) {
        record.configOptions = result.configOptions.map(mapConfigOption);
      }

      return { session, messages };
    } catch (err) {
      // Rollback on failure — remove the records we optimistically added
      this.sessions.delete(session.id);
      if (this.acpToLocal.get(acpSessionId) === session.id) {
        this.acpToLocal.delete(acpSessionId);
      }
      throw err;
    }
  }

  /** Flush accumulated replay chunks into a complete message. */
  private flushReplayMessage(record: SessionRecord): void {
    const rb = record.replayBuffer;
    if (!rb || !rb.currentRole || rb.currentChunks.length === 0) return;
    rb.messages.push({ role: rb.currentRole, content: rb.currentChunks.join('') });
    rb.currentChunks = [];
  }

  // ---------------------------------------------------------------------------
  // Prompting
  // ---------------------------------------------------------------------------

  async prompt(
    sessionId: string,
    input: string,
    onProgress?: ACPProgressCallback,
  ): Promise<ACPPromptResult> {
    const record = this.sessions.get(sessionId);
    if (!record) throw new Error(`Session ${sessionId} not found`);
    if (!this.connection) throw new Error('Adapter not initialized');
    if (!record.acpSessionId) throw new Error('ACP session not established');

    record.promptState = { callback: onProgress ?? null, chunks: [] };

    onProgress?.({ type: 'progress', data: { message: 'Sending to Copilot...' } });

    const promptResult = await this.connection.prompt({
      sessionId: record.acpSessionId,
      prompt: [{ type: 'text', text: input }],
    });

    const content = record.promptState.chunks.join('');
    record.promptState = null;

    // Try to extract structured JSON from the response
    let structured: unknown = undefined;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (jsonMatch) {
        structured = JSON.parse(jsonMatch[1].trim());
      } else {
        structured = JSON.parse(content.trim());
      }
    } catch {
      // Not JSON — that's fine for freeform text responses
    }

    return {
      content,
      structured,
      stopReason: promptResult.stopReason,
      usage: promptResult.usage ?? undefined,
    };
  }

  async cancelPrompt(sessionId: string): Promise<void> {
    const record = this.sessions.get(sessionId);
    if (!record?.acpSessionId || !this.connection) return;
    await this.connection.cancel({ sessionId: record.acpSessionId });
  }

  // ---------------------------------------------------------------------------
  // Modes
  // ---------------------------------------------------------------------------

  async getSessionModes(
    sessionId: string,
  ): Promise<{ modes: ACPMode[]; currentModeId: string | null }> {
    const record = this.sessions.get(sessionId);
    if (!record) throw new Error(`Session ${sessionId} not found`);
    return { modes: record.modes, currentModeId: record.currentModeId };
  }

  async setSessionMode(sessionId: string, modeId: string): Promise<void> {
    const record = this.sessions.get(sessionId);
    if (!record?.acpSessionId || !this.connection) {
      throw new Error(`Session ${sessionId} not found or not connected`);
    }
    await this.connection.setSessionMode({
      sessionId: record.acpSessionId,
      modeId,
    });
    record.currentModeId = modeId;
  }

  // ---------------------------------------------------------------------------
  // Models
  // ---------------------------------------------------------------------------

  async getSessionModels(
    sessionId: string,
  ): Promise<{ models: ACPModel[]; currentModelId: string | null }> {
    const record = this.sessions.get(sessionId);
    if (!record) throw new Error(`Session ${sessionId} not found`);
    return { models: record.models, currentModelId: record.currentModelId };
  }

  async setSessionModel(sessionId: string, modelId: string): Promise<void> {
    const record = this.sessions.get(sessionId);
    if (!record?.acpSessionId || !this.connection) {
      throw new Error(`Session ${sessionId} not found or not connected`);
    }
    await this.connection.unstable_setSessionModel({
      sessionId: record.acpSessionId,
      modelId,
    });
    record.currentModelId = modelId;
  }

  // ---------------------------------------------------------------------------
  // Slash commands
  // ---------------------------------------------------------------------------

  getAvailableCommands(sessionId: string): ACPCommand[] {
    const record = this.sessions.get(sessionId);
    return record?.commands ?? [];
  }

  // ---------------------------------------------------------------------------
  // Config options
  // ---------------------------------------------------------------------------

  getSessionConfigOptions(sessionId: string): ACPConfigOption[] {
    const record = this.sessions.get(sessionId);
    return record?.configOptions ?? [];
  }

  async setSessionConfigOption(sessionId: string, optionId: string, value: unknown): Promise<void> {
    const record = this.sessions.get(sessionId);
    if (!record?.acpSessionId || !this.connection) {
      throw new Error(`Session ${sessionId} not found or not connected`);
    }
    const isBoolean = typeof value === 'boolean';
    const payload: Record<string, unknown> = {
      sessionId: record.acpSessionId,
      configId: optionId,
    };
    if (isBoolean) {
      payload.type = 'boolean';
      payload.value = value;
    } else {
      payload.value = value;
    }
    const result = await this.connection.setSessionConfigOption(payload as any);
    // Update local cache with returned options
    if (result.configOptions) {
      record.configOptions = result.configOptions.map(mapConfigOption);
    }
  }

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------

  setPermissionHandler(handler: ACPPermissionHandler | null): void {
    this.permissionHandler = handler;
  }

  setSessionEventHandler(handler: ACPSessionEventCallback | null): void {
    this.sessionEventHandler = handler;
  }

  private async handlePermissionRequest(params: any): Promise<any> {
    if (!this.permissionHandler) {
      // Auto-approve: pick the first allow option, or fall back to approved
      const allowOption = params.options?.find(
        (o: any) => o.kind === 'allow_once' || o.kind === 'allow_always',
      );
      if (allowOption) {
        return { outcome: { outcome: 'selected', optionId: allowOption.optionId } };
      }
      return { approved: true };
    }

    const requestId = generateId();
    const sessionId = params.sessionId as string;
    const localSessionId = this.acpToLocal.get(sessionId) ?? sessionId;

    try {
      const result = await this.permissionHandler({
        requestId,
        sessionId: localSessionId,
        toolCall: {
          toolCallId: params.toolCall?.toolCallId ?? '',
          title: params.toolCall?.title ?? undefined,
          kind: params.toolCall?.kind ?? undefined,
        },
        options: (params.options ?? []).map((o: any) => ({
          optionId: o.optionId,
          name: o.name,
          kind: o.kind,
        })),
      });
      return { outcome: result };
    } catch {
      return { outcome: { outcome: 'cancelled' } };
    }
  }

  // ---------------------------------------------------------------------------
  // File system operations
  // ---------------------------------------------------------------------------

  private resolveSafePath(filePath: string): string {
    // Accept both absolute and relative paths — ACP uses absolute paths
    const resolved = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(this.workspaceRoot, filePath);
    // Security: use path.relative for separator-aware containment check.
    // A relative path that starts with '..' escapes the workspace.
    const rel = path.relative(this.workspaceRoot, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Path "${filePath}" resolves outside the workspace`);
    }
    return resolved;
  }

  private async handleReadTextFile(params: any): Promise<any> {
    const filePath = this.resolveSafePath(params.path);
    const content = await readFile(filePath, 'utf-8');
    const hasLine = params.line != null;
    const hasLimit = params.limit != null;
    if (hasLine || hasLimit) {
      const lines = content.split('\n');
      const start = hasLine ? Math.max(0, (params.line as number) - 1) : 0;
      const end = hasLimit ? start + (params.limit as number) : undefined;
      const slice = lines.slice(start, end);
      return { content: slice.join('\n') };
    }
    return { content };
  }

  private async handleWriteTextFile(params: any): Promise<any> {
    const filePath = this.resolveSafePath(params.path);
    await writeFile(filePath, params.content, 'utf-8');
    return {};
  }

  // ---------------------------------------------------------------------------
  // Terminal operations
  // ---------------------------------------------------------------------------

  private async handleCreateTerminal(params: any): Promise<any> {
    const terminalId = `term-${++this.terminalCounter}`;
    // Validate cwd is within workspace
    let cwd = this.workspaceRoot;
    if (params.cwd) {
      const resolvedCwd = path.resolve(this.workspaceRoot, params.cwd);
      const rel = path.relative(this.workspaceRoot, resolvedCwd);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Terminal cwd "${params.cwd}" resolves outside the workspace`);
      }
      cwd = resolvedCwd;
    }
    const env = { ...process.env };
    if (params.env) {
      for (const v of params.env) {
        env[v.name] = v.value;
      }
    }

    const child = spawn(params.command, params.args ?? [], {
      cwd,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const record = {
      process: child,
      output: '',
      truncated: false,
      exited: false,
      exitCode: null as number | null,
      signal: null as string | null,
      waiters: [] as Array<(v: any) => void>,
    };

    const maxBytes = params.outputByteLimit ?? 1_000_000;

    const collectOutput = (data: Buffer) => {
      record.output += data.toString();
      // Truncate from beginning if over limit
      if (record.output.length > maxBytes) {
        record.output = record.output.slice(-maxBytes);
        record.truncated = true;
      }
    };

    child.stdout?.on('data', collectOutput);
    child.stderr?.on('data', collectOutput);

    child.on('exit', (code, signal) => {
      record.exited = true;
      record.exitCode = code;
      record.signal = signal;
      // Resolve all waiters
      for (const resolve of record.waiters) {
        resolve({ exitCode: code, signal });
      }
      record.waiters = [];
    });

    this.terminals.set(terminalId, record);
    return { terminalId };
  }

  private async handleTerminalOutput(params: any): Promise<any> {
    const record = this.terminals.get(params.terminalId);
    if (!record) return { output: '', truncated: false };
    return {
      output: record.output,
      truncated: record.truncated,
      exitStatus: record.exited ? { exitCode: record.exitCode, signal: record.signal } : null,
    };
  }

  private async handleWaitForTerminalExit(params: any): Promise<any> {
    const record = this.terminals.get(params.terminalId);
    if (!record) return { exitCode: null, signal: null };
    if (record.exited) {
      return { exitCode: record.exitCode, signal: record.signal };
    }
    return new Promise((resolve) => {
      record.waiters.push(resolve);
    });
  }

  private async handleKillTerminal(params: any): Promise<any> {
    const record = this.terminals.get(params.terminalId);
    if (record && !record.exited) {
      record.process.kill();
    }
    return {};
  }

  private async handleReleaseTerminal(params: any): Promise<any> {
    const record = this.terminals.get(params.terminalId);
    if (record) {
      if (!record.exited) {
        record.process.kill();
      }
      this.terminals.delete(params.terminalId);
    }
    return {};
  }

  // ---------------------------------------------------------------------------
  // Shutdown
  // ---------------------------------------------------------------------------

  async shutdown(): Promise<void> {
    // Kill all terminals
    for (const [, record] of this.terminals) {
      if (!record.exited) record.process.kill();
    }
    this.terminals.clear();
    this.sessions.clear();
    this.acpToLocal.clear();
    this.connection = null;
    if (this.childProcess) {
      this.childProcess.kill();
      this.childProcess = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Session update dispatcher
  // ---------------------------------------------------------------------------

  private handleSessionUpdate(params: any): void {
    const update = params.update;

    // Find our local session and its prompt state
    const acpSessionId = params.sessionId as string | undefined;
    const localSessionId = acpSessionId ? this.acpToLocal.get(acpSessionId) : undefined;
    const record = localSessionId ? this.sessions.get(localSessionId) : undefined;
    const ps = record?.promptState;

    if (!update) {
      // Legacy fallback: treat entire params as content
      const content = params.content;
      if (content?.type === 'text') {
        ps?.chunks.push(content.text);
      }
      ps?.callback?.({ type: 'partial', data: params });
      return;
    }

    // Dispatch based on update type
    if ('content' in update && update.content) {
      const content = update.content;
      // The ACP protocol uses `sessionUpdate` as the discriminator field.
      const updateType = update.sessionUpdate as string | undefined;

      // During loadSession replay, capture messages into the replay buffer
      const rb = record?.replayBuffer;
      if (rb && content?.type === 'text') {
        const role: 'user' | 'assistant' | null =
          updateType === 'user_message_chunk'
            ? 'user'
            : updateType === 'agent_message_chunk' || !updateType
              ? 'assistant'
              : null;
        if (role) {
          // Flush when role changes (new message boundary)
          if (rb.currentRole && rb.currentRole !== role) {
            this.flushReplayMessage(record!);
          }
          rb.currentRole = role;
          rb.currentChunks.push(content.text);
        }
      }

      // During active prompt, collect agent message chunks into response
      const isAgentChunk = !updateType || updateType === 'agent_message_chunk';
      if (isAgentChunk && content?.type === 'text') {
        ps?.chunks.push(content.text);
      }
      // Forward thinking chunks with a distinct type so the UI can handle them separately
      const callbackType = updateType === 'agent_thought_chunk' ? 'thinking' : 'partial';
      ps?.callback?.({ type: callbackType, data: params });
    } else if ('toolCallId' in update && 'title' in update) {
      // tool_call (has title — initial call, not update)
      ps?.callback?.({ type: 'tool_call', data: update });
    } else if ('toolCallId' in update && !('title' in update)) {
      // tool_call_update (no title — status update)
      ps?.callback?.({ type: 'tool_call_update', data: update });
    } else if ('availableCommands' in update) {
      // available_commands_update
      if (record) {
        record.commands = update.availableCommands.map((cmd: any) => ({
          name: cmd.name,
          description: cmd.description,
          inputHint: cmd.input?.hint ?? null,
        }));
      }
      if (ps) {
        ps.callback?.({ type: 'commands', data: update });
      } else if (localSessionId) {
        this.sessionEventHandler?.(localSessionId, { type: 'commands', data: update });
      }
    } else if ('currentModeId' in update && !('availableModes' in update)) {
      // current_mode_update
      if (record) {
        record.currentModeId = update.currentModeId;
      }
      if (ps) {
        ps.callback?.({ type: 'mode', data: update });
      } else if (localSessionId) {
        this.sessionEventHandler?.(localSessionId, { type: 'mode', data: update });
      }
    } else if ('configOptions' in update) {
      // config_option_update
      if (record) {
        record.configOptions = update.configOptions.map(mapConfigOption);
      }
      if (ps) {
        ps.callback?.({ type: 'config', data: update });
      } else if (localSessionId) {
        this.sessionEventHandler?.(localSessionId, { type: 'config', data: update });
      }
    } else if ('entries' in update) {
      // plan
      ps?.callback?.({ type: 'plan', data: update });
    } else if ('used' in update && 'size' in update) {
      // usage_update
      ps?.callback?.({ type: 'usage', data: update });
    } else if ('title' in update && !('toolCallId' in update)) {
      // session_info_update
      ps?.callback?.({ type: 'session_info', data: update });
    } else {
      // Unknown update type — forward as generic progress
      ps?.callback?.({ type: 'progress', data: params });
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapConfigOption(opt: any): ACPConfigOption {
  const base: ACPConfigOption = {
    id: opt.id,
    name: opt.name,
    description: opt.description ?? null,
    category: opt.category ?? null,
    type: opt.type === 'boolean' ? 'boolean' : 'select',
    currentValue: opt.currentValue ?? opt.value ?? '',
  };
  if (opt.type !== 'boolean' && opt.options) {
    // Flatten grouped options into a flat list
    const options: Array<{ id: string; name: string }> = [];
    for (const group of opt.options) {
      if (group.options) {
        for (const o of group.options) {
          options.push({ id: o.id ?? o.value, name: o.name ?? o.label ?? o.id });
        }
      } else {
        options.push({ id: group.id ?? group.value, name: group.name ?? group.label ?? group.id });
      }
    }
    base.options = options;
  }
  return base;
}
