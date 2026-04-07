import type { FastifyInstance } from 'fastify';
import { success, failure } from '@ea-workbench/shared-schema';
import { GitService } from '@ea-workbench/git-abstraction';
import { broadcast } from '../ws.js';

export async function checkpointRoutes(app: FastifyInstance): Promise<void> {
  const getGit = async () => {
    const workspacePath = (app as any).workspacePath as string;
    const git = new GitService();
    await git.init(workspacePath);
    return git;
  };

  app.get<{ Querystring: { limit?: string } }>('/checkpoints', async (request) => {
    try {
      const git = await getGit();
      const limit = parseInt(request.query.limit ?? '50', 10);
      const checkpoints = await git.listCheckpoints(limit);
      return success(checkpoints);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return failure(message, 'CHECKPOINT_LIST_FAILED');
    }
  });

  app.post<{ Body: { message: string; paths?: string[] } }>('/checkpoints', async (request) => {
    try {
      const git = await getGit();
      const checkpoint = await git.createCheckpoint(request.body.message, request.body.paths);
      broadcast({
        type: 'checkpoint:created',
        id: checkpoint.id,
        message: checkpoint.message,
      });
      return success(checkpoint);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return failure(message, 'CHECKPOINT_CREATE_FAILED');
    }
  });

  app.get('/draft-status', async () => {
    try {
      const git = await getGit();
      const status = await git.getDraftStatus();
      return success(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return failure(message, 'DRAFT_STATUS_FAILED');
    }
  });

  app.post<{ Body: { checkpointId: string; paths?: string[]; force?: boolean } }>(
    '/restore',
    async (request) => {
      try {
        const git = await getGit();
        await git.restore(request.body.checkpointId, request.body.paths, {
          force: request.body.force ?? false,
        });
        return success({ restored: true, checkpointId: request.body.checkpointId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return failure(message, 'RESTORE_FAILED');
      }
    },
  );

  app.post<{ Body: { from: string; to: string } }>('/compare', async (request) => {
    try {
      const git = await getGit();
      const result = await git.compare(request.body.from, request.body.to);
      return success(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return failure(message, 'COMPARE_FAILED');
    }
  });
}
