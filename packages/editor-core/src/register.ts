import type { ToolRegistration } from '@ea-workbench/tool-api';
import { editorManifest } from './manifest.js';
import { editorRoutes } from './routes.js';

export function createEditorRegistration(): ToolRegistration {
  return {
    manifest: editorManifest,
    routes: editorRoutes,
  };
}
