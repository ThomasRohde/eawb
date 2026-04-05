import type { ToolRegistration } from '@ea-workbench/tool-api';
import { helpManifest } from './manifest.js';
import { helpRoutes } from './routes.js';

export function createHelpRegistration(): ToolRegistration {
  return {
    manifest: helpManifest,
    routes: helpRoutes,
  };
}
