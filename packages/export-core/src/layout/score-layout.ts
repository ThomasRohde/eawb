import type { PackResult, LayoutOptions } from './types.js';

export function scoreLayout(layout: PackResult, options: LayoutOptions): number {
  if (layout.rows.length === 0) return Infinity;

  const aspect = layout.w / layout.h;
  const ratioPenalty = Math.abs(aspect - options.aspectRatio);

  let totalChildArea = 0;
  for (const row of layout.rows) {
    for (const item of row.items) {
      totalChildArea += item.size.w * item.size.h;
    }
  }
  const containerArea = layout.w * layout.h;
  const wastedFraction = 1 - totalChildArea / containerArea;

  const maxW = layout.w - 2 * options.padding;
  let varianceSum = 0;
  for (const row of layout.rows) {
    const fill = maxW > 0 ? row.width / maxW : 1;
    varianceSum += (1 - fill) * (1 - fill);
  }
  const rowVariance = Math.sqrt(varianceSum / layout.rows.length);

  let heightVarianceSum = 0;
  let heightVarianceRows = 0;
  for (const row of layout.rows) {
    if (row.items.length > 1) {
      let hasLeaf = false;
      let hasSubtree = false;
      let maxH = 0,
        minH = Infinity;
      for (const item of row.items) {
        if (item.size.h > maxH) maxH = item.size.h;
        if (item.size.h < minH) minH = item.size.h;
        if (item._effectiveLeaf) hasLeaf = true;
        else hasSubtree = true;
      }
      if (hasLeaf && hasSubtree) continue;
      if (maxH > 0) {
        heightVarianceSum += (maxH - minH) / maxH;
        heightVarianceRows++;
      }
    }
  }
  const heightVariance = heightVarianceRows > 0 ? heightVarianceSum / heightVarianceRows : 0;

  let lastRowPenalty = 0;
  if (layout.rows.length > 1) {
    const lastW = layout.rows[layout.rows.length - 1].width;
    const firstW = layout.rows[0].width;
    if (firstW > 0) {
      lastRowPenalty = Math.max(0, 1 - lastW / firstW) * 0.5;
    }
  }

  return (
    ratioPenalty * 3.0 +
    wastedFraction * 2.0 +
    rowVariance * 1.5 +
    heightVariance * 2.5 +
    lastRowPenalty * 1.0
  );
}
