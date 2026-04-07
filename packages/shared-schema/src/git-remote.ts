import { z } from 'zod';

/**
 * Loose validation for a git remote URL. We accept HTTPS, SSH (scp-style),
 * and `ssh://` forms. We deliberately do not probe reachability — that
 * happens during the first sync.
 */
export function isLikelyGitRemoteUrl(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // Defense in depth: reject any string carrying shell metacharacters or
  // control whitespace. Even if a future call site forgets to use argv-based
  // exec, no metacharacter can ever reach a shell.
  if (/[;&|`$<>()'"\\\n\r\t\v\f]/.test(trimmed)) return false;

  // https://host/owner/repo(.git)?
  if (/^https?:\/\/[^\s]+\/[^\s]+\/[^\s]+?(\.git)?\/?$/i.test(trimmed)) return true;

  // ssh://git@host/owner/repo(.git)?
  if (/^ssh:\/\/[^\s@]+@[^\s]+\/[^\s]+\/[^\s]+?(\.git)?\/?$/i.test(trimmed)) return true;

  // git@host:owner/repo(.git)?  (scp-style)
  if (/^[^\s@]+@[^\s:]+:[^\s]+\/[^\s]+?(\.git)?$/.test(trimmed)) return true;

  // git://host/owner/repo(.git)?
  if (/^git:\/\/[^\s]+\/[^\s]+\/[^\s]+?(\.git)?\/?$/i.test(trimmed)) return true;

  return false;
}

export const RemoteUrlSchema = z
  .string()
  .min(1, 'Remote URL is required')
  .refine(isLikelyGitRemoteUrl, {
    message: 'Must be a valid HTTPS or SSH git remote URL',
  });

/**
 * Typed error codes returned by git operations. Stable across versions so
 * the UI can render the right MessageBar without parsing stderr.
 */
export const GIT_ERROR_CODES = [
  'AUTH_FAILED',
  'NETWORK_UNREACHABLE',
  'CONFLICT',
  'NO_UPSTREAM',
  'NO_REMOTE',
  'DIRTY_INDEX',
  'NON_FAST_FORWARD',
  'REPO_STATE_BLOCKED',
  'UNKNOWN',
] as const;

export type GitErrorCode = (typeof GIT_ERROR_CODES)[number];
