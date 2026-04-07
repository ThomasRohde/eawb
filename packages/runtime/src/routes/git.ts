import type { FastifyInstance } from 'fastify';
import { success, failure, RemoteUrlSchema, type GitErrorCode } from '@ea-workbench/shared-schema';
import { GitService, classifyGitError } from '@ea-workbench/git-abstraction';
import { broadcast } from '../ws.js';

interface SyncStepResult {
  step: 'checkpoint' | 'fetch' | 'pull' | 'push';
  status: 'ok' | 'skipped' | 'failed';
  durationMs: number;
  detail?: unknown;
  errorCode?: GitErrorCode;
  errorMessage?: string;
}

interface SyncResponse {
  ok: boolean;
  steps: SyncStepResult[];
  finalStatus: unknown;
  conflictedFiles?: string[];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function gitRoutes(app: FastifyInstance): Promise<void> {
  const getGit = async () => {
    const workspacePath = (app as any).workspacePath as string;
    const git = new GitService();
    await git.init(workspacePath);
    return git;
  };

  // -------------------------------------------------------------------
  // Remote management
  // -------------------------------------------------------------------

  app.get<{ Querystring: { fetch?: string } }>('/remote', async (request) => {
    try {
      const git = await getGit();
      const status = await git.getRemoteStatus({ fetch: request.query.fetch === 'true' });
      return success(status);
    } catch (err) {
      return failure(errorMessage(err), 'REMOTE_STATUS_FAILED');
    }
  });

  app.post<{ Body: { url: string } }>('/remote', async (request) => {
    const parsed = RemoteUrlSchema.safeParse(request.body?.url);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message ?? 'Invalid URL', 'REMOTE_INVALID_URL');
    }
    try {
      const git = await getGit();
      await git.addRemote('origin', parsed.data);
      broadcast({ type: 'remote:changed', url: parsed.data });
      return success({ remote: 'origin', url: parsed.data });
    } catch (err) {
      return failure(errorMessage(err), 'REMOTE_SET_FAILED');
    }
  });

  app.delete('/remote', async () => {
    try {
      const git = await getGit();
      await git.removeRemote('origin');
      broadcast({ type: 'remote:changed', url: null });
      return success({ removed: true });
    } catch (err) {
      return failure(errorMessage(err), 'REMOTE_REMOVE_FAILED');
    }
  });

  // -------------------------------------------------------------------
  // hasRemote (kept for backwards compatibility with VersionHistoryPanel)
  // -------------------------------------------------------------------

  app.get('/has-remote', async () => {
    try {
      const git = await getGit();
      const hasRemote = await git.hasRemote();
      return success({ hasRemote });
    } catch (err) {
      return failure(errorMessage(err), 'HAS_REMOTE_FAILED');
    }
  });

  // -------------------------------------------------------------------
  // Push (moved from checkpoints.ts)
  // -------------------------------------------------------------------

  app.post<{ Body: { remote?: string; branch?: string } }>('/push', async (request) => {
    try {
      const git = await getGit();
      const result = await git.push(request.body?.remote, request.body?.branch);
      broadcast({
        type: 'push:complete',
        remote: result.remote,
        branch: result.branch,
      });
      return success(result);
    } catch (err) {
      const code = classifyGitError(err);
      return failure(errorMessage(err), code === 'UNKNOWN' ? 'PUSH_FAILED' : code);
    }
  });

  // -------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------

  app.post<{ Body: { remote?: string } }>('/fetch', async (request) => {
    try {
      const git = await getGit();
      const result = await git.fetch(request.body?.remote);
      broadcast({ type: 'fetch:complete', remote: result.remote });
      return success(result);
    } catch (err) {
      const code = classifyGitError(err);
      return failure(errorMessage(err), code === 'UNKNOWN' ? 'FETCH_FAILED' : code);
    }
  });

  // -------------------------------------------------------------------
  // Pull (with auto-checkpoint)
  // -------------------------------------------------------------------

  app.post<{
    Body: { remote?: string; branch?: string; rebase?: boolean; autostash?: boolean };
  }>('/pull', async (request) => {
    try {
      const git = await getGit();

      if ((await git.isRebasing()) || (await git.isMerging())) {
        return failure(
          'Your repository is mid-merge or mid-rebase. Resolve it first.',
          'REPO_STATE_BLOCKED',
        );
      }

      // Auto-checkpoint tracked changes before any network op. Untracked
      // files (scratch notes, secrets) are intentionally left alone.
      let checkpointId: string | undefined;
      const cp = await git.createTrackedCheckpoint('auto: pre-pull checkpoint');
      if (cp) {
        checkpointId = cp.id;
        broadcast({ type: 'checkpoint:auto', id: cp.id, message: cp.message });
      }

      try {
        const result = await git.pull(request.body?.remote, request.body?.branch, {
          rebase: request.body?.rebase ?? true,
          autostash: request.body?.autostash ?? true,
        });
        broadcast({
          type: 'pull:complete',
          remote: result.remote,
          branch: result.branch,
          filesChanged: result.filesChanged,
        });
        const status = await git.getRemoteStatus();
        return success({ checkpointId, pull: result, status });
      } catch (err) {
        if (await git.isRebasing()) await git.abortRebase();
        const code = classifyGitError(err);
        const conflictedFiles = await git.getConflictedFiles();
        if (code === 'CONFLICT' || conflictedFiles.length > 0) {
          broadcast({
            type: 'sync:conflict',
            remote: request.body?.remote ?? 'origin',
            conflictedFiles,
          });
        }
        return failure(errorMessage(err), code === 'UNKNOWN' ? 'PULL_FAILED' : code, {
          conflictedFiles,
        });
      }
    } catch (err) {
      return failure(errorMessage(err), 'PULL_FAILED');
    }
  });

  // -------------------------------------------------------------------
  // Sync — the one-click happy path
  // -------------------------------------------------------------------

  app.post<{ Body: { remote?: string } }>('/sync', async (request) => {
    const steps: SyncStepResult[] = [];
    const targetRemote = request.body?.remote ?? 'origin';

    const time = async <T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> => {
      const start = Date.now();
      const value = await fn();
      return { value, ms: Date.now() - start };
    };

    try {
      const git = await getGit();

      const initialStatus = await git.getRemoteStatus();
      if (!initialStatus.hasRemote) {
        return failure('No remote configured', 'NO_REMOTE');
      }

      if ((await git.isRebasing()) || (await git.isMerging())) {
        return failure(
          'Your repository is mid-merge or mid-rebase. Resolve it first.',
          'REPO_STATE_BLOCKED',
        );
      }

      if (initialStatus.branch === null) {
        return failure(
          'Your repository is in detached HEAD state. Switch to a branch first.',
          'REPO_STATE_BLOCKED',
        );
      }

      // ---- Step 1: tracked auto-checkpoint (untracked files left alone)
      try {
        const { value: cp, ms } = await time(() =>
          git.createTrackedCheckpoint('auto: pre-sync checkpoint'),
        );
        if (cp) {
          broadcast({ type: 'checkpoint:auto', id: cp.id, message: cp.message });
          steps.push({ step: 'checkpoint', status: 'ok', durationMs: ms, detail: cp });
        } else {
          steps.push({ step: 'checkpoint', status: 'skipped', durationMs: 0 });
        }
      } catch (err) {
        steps.push({
          step: 'checkpoint',
          status: 'failed',
          durationMs: 0,
          errorCode: classifyGitError(err),
          errorMessage: errorMessage(err),
        });
        const finalStatus = await git.getRemoteStatus();
        const response: SyncResponse = { ok: false, steps, finalStatus };
        return success(response);
      }

      // ---- Step 2: fetch (runs in both upstream/no-upstream paths so the
      // status badge gets a fresh lastFetchedAt and we can detect whether
      // origin/<branch> exists for first-publish handling)
      try {
        const { ms } = await time(() => git.fetch(targetRemote));
        broadcast({ type: 'fetch:complete', remote: targetRemote });
        steps.push({ step: 'fetch', status: 'ok', durationMs: ms });
      } catch (err) {
        const code = classifyGitError(err);
        steps.push({
          step: 'fetch',
          status: 'failed',
          durationMs: 0,
          errorCode: code,
          errorMessage: errorMessage(err),
        });
        const finalStatus = await git.getRemoteStatus();
        const response: SyncResponse = { ok: false, steps, finalStatus };
        return success(response);
      }

      // Re-read status — fetch may have populated upstream tracking refs
      const status1 = await git.getRemoteStatus();
      const branch = status1.branch ?? initialStatus.branch;

      // Helper: pull --rebase --autostash with conflict-abort safety
      const runPull = async (
        remote: string,
        branchArg: string | undefined,
      ): Promise<{ ok: boolean; conflictedFiles?: string[] }> => {
        try {
          const { value: pullResult, ms } = await time(() =>
            git.pull(remote, branchArg, { rebase: true, autostash: true }),
          );
          broadcast({
            type: 'pull:complete',
            remote: pullResult.remote,
            branch: pullResult.branch,
            filesChanged: pullResult.filesChanged,
          });
          steps.push({ step: 'pull', status: 'ok', durationMs: ms, detail: pullResult });
          return { ok: true };
        } catch (err) {
          // CRITICAL: never leave the user mid-rebase
          if (await git.isRebasing()) await git.abortRebase();
          const conflictedFiles = await git.getConflictedFiles();
          const code = classifyGitError(err);
          steps.push({
            step: 'pull',
            status: 'failed',
            durationMs: 0,
            errorCode: code,
            errorMessage: errorMessage(err),
            detail: { conflictedFiles },
          });
          if (code === 'CONFLICT' || conflictedFiles.length > 0) {
            broadcast({ type: 'sync:conflict', remote, conflictedFiles });
          }
          return { ok: false, conflictedFiles };
        }
      };

      // Helper: push and record the step
      const runPush = async (remote: string, branchArg?: string): Promise<{ ok: boolean }> => {
        try {
          const { value: pushResult, ms } = await time(() => git.push(remote, branchArg));
          broadcast({
            type: 'push:complete',
            remote: pushResult.remote,
            branch: pushResult.branch,
          });
          steps.push({ step: 'push', status: 'ok', durationMs: ms, detail: pushResult });
          return { ok: true };
        } catch (err) {
          const code = classifyGitError(err);
          steps.push({
            step: 'push',
            status: 'failed',
            durationMs: 0,
            errorCode: code,
            errorMessage: errorMessage(err),
          });
          return { ok: false };
        }
      };

      // ---- Steps 3 & 4: branch on whether upstream tracking exists
      if (status1.hasUpstream) {
        // Established upstream — pull then push if ahead
        const pullOutcome = await runPull(targetRemote, undefined);
        if (!pullOutcome.ok) {
          const finalStatus = await git.getRemoteStatus();
          const response: SyncResponse = {
            ok: false,
            steps,
            finalStatus,
            conflictedFiles: pullOutcome.conflictedFiles,
          };
          return success(response);
        }

        const statusAfter = await git.getRemoteStatus();
        if (statusAfter.ahead === 0) {
          steps.push({ step: 'push', status: 'skipped', durationMs: 0 });
        } else {
          const pushOutcome = await runPush(targetRemote);
          if (!pushOutcome.ok) {
            const finalStatus = await git.getRemoteStatus();
            const response: SyncResponse = { ok: false, steps, finalStatus };
            return success(response);
          }
        }
      } else {
        // First-publish path — branch has no upstream yet
        if (await git.remoteBranchExists(targetRemote, branch)) {
          // Remote branch already exists (e.g. colleague pushed first).
          // Pull explicitly, then push -u to establish the upstream pointer.
          const pullOutcome = await runPull(targetRemote, branch);
          if (!pullOutcome.ok) {
            const finalStatus = await git.getRemoteStatus();
            const response: SyncResponse = {
              ok: false,
              steps,
              finalStatus,
              conflictedFiles: pullOutcome.conflictedFiles,
            };
            return success(response);
          }
          const pushOutcome = await runPush(targetRemote, branch);
          if (!pushOutcome.ok) {
            const finalStatus = await git.getRemoteStatus();
            const response: SyncResponse = { ok: false, steps, finalStatus };
            return success(response);
          }
        } else {
          // Truly first publish — nothing to pull
          steps.push({
            step: 'pull',
            status: 'skipped',
            durationMs: 0,
            detail: { reason: 'first publish' },
          });
          const pushOutcome = await runPush(targetRemote, branch);
          if (!pushOutcome.ok) {
            const finalStatus = await git.getRemoteStatus();
            const response: SyncResponse = { ok: false, steps, finalStatus };
            return success(response);
          }
        }
      }

      const finalStatus = await git.getRemoteStatus();
      const pulledFiles =
        (
          steps.find((s) => s.step === 'pull' && s.status === 'ok')?.detail as
            | { filesChanged?: number }
            | undefined
        )?.filesChanged ?? 0;
      const pushed = steps.some((s) => s.step === 'push' && s.status === 'ok');
      broadcast({
        type: 'sync:complete',
        remote: targetRemote,
        branch: finalStatus.branch ?? '',
        pushed,
        filesChanged: pulledFiles,
      });
      const response: SyncResponse = { ok: true, steps, finalStatus };
      return success(response);
    } catch (err) {
      return failure(errorMessage(err), 'SYNC_FAILED');
    }
  });
}
