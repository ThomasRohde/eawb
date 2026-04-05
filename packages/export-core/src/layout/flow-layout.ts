import type { LayoutNode, LayoutOptions, PackResult } from './types.js';
import { packRows } from './pack-rows.js';
import { scoreLayout } from './score-layout.js';

export function computeFlowLayout(children: LayoutNode[], options: LayoutOptions): PackResult {
  if (children.length === 0) {
    return { w: 2 * options.padding, h: options.headerHeight + options.padding, rows: [] };
  }
  if (children.length === 1) {
    return {
      w: children[0].size.w + 2 * options.padding,
      h: children[0].size.h + options.headerHeight + options.padding,
      rows: [{ items: [children[0]], height: children[0].size.h, width: children[0].size.w }],
    };
  }

  let bestLayout: PackResult | null = null;
  let bestScore = Infinity;

  for (let k = 1; k <= children.length; k++) {
    let targetW = 2 * options.padding;
    for (let i = 0; i < k; i++) {
      targetW += children[i].size.w;
      if (i > 0) targetW += options.gap;
    }
    const layout = packRows(children, targetW, options);
    const score = scoreLayout(layout, options);
    if (score < bestScore) {
      bestScore = score;
      bestLayout = layout;
    }
  }

  return bestLayout!;
}
