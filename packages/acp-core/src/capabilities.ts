/** Provider-agnostic capability flags derived from ACP agent capabilities. */
export interface ACPCapabilities {
  loadSession: boolean;
  listSessions: boolean;
  modes: boolean;
  models: boolean;
  configOptions: boolean;
  cancel: boolean;
}

export const EMPTY_CAPABILITIES: ACPCapabilities = {
  loadSession: false,
  listSessions: false,
  modes: false,
  models: false,
  configOptions: false,
  cancel: false,
};

/** Mode information exposed to the UI. */
export interface ACPMode {
  id: string;
  name: string;
  description?: string | null;
}

/** Model information exposed to the UI. */
export interface ACPModel {
  id: string;
  name: string;
  description?: string | null;
}

/** Slash command exposed to the UI. */
export interface ACPCommand {
  name: string;
  description: string;
  inputHint?: string | null;
}

/** Config option exposed to the UI. */
export interface ACPConfigOption {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type: 'select' | 'boolean';
  currentValue: string | boolean;
  options?: Array<{ id: string; name: string }>;
}

/** Plan entry exposed to the UI. */
export interface ACPPlanEntry {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

/** Usage information exposed to the UI. */
export interface ACPUsage {
  used: number;
  size: number;
  cost?: { amount: number; currency: string } | null;
}

/** Tool call information exposed to the UI. */
export interface ACPToolCall {
  toolCallId: string;
  title: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  kind?: string;
}

/** Permission request exposed to the UI. */
export interface ACPPermissionRequest {
  requestId: string;
  sessionId: string;
  toolCall: { toolCallId: string; title?: string; kind?: string };
  options: Array<{ optionId: string; name: string; kind: string }>;
}

/** Session info returned by listSessions. */
export interface ACPSessionInfo {
  sessionId: string;
  title?: string | null;
  updatedAt?: string | null;
  cwd: string;
}

/** Callback that the runtime registers to handle permission requests from the adapter. */
export type ACPPermissionHandler = (
  request: ACPPermissionRequest,
) => Promise<{ outcome: 'selected'; optionId: string } | { outcome: 'cancelled' }>;
