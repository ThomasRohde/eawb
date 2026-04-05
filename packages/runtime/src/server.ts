import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { workspaceRoutes } from './routes/workspace.js';
import { checkpointRoutes } from './routes/checkpoints.js';
import { toolRoutes } from './routes/tools.js';
import { exportRoutes } from './routes/export.js';
import { aiRoutes } from './routes/ai.js';
import { addToolRegistration, mountTools } from './tool-host.js';
import { setupWebSocket, broadcast } from './ws.js';
import { getDb, closeDb } from './db.js';
import { isWorkbenchInitialized } from './workspace.js';
import { AutoCheckpointService } from './auto-checkpoint.js';
import { createBcmRegistration } from '@ea-workbench/bcm-core';
import { createChatRegistration } from '@ea-workbench/chat-core';
import { createEditorRegistration } from '@ea-workbench/editor-core';
import { createHelpRegistration } from '@ea-workbench/help-core';

export interface ServerOptions {
  port: number;
  host: string;
  workspacePath: string;
  shellUiDistPath?: string;
  silent?: boolean;
}

export async function createServer(opts: ServerOptions) {
  const app = Fastify({
    logger: {
      level: opts.silent ? 'silent' : 'info',
    },
  });

  // Store workspace path and AI function for route access
  (app as any).workspacePath = opts.workspacePath;
  (app as any).aiPromptFn = async (
    prompt: string,
    workingDir?: string,
    existingSessionId?: string | null,
    onChunk?: (text: string) => void,
  ) => {
    const { conversationalPrompt } = await import('./ai-orchestrator.js');
    return conversationalPrompt(prompt, workingDir, existingSessionId, onChunk);
  };
  (app as any).aiDestroySessionFn = async (sessionId: string) => {
    const { destroyAISession } = await import('./ai-orchestrator.js');
    return destroyAISession(sessionId);
  };
  (app as any).broadcastFn = broadcast;
  const autoCheckpoint = new AutoCheckpointService(opts.workspacePath, broadcast);
  (app as any).autoCheckpoint = autoCheckpoint;

  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Serve shell-ui static files if path provided
  if (opts.shellUiDistPath) {
    await app.register(fastifyStatic, {
      root: opts.shellUiDistPath,
      prefix: '/',
      wildcard: true,
    });

    // SPA fallback — serve index.html for non-API routes
    app.setNotFoundHandler(async (request, reply) => {
      if (!request.url.startsWith('/api/') && !request.url.startsWith('/ws')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ ok: false, error: 'Not found' });
    });
  }

  // WebSocket
  setupWebSocket(app);

  // API routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(workspaceRoutes, { prefix: '/api' });
  await app.register(checkpointRoutes, { prefix: '/api' });
  await app.register(toolRoutes, { prefix: '/api' });
  await app.register(exportRoutes, { prefix: '/api' });
  await app.register(aiRoutes, { prefix: '/api' });

  // Register built-in tools
  addToolRegistration(createBcmRegistration());
  addToolRegistration(createChatRegistration());
  addToolRegistration(createEditorRegistration());
  addToolRegistration(createHelpRegistration());

  // Mount registered tools
  await mountTools(app);

  // Initialize SQLite if workbench is initialized
  if (isWorkbenchInitialized(opts.workspacePath)) {
    getDb(opts.workspacePath);
  }

  // Cleanup on close
  app.addHook('onClose', () => {
    autoCheckpoint.dispose();
    closeDb();
  });

  return app;
}

export async function startServer(opts: ServerOptions): Promise<string> {
  const app = await createServer(opts);
  const address = await app.listen({ port: opts.port, host: opts.host });
  return address;
}
