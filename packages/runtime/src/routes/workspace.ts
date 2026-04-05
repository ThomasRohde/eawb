import type { FastifyInstance } from 'fastify';
import { success, failure } from '@ea-workbench/shared-schema';
import { getWorkspaceStatus, initializeWorkbench } from '../workspace.js';

export async function workspaceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/workspace', async (request) => {
    const workspacePath = (app as any).workspacePath as string;
    const status = await getWorkspaceStatus(workspacePath);
    return success(status);
  });

  app.post<{ Body: { name?: string } }>('/workspace/init', async (request) => {
    const workspacePath = (app as any).workspacePath as string;
    try {
      const config = await initializeWorkbench(workspacePath, request.body?.name);
      return success({ config, message: 'Workbench initialized' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return failure(message, 'INIT_FAILED');
    }
  });
}
