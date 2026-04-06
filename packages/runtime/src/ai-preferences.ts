import fs from 'node:fs';
import path from 'node:path';
import { PATHS, AIPreferencesSchema, type AIPreferences } from '@ea-workbench/shared-schema';
import {
  getSessionModels,
  getSessionModes,
  getSessionConfigOptions,
  setSessionModel,
  setSessionMode,
  setSessionConfigOption,
} from './ai-orchestrator.js';

const DEFAULT_PREFERENCES: AIPreferences = AIPreferencesSchema.parse({});

// ---------------------------------------------------------------------------
// Per-workspace mutex for preference file writes
// ---------------------------------------------------------------------------

const workspaceLocks = new Map<string, Promise<void>>();

/**
 * Serialize async operations on the preferences file for a given workspace.
 * Prevents read-modify-write races when multiple requests overlap.
 */
export async function withPreferenceLock<T>(
  workspacePath: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const key = path.resolve(workspacePath);
  const prev = workspaceLocks.get(key) ?? Promise.resolve();
  let releaseFn!: () => void;
  const next = new Promise<void>((resolve) => {
    releaseFn = resolve;
  });
  workspaceLocks.set(key, next);
  try {
    await prev;
    return await fn();
  } finally {
    releaseFn();
    // Clean up if no new work queued behind us
    if (workspaceLocks.get(key) === next) {
      workspaceLocks.delete(key);
    }
  }
}

export function loadPreferences(workspacePath: string): AIPreferences {
  const filePath = path.join(workspacePath, PATHS.PREFERENCES_FILE);
  if (!fs.existsSync(filePath)) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return AIPreferencesSchema.parse(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(workspacePath: string, prefs: AIPreferences): void {
  const filePath = path.join(workspacePath, PATHS.PREFERENCES_FILE);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(prefs, null, 2) + '\n');
}

/**
 * Read models/modes/config from a live session and cache them in preferences.
 * Guards against overwriting a known-good cache with empty results from a
 * broken or uninitialized session.
 */
export async function updateCachedOptions(
  workspacePath: string,
  sessionId: string,
): Promise<AIPreferences> {
  return withPreferenceLock(workspacePath, async () => {
    const [modelsResult, modesResult] = await Promise.all([
      getSessionModels(sessionId),
      getSessionModes(sessionId),
    ]);
    const configOptions = getSessionConfigOptions(sessionId);

    // Don't overwrite a known-good cache with empty results — the session
    // may have failed to initialize properly.
    const hasResults =
      modelsResult.models.length > 0 || modesResult.modes.length > 0 || configOptions.length > 0;

    const prefs = loadPreferences(workspacePath);

    if (!hasResults && prefs.cachedOptions.updatedAt !== null) {
      // Preserve existing cache — the session returned nothing useful
      return prefs;
    }

    prefs.cachedOptions = {
      models: modelsResult.models,
      modes: modesResult.modes,
      configOptions,
      updatedAt: new Date().toISOString(),
    };

    savePreferences(workspacePath, prefs);
    return prefs;
  });
}

/**
 * Apply user preferences to a newly created session.
 * Validates each preference against cached available options before applying.
 * Skips silently if the option is simply not available (stale preference),
 * but logs warnings for unexpected errors (transport, auth, adapter bugs).
 */
export async function applyPreferences(sessionId: string, workspacePath: string): Promise<void> {
  const prefs = loadPreferences(workspacePath);
  const cached = prefs.cachedOptions;

  if (prefs.preferredModelId) {
    const known = cached.models.some((m) => m.id === prefs.preferredModelId);
    if (!known) {
      // Stale preference — model no longer offered by provider
    } else {
      try {
        await setSessionModel(sessionId, prefs.preferredModelId);
      } catch (err) {
        console.warn(
          `[ai-preferences] Failed to apply preferred model "${prefs.preferredModelId}":`,
          err,
        );
      }
    }
  }

  if (prefs.preferredModeId) {
    const known = cached.modes.some((m) => m.id === prefs.preferredModeId);
    if (!known) {
      // Stale preference — mode no longer offered by provider
    } else {
      try {
        await setSessionMode(sessionId, prefs.preferredModeId);
      } catch (err) {
        console.warn(
          `[ai-preferences] Failed to apply preferred mode "${prefs.preferredModeId}":`,
          err,
        );
      }
    }
  }

  const cachedOptionIds = new Set(cached.configOptions.map((o) => o.id));
  for (const [optionId, value] of Object.entries(prefs.configOverrides)) {
    if (!cachedOptionIds.has(optionId)) continue; // Stale — skip silently
    try {
      await setSessionConfigOption(sessionId, optionId, value);
    } catch (err) {
      console.warn(`[ai-preferences] Failed to apply config override "${optionId}":`, err);
    }
  }
}

/** Track whether we've cached options at least once this server lifetime. */
let cachedOnce = false;

/**
 * Opportunistically cache options from the first session after server start.
 */
export async function maybeCacheOptions(workspacePath: string, sessionId: string): Promise<void> {
  if (cachedOnce) return;
  cachedOnce = true;
  try {
    await updateCachedOptions(workspacePath, sessionId);
  } catch {
    // Non-critical — cache will be updated on next opportunity
    cachedOnce = false;
  }
}
