import type { ToolRegistration } from '@ea-workbench/tool-api';
import { jsonFormsManifest } from './manifest.js';
import { jsonFormsRoutes } from './routes.js';

export function createJsonFormsRegistration(): ToolRegistration {
  return {
    manifest: jsonFormsManifest,
    routes: jsonFormsRoutes,
  };
}
