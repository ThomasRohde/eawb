import type { LayoutNode, LayoutOptions, LayoutResult, MeasureTextFn } from './types.js';
import { computeUniformLeafSize } from './leaf-sizing.js';
import { calculateSize } from './calculate-size.js';
import { positionRoots } from './position.js';

/** Tree-shaped input node (what bcm-cli uses internally). */
export interface TreeNode {
  id: string;
  name: string;
  description?: string;
  children: TreeNode[];
}

/** Flat BcmNode as stored in EA Workbench. */
export interface FlatNode {
  id: string;
  name: string;
  description?: string;
  parent: string | null;
  order: number;
}

/** Convert a flat node list to a tree of TreeNodes. */
export function buildLayoutTree(flat: FlatNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const n of flat) {
    map.set(n.id, { id: n.id, name: n.name, description: n.description, children: [] });
  }

  // Sort by order so children appear in correct sequence
  const sorted = [...flat].sort((a, b) => a.order - b.order);

  for (const n of sorted) {
    const tn = map.get(n.id)!;
    if (n.parent === null) {
      roots.push(tn);
    } else {
      map.get(n.parent)?.children.push(tn);
    }
  }

  return roots;
}

function toLayoutNode(tree: TreeNode): LayoutNode {
  return {
    id: tree.id,
    name: tree.name,
    description: tree.description,
    children: tree.children.map(toLayoutNode),
    size: { w: 0, h: 0 },
    rows: [],
    position: { x: 0, y: 0 },
    depth: 0,
    _effectiveLeaf: false,
  };
}

function collectAllNodes(node: LayoutNode): LayoutNode[] {
  const result: LayoutNode[] = [node];
  for (const child of node.children) {
    result.push(...collectAllNodes(child));
  }
  return result;
}

/** Stub text measurer (no font file needed). ~7px per character. */
export function stubMeasureText(text: string): number {
  return text.length * 7;
}

/**
 * Run the full 3-phase layout pipeline.
 * Accepts either pre-built TreeNodes or flat BcmNodes.
 */
export function layoutTrees(
  roots: TreeNode[],
  options: LayoutOptions,
  measureText: MeasureTextFn = stubMeasureText,
): LayoutResult {
  const layoutRoots = roots.map(toLayoutNode);

  // Phase 1: Uniform leaf sizing
  const { leafWidth, leafHeight } = computeUniformLeafSize(layoutRoots, options, measureText);

  // Phase 2: Bottom-up size computation
  for (const root of layoutRoots) {
    calculateSize(root, 0, leafWidth, leafHeight, options);
  }

  // Phase 3: Top-down positioning
  positionRoots(layoutRoots, options);

  // Compute total dimensions
  let totalWidth = 0;
  let totalHeight = 0;
  for (const root of layoutRoots) {
    const right = root.position.x + root.size.w;
    const bottom = root.position.y + root.size.h;
    if (right > totalWidth) totalWidth = right;
    if (bottom > totalHeight) totalHeight = bottom;
  }
  totalWidth += options.viewMargin;
  totalHeight += options.viewMargin;

  const allNodes: LayoutNode[] = [];
  for (const root of layoutRoots) {
    allNodes.push(...collectAllNodes(root));
  }

  return {
    nodes: allNodes,
    totalWidth,
    totalHeight,
    leafSize: { w: leafWidth, h: leafHeight },
  };
}
