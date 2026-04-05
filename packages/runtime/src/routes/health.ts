import type { FastifyInstance } from 'fastify';
import { success } from '@ea-workbench/shared-schema';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return success({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });
}
