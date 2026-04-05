import type { ACPSession, SessionOptions } from './session.js';
import type {
  ACPCapabilities,
  ACPMode,
  ACPModel,
  ACPCommand,
  ACPConfigOption,
  ACPPermissionHandler,
  ACPSessionInfo,
} from './capabilities.js';

export interface ACPPromptResult {
  content: string;
  structured?: unknown;
  stopReason?: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export interface ACPProgressCallback {
  (update: { type: string; data: unknown }): void;
}

/** Callback for session-level events that arrive outside of a prompt. */
export interface ACPSessionEventCallback {
  (sessionId: string, update: { type: string; data: unknown }): void;
}

/** Message replayed during loadSession. */
export interface ACPReplayedMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IACPAdapter {
  // --- Lifecycle ---
  initialize(): Promise<void>;
  isAvailable(): Promise<boolean>;
  shutdown(): Promise<void>;

  // --- Capabilities ---
  getCapabilities(): ACPCapabilities;

  // --- Sessions ---
  createSession(opts: SessionOptions): Promise<ACPSession>;
  destroySession(sessionId: string): Promise<void>;

  // --- Session events ---
  setSessionEventHandler(handler: ACPSessionEventCallback | null): void;

  // --- Session history ---
  listSessions(opts: { cwd?: string; cursor?: string | null }): Promise<{
    sessions: ACPSessionInfo[];
    nextCursor?: string | null;
  }>;
  loadSession(
    sessionId: string,
    cwd: string,
  ): Promise<{ session: ACPSession; messages: ACPReplayedMessage[] }>;

  // --- Prompting ---
  prompt(
    sessionId: string,
    input: string,
    onProgress?: ACPProgressCallback,
  ): Promise<ACPPromptResult>;
  cancelPrompt(sessionId: string): Promise<void>;

  // --- Modes ---
  getSessionModes(sessionId: string): Promise<{ modes: ACPMode[]; currentModeId: string | null }>;
  setSessionMode(sessionId: string, modeId: string): Promise<void>;

  // --- Models ---
  getSessionModels(
    sessionId: string,
  ): Promise<{ models: ACPModel[]; currentModelId: string | null }>;
  setSessionModel(sessionId: string, modelId: string): Promise<void>;

  // --- Slash Commands ---
  getAvailableCommands(sessionId: string): ACPCommand[];

  // --- Config Options ---
  getSessionConfigOptions(sessionId: string): ACPConfigOption[];
  setSessionConfigOption(sessionId: string, optionId: string, value: unknown): Promise<void>;

  // --- Permissions ---
  setPermissionHandler(handler: ACPPermissionHandler | null): void;
}
