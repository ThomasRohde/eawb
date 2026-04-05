import type { BcmModel } from '../schemas/model.js';

export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

export function validateUniqueIds(model: BcmModel): Diagnostic[] {
  const seen = new Set<string>();
  const diagnostics: Diagnostic[] = [];
  for (const node of model.nodes) {
    if (seen.has(node.id)) {
      diagnostics.push({ level: 'error', message: `Duplicate node ID: ${node.id}`, nodeId: node.id });
    }
    seen.add(node.id);
  }
  return diagnostics;
}

export function validateParentRefs(model: BcmModel): Diagnostic[] {
  const ids = new Set(model.nodes.map((n) => n.id));
  const diagnostics: Diagnostic[] = [];
  for (const node of model.nodes) {
    if (node.parent !== null && !ids.has(node.parent)) {
      diagnostics.push({
        level: 'error',
        message: `Node "${node.name}" references non-existent parent: ${node.parent}`,
        nodeId: node.id,
      });
    }
  }
  return diagnostics;
}

export function validateNoCycles(model: BcmModel): Diagnostic[] {
  const parentMap = new Map<string, string | null>();
  for (const node of model.nodes) {
    parentMap.set(node.id, node.parent);
  }

  const diagnostics: Diagnostic[] = [];
  for (const node of model.nodes) {
    const visited = new Set<string>();
    let current: string | null = node.id;
    while (current !== null) {
      if (visited.has(current)) {
        diagnostics.push({
          level: 'error',
          message: `Cycle detected involving node "${node.name}"`,
          nodeId: node.id,
        });
        break;
      }
      visited.add(current);
      current = parentMap.get(current) ?? null;
    }
  }
  return diagnostics;
}

export function validateNonEmptyNames(model: BcmModel): Diagnostic[] {
  return model.nodes
    .filter((n) => !n.name || n.name.trim().length === 0)
    .map((n) => ({
      level: 'error' as const,
      message: `Node has empty name`,
      nodeId: n.id,
    }));
}

export function validateSiblingOrder(model: BcmModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const byParent = new Map<string | null, number[]>();

  for (const node of model.nodes) {
    const key = node.parent ?? '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node.order);
  }

  for (const [parentKey, orders] of byParent) {
    const sorted = [...orders].sort((a, b) => a - b);
    const hasDuplicates = new Set(orders).size !== orders.length;
    if (hasDuplicates) {
      diagnostics.push({
        level: 'warning',
        message: `Duplicate order values among siblings of parent ${parentKey === '__root__' ? 'root' : parentKey}`,
      });
    }
  }

  return diagnostics;
}
