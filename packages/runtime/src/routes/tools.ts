import type { FastifyInstance } from 'fastify';
import { success } from '@ea-workbench/shared-schema';
import { listTools } from '../tool-registry.js';
import { getTool } from '../tool-registry.js';

export async function toolRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tools', async () => {
    const tools = listTools();
    return success(
      tools.map((t) => ({
        id: t.id,
        name: t.name,
        version: t.version,
        description: t.description,
        artifactTypes: t.artifactTypes.map((a) => ({
          id: a.id,
          name: a.name,
          filePattern: a.filePattern,
          directory: a.directory,
        })),
        commands: t.commands.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
        })),
        uiContributions: t.uiContributions,
      })),
    );
  });

  app.get<{ Params: { id: string } }>('/tools/:id', async (request, reply) => {
    const tool = getTool(request.params.id);
    if (!tool) {
      return reply.code(404).send({ ok: false, error: 'Tool not found' });
    }
    return success({
      id: tool.id,
      name: tool.name,
      version: tool.version,
      description: tool.description,
      uiContributions: tool.uiContributions,
    });
  });
}
