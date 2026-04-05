import type { IExporter, ExportOptions, ExportResult } from '../types.js';

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

function getChildren(nodes: BcmNode[], parentId: string | null): BcmNode[] {
  return nodes.filter(n => n.parent === parentId).sort((a, b) => a.order - b.order);
}

function renderNode(nodes: BcmNode[], node: BcmNode, depth: number): string {
  const prefix = '#'.repeat(Math.min(depth + 1, 6));
  const lines: string[] = [];

  lines.push(`${prefix} ${node.name}`);
  if (node.description) {
    lines.push('');
    lines.push(node.description);
  }
  lines.push('');

  const children = getChildren(nodes, node.id);
  for (const child of children) {
    lines.push(renderNode(nodes, child, depth + 1));
  }

  return lines.join('\n');
}

export const markdownExporter: IExporter = {
  format: 'markdown',
  name: 'Markdown',

  async export(data: unknown, options: ExportOptions): Promise<ExportResult> {
    const model = data as BcmModel;
    const lines: string[] = [];

    lines.push(`# ${model.header.title}`);
    if (model.header.description) {
      lines.push('');
      lines.push(model.header.description);
    }
    lines.push('');
    lines.push(`> Type: ${model.header.kind} | Nodes: ${model.nodes.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    const roots = getChildren(model.nodes, null);
    for (const root of roots) {
      lines.push(renderNode(model.nodes, root, 1));
    }

    const content = lines.join('\n');

    return {
      format: 'markdown',
      content,
      filename: `${options.artifactId}.md`,
      metadata: {
        exportedAt: new Date().toISOString(),
        toolId: options.toolId,
        artifactId: options.artifactId,
      },
    };
  },
};
