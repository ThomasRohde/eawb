import type { ToolManifest } from './tool-manifest.js';

export interface ToolRegistration {
  manifest: ToolManifest;
  routes?: (app: any) => Promise<void>;
}
