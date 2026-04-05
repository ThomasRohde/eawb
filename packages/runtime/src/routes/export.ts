import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { success, failure, PATHS } from '@ea-workbench/shared-schema';
import {
  ExportRegistry,
  markdownExporter,
  htmlExporter,
  svgExporter,
  type ExportFormat,
} from '@ea-workbench/export-core';
import { ModelStore } from '@ea-workbench/bcm-core';
import { auditLog } from '../db.js';

const registry = new ExportRegistry();
registry.register(markdownExporter);
registry.register(htmlExporter);
registry.register(svgExporter);

// Extensible artifact loader — tools register their data loaders here
type ArtifactLoader = (workspacePath: string, artifactId: string) => unknown;
const artifactLoaders = new Map<string, ArtifactLoader>();

// Register BCM loader
artifactLoaders.set('bcm-studio', (workspacePath, artifactId) => {
  const store = new ModelStore(workspacePath);
  return store.loadModel(artifactId);
});

export function registerArtifactLoader(toolId: string, loader: ArtifactLoader): void {
  artifactLoaders.set(toolId, loader);
}

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/export/formats', async () => {
    return success(registry.list().map(e => ({ format: e.format, name: e.name })));
  });

  app.post<{
    Body: {
      format: ExportFormat;
      toolId: string;
      artifactId: string;
      save?: boolean;
    };
  }>('/export', async (request, reply) => {
    const { format, toolId, artifactId, save } = request.body;
    const workspacePath = (app as any).workspacePath as string;

    const exporter = registry.get(format);
    if (!exporter) {
      return reply.code(400).send(failure(`Unsupported format: ${format}`, 'UNSUPPORTED_FORMAT'));
    }

    // Load artifact data using registered loader
    const loader = artifactLoaders.get(toolId);
    if (!loader) {
      return reply.code(400).send(failure(`Export not supported for tool: ${toolId}`, 'UNSUPPORTED_TOOL'));
    }

    let data: unknown;
    try {
      data = loader(workspacePath, artifactId);
    } catch {
      return reply.code(404).send(failure('Artifact not found', 'NOT_FOUND'));
    }

    // Export
    const result = await exporter.export(data, { format, toolId, artifactId });

    // Optionally save to exports directory
    if (save) {
      const exportsDir = path.join(workspacePath, PATHS.EXPORTS_DIR);
      fs.mkdirSync(exportsDir, { recursive: true });
      const exportPath = path.join(exportsDir, result.filename);
      fs.writeFileSync(exportPath, result.content);
    }

    // Audit log
    try {
      auditLog(workspacePath, toolId, `export:${format}`, artifactId);
    } catch {
      // Audit log failure shouldn't block export
    }

    return success(result);
  });
}
