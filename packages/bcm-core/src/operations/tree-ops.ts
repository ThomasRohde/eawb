import { generateId } from '@ea-workbench/shared-schema';
import type { BcmModel } from '../schemas/model.js';
import type { BcmNode } from '../schemas/node.js';

export function addNode(
  model: BcmModel,
  input: Omit<BcmNode, 'id'>,
): { model: BcmModel; nodeId: string } {
  const id = generateId();
  const node: BcmNode = { id, ...input };
  return {
    model: { ...model, nodes: [...model.nodes, node] },
    nodeId: id,
  };
}

export function updateNode(
  model: BcmModel,
  id: string,
  patch: Partial<Omit<BcmNode, 'id'>>,
): BcmModel {
  return {
    ...model,
    nodes: model.nodes.map((n) =>
      n.id === id ? { ...n, ...patch } : n,
    ),
  };
}

export function deleteNode(
  model: BcmModel,
  id: string,
  recursive: boolean = true,
): BcmModel {
  if (!recursive) {
    return {
      ...model,
      nodes: model.nodes.filter((n) => n.id !== id),
    };
  }

  // Collect all descendant IDs
  const toDelete = new Set<string>();
  const collectDescendants = (parentId: string) => {
    toDelete.add(parentId);
    for (const node of model.nodes) {
      if (node.parent === parentId && !toDelete.has(node.id)) {
        collectDescendants(node.id);
      }
    }
  };
  collectDescendants(id);

  return {
    ...model,
    nodes: model.nodes.filter((n) => !toDelete.has(n.id)),
  };
}

export function moveNode(
  model: BcmModel,
  nodeId: string,
  newParentId: string | null,
  newOrder: number,
): BcmModel {
  return {
    ...model,
    nodes: model.nodes.map((n) =>
      n.id === nodeId
        ? { ...n, parent: newParentId, order: newOrder }
        : n,
    ),
  };
}

export function getChildren(model: BcmModel, parentId: string | null): BcmNode[] {
  return model.nodes
    .filter((n) => n.parent === parentId)
    .sort((a, b) => a.order - b.order);
}

export function getSubtree(model: BcmModel, rootId: string): BcmNode[] {
  const result: BcmNode[] = [];
  const collect = (id: string) => {
    const node = model.nodes.find((n) => n.id === id);
    if (node) {
      result.push(node);
      getChildren(model, id).forEach((child) => collect(child.id));
    }
  };
  collect(rootId);
  return result;
}

export function getAncestors(model: BcmModel, nodeId: string): BcmNode[] {
  const ancestors: BcmNode[] = [];
  let current = model.nodes.find((n) => n.id === nodeId);
  while (current && current.parent !== null) {
    const parent = model.nodes.find((n) => n.id === current!.parent);
    if (parent) {
      ancestors.push(parent);
      current = parent;
    } else {
      break;
    }
  }
  return ancestors;
}

export function reorderSiblings(
  model: BcmModel,
  parentId: string | null,
): BcmModel {
  const siblings = getChildren(model, parentId);
  const reordered = siblings.map((n, i) => ({ ...n, order: i }));
  const reorderedIds = new Set(reordered.map((n) => n.id));

  return {
    ...model,
    nodes: model.nodes.map((n) => {
      if (reorderedIds.has(n.id)) {
        return reordered.find((r) => r.id === n.id)!;
      }
      return n;
    }),
  };
}
