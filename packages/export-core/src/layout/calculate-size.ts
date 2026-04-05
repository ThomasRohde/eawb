import type { LayoutNode, LayoutOptions } from './types.js';
import { computeFlowLayout } from './flow-layout.js';
import { computeBandedFlowLayout } from './banded-flow-layout.js';
import { sortChildren } from './sort.js';

export function calculateSize(
  node: LayoutNode,
  depth: number,
  leafWidth: number,
  leafHeight: number,
  options: LayoutOptions,
): void {
  const isEffectiveLeaf =
    node.children.length === 0 || (options.maxDepth !== -1 && depth >= options.maxDepth);

  if (isEffectiveLeaf) {
    node.size = { w: leafWidth, h: leafHeight };
    node.rows = [];
    node._effectiveLeaf = true;
    return;
  }

  node._effectiveLeaf = false;

  for (const child of node.children) {
    calculateSize(child, depth + 1, leafWidth, leafHeight, options);
  }

  sortChildren(node.children, options.sortMode);

  const subtrees: LayoutNode[] = [];
  const leaves: LayoutNode[] = [];
  for (const child of node.children) {
    if (child._effectiveLeaf) {
      leaves.push(child);
    } else {
      subtrees.push(child);
    }
  }

  let layout;
  if (subtrees.length > 0 && leaves.length > 0) {
    layout = computeBandedFlowLayout(subtrees, leaves, options);
  } else {
    layout = computeFlowLayout(node.children, options);
  }

  node.size = { w: layout.w, h: layout.h };
  node.rows = layout.rows;
}
