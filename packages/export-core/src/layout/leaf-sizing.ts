import type { LayoutNode, LayoutOptions, MeasureTextFn } from './types.js';

export function computeUniformLeafSize(
  roots: LayoutNode[],
  options: LayoutOptions,
  measureText: MeasureTextFn,
): { leafWidth: number; leafHeight: number } {
  let maxLeafTextWidth = 0;

  function findMaxLeafWidth(node: LayoutNode, depth: number): void {
    const isEffectiveLeaf =
      node.children.length === 0 || (options.maxDepth !== -1 && depth >= options.maxDepth);

    if (isEffectiveLeaf) {
      const tw = measureText(node.name);
      if (tw > maxLeafTextWidth) maxLeafTextWidth = tw;
      return;
    }
    for (const child of node.children) {
      findMaxLeafWidth(child, depth + 1);
    }
  }

  for (const root of roots) {
    findMaxLeafWidth(root, 0);
  }

  const leafWidth = Math.max(
    options.minLeafWidth,
    Math.min(maxLeafTextWidth + 2 * options.padding + 10, options.maxLeafWidth),
  );

  return { leafWidth, leafHeight: options.leafHeight };
}
