import type { FastifyInstance } from 'fastify';
import type { ToolRegistration } from '@ea-workbench/tool-api';
import { registerTool, listTools } from './tool-registry.js';
import { broadcast } from './ws.js';

const registrations: ToolRegistration[] = [];

export function addToolRegistration(reg: ToolRegistration): void {
  registrations.push(reg);
}

export async function mountTools(app: FastifyInstance): Promise<void> {
  for (const reg of registrations) {
    registerTool(reg.manifest);

    if (reg.routes) {
      await app.register(
        async (instance) => {
          await reg.routes!(instance);
        },
        { prefix: `/api/tools/${reg.manifest.id}` },
      );
    }

    broadcast({
      type: 'tool:registered',
      toolId: reg.manifest.id,
    });

    app.log.info(`Tool registered: ${reg.manifest.name} (${reg.manifest.id})`);
  }
}

export { listTools };
