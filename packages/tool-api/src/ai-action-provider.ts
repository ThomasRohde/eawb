/**
 * Defines the contract for a tool that provides AI actions.
 * UI packages implement this interface to register their actions
 * with the generic AI Actions panel in shell-ui.
 */

/** UI-facing action definition (rendered as action cards). */
export interface AIActionUIDefinition {
  id: string;
  name: string;
  description: string;
  /** Requires an active selection (e.g. a selected BCM node). */
  needsSelection?: boolean;
  /** Requires free-text user input before execution. */
  needsInput?: boolean;
  /** Label for the input dialog when needsInput is true. */
  inputLabel?: string;
  /** Placeholder text for the input dialog. */
  inputPlaceholder?: string;
}

/**
 * Result of an AI action execution, returned from /api/ai/execute.
 */
export interface AIActionResult {
  content: string;
  structured: unknown;
}

/**
 * Props passed to a tool's result renderer component.
 */
export interface AIResultRendererProps {
  actionId: string;
  content: string;
  structured: unknown;
  onItemAction?: (type: string, item: unknown, index: number) => Promise<void>;
  appliedItems?: Set<number>;
  busyItem?: number | null;
}

/**
 * Contract implemented by each tool that contributes AI actions.
 * Registered in shell-ui's provider map keyed by toolId.
 *
 * Note: React component types are expressed as `unknown` here because
 * tool-api is a pure TS package with no React dependency. Consuming code
 * in shell-ui casts ResultRenderer to React.ComponentType<AIResultRendererProps>.
 */
export interface AIActionProvider {
  toolId: string;
  toolName: string;
  actions: AIActionUIDefinition[];

  /** Returns the current context for AI execution (e.g. { modelId, nodeId }). */
  getContext(): Record<string, unknown>;

  /** Whether this tool has an active artifact to run actions against. */
  hasActiveArtifact(): boolean;

  /**
   * React component that renders action results.
   * Typed as `unknown` to avoid React dependency in tool-api;
   * cast to React.ComponentType<AIResultRendererProps> in shell-ui.
   */
  ResultRenderer: unknown;

  /** Apply a single result item (e.g. one rename, one description). */
  applyItem(actionId: string, item: unknown, index: number): Promise<void>;

  /** Bulk-apply all result items for an action. */
  applyAll(actionId: string, items: unknown[], context: Record<string, unknown>): Promise<void>;

  /** Action IDs that support bulk "Accept All" (vs per-item only). */
  bulkAcceptActions: string[];
}
