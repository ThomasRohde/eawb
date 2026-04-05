import type { IExporter, ExportOptions, ExportResult } from '../types.js';
import { buildLayoutTree, layoutTrees } from '../layout/index.js';
import { renderSvg } from '../layout/svg-renderer.js';
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_THEME } from '../layout/defaults.js';

interface BcmNode {
  id: string;
  name: string;
  parent: string | null;
  order: number;
  description: string;
}

interface BcmModel {
  header: { title: string; description: string; kind: string };
  nodes: BcmNode[];
}

export const svgExporter: IExporter = {
  format: 'svg',
  name: 'SVG',

  async export(data: unknown, options: ExportOptions): Promise<ExportResult> {
    const model = data as BcmModel;
    const roots = buildLayoutTree(model.nodes);

    if (roots.length === 0) {
      const content = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100">
  <text x="200" y="50" text-anchor="middle" font-family="sans-serif" fill="#999">No capabilities</text>
</svg>`;
      return {
        format: 'svg',
        content,
        filename: `${options.artifactId}.svg`,
        metadata: {
          exportedAt: new Date().toISOString(),
          toolId: options.toolId,
          artifactId: options.artifactId,
        },
      };
    }

    const layout = layoutTrees(roots, DEFAULT_LAYOUT_OPTIONS);
    const content = renderSvg(layout, DEFAULT_THEME);

    return {
      format: 'svg',
      content,
      filename: `${options.artifactId}.svg`,
      metadata: {
        exportedAt: new Date().toISOString(),
        toolId: options.toolId,
        artifactId: options.artifactId,
      },
    };
  },
};
