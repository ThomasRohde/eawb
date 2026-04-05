import type { ToolManifest } from '@ea-workbench/tool-api';

const tools = new Map<string, ToolManifest>();

export function registerTool(manifest: ToolManifest): void {
  if (tools.has(manifest.id)) {
    throw new Error(`Tool "${manifest.id}" is already registered`);
  }
  tools.set(manifest.id, manifest);
}

export function getTool(id: string): ToolManifest | undefined {
  return tools.get(id);
}

export function listTools(): ToolManifest[] {
  return Array.from(tools.values());
}

export function hasTool(id: string): boolean {
  return tools.has(id);
}
