import type { ToolRegistration } from '@ea-workbench/tool-api';
import { chatManifest } from './manifest.js';
import { chatRoutes } from './routes.js';

export function createChatRegistration(): ToolRegistration {
  return {
    manifest: chatManifest,
    routes: chatRoutes,
  };
}
