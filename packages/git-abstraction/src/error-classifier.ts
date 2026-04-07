import type { GitErrorCode } from '@ea-workbench/shared-schema';

interface Pattern {
  code: GitErrorCode;
  match: RegExp;
}

/**
 * Pattern table is matched in order against the error message + stderr.
 * First match wins. Falls back to UNKNOWN.
 */
const PATTERNS: Pattern[] = [
  // Authentication
  { code: 'AUTH_FAILED', match: /authentication failed/i },
  { code: 'AUTH_FAILED', match: /could not read username/i },
  { code: 'AUTH_FAILED', match: /could not read password/i },
  { code: 'AUTH_FAILED', match: /permission denied \(publickey\)/i },
  { code: 'AUTH_FAILED', match: /403 forbidden/i },
  { code: 'AUTH_FAILED', match: /invalid credentials/i },
  { code: 'AUTH_FAILED', match: /access denied/i },
  { code: 'AUTH_FAILED', match: /repository not found/i },

  // Network
  { code: 'NETWORK_UNREACHABLE', match: /could not resolve host/i },
  { code: 'NETWORK_UNREACHABLE', match: /network is unreachable/i },
  { code: 'NETWORK_UNREACHABLE', match: /connection refused/i },
  { code: 'NETWORK_UNREACHABLE', match: /connection timed out/i },
  { code: 'NETWORK_UNREACHABLE', match: /failed to connect/i },
  { code: 'NETWORK_UNREACHABLE', match: /unable to access/i },

  // Conflicts
  { code: 'CONFLICT', match: /conflict/i },
  { code: 'CONFLICT', match: /merge conflict/i },
  { code: 'CONFLICT', match: /needs merge/i },

  // Upstream / non-fast-forward
  { code: 'NO_UPSTREAM', match: /no tracking information/i },
  { code: 'NO_UPSTREAM', match: /no upstream branch/i },
  { code: 'NO_UPSTREAM', match: /no such ref was fetched/i },
  { code: 'NON_FAST_FORWARD', match: /non-fast-forward/i },
  { code: 'NON_FAST_FORWARD', match: /fetch first/i },
  { code: 'NON_FAST_FORWARD', match: /updates were rejected/i },

  // Repo state
  { code: 'REPO_STATE_BLOCKED', match: /you have unmerged paths/i },
  { code: 'REPO_STATE_BLOCKED', match: /rebase in progress/i },
  { code: 'REPO_STATE_BLOCKED', match: /am session/i },
  { code: 'DIRTY_INDEX', match: /your local changes/i },
  { code: 'DIRTY_INDEX', match: /would be overwritten/i },
];

/**
 * Best-effort classification of a git error into a stable code. Stderr
 * matching is fragile across git versions/locales — keep the table
 * comprehensive but always fall back to UNKNOWN.
 */
export function classifyGitError(err: unknown): GitErrorCode {
  const text = extractText(err);
  if (!text) return 'UNKNOWN';
  for (const { code, match } of PATTERNS) {
    if (match.test(text)) return code;
  }
  return 'UNKNOWN';
}

function extractText(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    // simple-git's GitError exposes .message which contains stderr
    return err.message ?? '';
  }
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    return [obj.message, obj.stderr, obj.stdout].filter((v) => typeof v === 'string').join('\n');
  }
  return String(err);
}
