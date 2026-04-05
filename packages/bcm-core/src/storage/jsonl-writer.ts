import fs from 'node:fs';
import path from 'node:path';
import type { BcmModel } from '../schemas/model.js';
import type { BcmNode } from '../schemas/node.js';

function serializeNode(nodes: BcmNode[], parentId: string | null): string[] {
  const children = nodes
    .filter((n) => n.parent === parentId)
    .sort((a, b) => a.order - b.order);

  const lines: string[] = [];
  for (const child of children) {
    lines.push(JSON.stringify(child));
    lines.push(...serializeNode(nodes, child.id));
  }
  return lines;
}

export function serializeModel(model: BcmModel): string {
  const lines: string[] = [];

  // Header line
  lines.push(JSON.stringify(model.header));

  // Nodes in deterministic depth-first order
  lines.push(...serializeNode(model.nodes, null));

  return lines.join('\n') + '\n';
}

export function writeModelFile(filePath: string, model: BcmModel): void {
  const content = serializeModel(model);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  // Atomic write: write to temp file, then rename
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, content, 'utf-8');
  try {
    fs.renameSync(tmpPath, filePath);
  } catch {
    // Windows may fail if destination exists
    fs.unlinkSync(filePath);
    fs.renameSync(tmpPath, filePath);
  }
}
