import type { BcmHeader } from './header.js';
import type { BcmNode } from './node.js';

export interface BcmModel {
  header: BcmHeader;
  nodes: BcmNode[];
}

export interface BcmTreeNode extends BcmNode {
  children: BcmTreeNode[];
}

export function buildTree(model: BcmModel): BcmTreeNode[] {
  const nodeMap = new Map<string, BcmTreeNode>();
  const roots: BcmTreeNode[] = [];

  for (const node of model.nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  for (const node of model.nodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parent === null) {
      roots.push(treeNode);
    } else {
      const parent = nodeMap.get(node.parent);
      if (parent) {
        parent.children.push(treeNode);
      }
    }
  }

  const sortChildren = (nodes: BcmTreeNode[]): void => {
    nodes.sort((a, b) => a.order - b.order);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };

  sortChildren(roots);
  return roots;
}
