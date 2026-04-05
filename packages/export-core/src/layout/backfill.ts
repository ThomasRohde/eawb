import type { LayoutNode, LayoutOptions, RowMeta } from './types.js';

export function ensureRowPlacements(row: RowMeta, options: LayoutOptions): void {
  if (row.placements && row.placements.length > 0) return;
  row.placements = [];
  let x = 0;
  for (const item of row.items) {
    row.placements.push({ item, x, y: 0 });
    x += item.size.w + options.gap;
  }
}

export function backfillRowsWithLeaves(
  rows: RowMeta[],
  leaves: LayoutNode[],
  contentWidth: number,
  options: LayoutOptions,
): LayoutNode[] {
  if (leaves.length === 0) return [];

  let leafIdx = 0;
  const leafW = leaves[0].size.w;
  const leafH = leaves[0].size.h;

  for (let r = rows.length - 1; r >= 0 && leafIdx < leaves.length; r--) {
    const row = rows[r];
    const startX = row.width + (row.items.length > 0 ? options.gap : 0);
    const availableWidth = contentWidth - startX;
    if (availableWidth < leafW) continue;

    const maxCols = Math.floor((availableWidth + options.gap) / (leafW + options.gap));
    if (maxCols <= 0) continue;

    const maxRowsPerCol = Math.floor((row.height + options.gap) / (leafH + options.gap));
    if (maxRowsPerCol <= 0) continue;

    const capacity = maxCols * maxRowsPerCol;
    const placeCount = Math.min(capacity, leaves.length - leafIdx);
    if (placeCount <= 0) continue;

    ensureRowPlacements(row, options);

    for (let p = 0; p < placeCount; p++) {
      const col = Math.floor(p / maxRowsPerCol);
      const stackRow = p % maxRowsPerCol;
      const leaf = leaves[leafIdx++];

      const px = startX + col * (leafW + options.gap);
      const py = stackRow * (leafH + options.gap);

      row.placements!.push({ item: leaf, x: px, y: py });
      row.items.push(leaf);

      const right = px + leaf.size.w;
      const bottom = py + leaf.size.h;
      if (right > row.width) row.width = right;
      if (bottom > row.height) row.height = bottom;
    }
  }

  return leafIdx < leaves.length ? leaves.slice(leafIdx) : [];
}
