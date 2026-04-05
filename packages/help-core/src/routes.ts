import type { FastifyInstance } from 'fastify';
import { success, failure } from '@ea-workbench/shared-schema';
import { loadTopics, getTopic } from './content-loader.js';

export async function helpRoutes(app: FastifyInstance): Promise<void> {
  app.get('/topics', async () => {
    const topics = loadTopics();
    return success(
      topics.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        order: t.order,
      })),
    );
  });

  app.get<{ Params: { id: string } }>('/topics/:id', async (request, reply) => {
    const topic = getTopic(request.params.id);
    if (!topic) {
      return reply.code(404).send(failure('Topic not found', 'NOT_FOUND'));
    }
    return success(topic);
  });
}
