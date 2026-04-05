import type { ToolRegistration } from '@ea-workbench/tool-api';
import { bcmManifest } from './manifest.js';
import { bcmRoutes } from './routes.js';

export function createBcmRegistration(): ToolRegistration {
  return {
    manifest: bcmManifest,
    routes: bcmRoutes,
  };
}
