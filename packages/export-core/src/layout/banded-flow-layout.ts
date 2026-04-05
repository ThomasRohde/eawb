import type { LayoutNode, LayoutOptions, PackResult, RowMeta } from './types.js';
import { packRows } from './pack-rows.js';
import { scoreLayout } from './score-layout.js';
import { backfillRowsWithLeaves } from './backfill.js';

function buildLayoutFromRows(rows: RowMeta[], options: LayoutOptions): PackResult {
  let maxRowWidth = 0;
  let h = options.headerHeight;
  for (let r = 0; r < rows.length; r++) {
    if (rows[r].width > maxRowWidth) maxRowWidth = rows[r].width;
    if (r > 0) h += options.gap;
    h += rows[r].height;
  }
  h += options.padding;
  return { w: maxRowWidth + 2 * options.padding, h, rows };
}

export function computeBandedFlowLayout(
  subtrees: LayoutNode[],
  leaves: LayoutNode[],
  options: LayoutOptions,
): PackResult {
  let bestLayout: PackResult | null = null;
  let bestScore = Infinity;

  const candidateWidths: number[] = [];

  for (let k = 1; k <= subtrees.length; k++) {
    let tw = 2 * options.padding;
    for (let i = 0; i < k; i++) {
      tw += subtrees[i].size.w;
      if (i > 0) tw += options.gap;
    }
    candidateWidths.push(tw);
  }

  for (let k = 1; k <= leaves.length; k++) {
    let tw = 2 * options.padding;
    for (let i = 0; i < k; i++) {
      tw += leaves[i].size.w;
      if (i > 0) tw += options.gap;
    }
    candidateWidths.push(tw);
  }

  for (const targetW of candidateWidths) {
    const stResult = packRows(subtrees, targetW, options);
    const clonedRows: RowMeta[] = stResult.rows.map((r) => ({
      items: [...r.items],
      height: r.height,
      width: r.width,
      placements: r.placements ? [...r.placements] : undefined,
    }));
    const remainingLeaves = backfillRowsWithLeaves(
      clonedRows,
      [...leaves],
      targetW - 2 * options.padding,
      options,
    );

    let layout: PackResult;
    if (remainingLeaves.length > 0) {
      const lfResult = packRows(remainingLeaves, targetW, options);
      layout = buildLayoutFromRows([...clonedRows, ...lfResult.rows], options);
    } else {
      layout = buildLayoutFromRows(clonedRows, options);
    }

    const score = scoreLayout(layout, options);
    if (score < bestScore) {
      bestScore = score;
      bestLayout = layout;
    }
  }

  return bestLayout!;
}
