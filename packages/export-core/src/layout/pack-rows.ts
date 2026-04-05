import type { LayoutNode, LayoutOptions, PackResult, RowMeta } from './types.js';

export function packRows(
  children: LayoutNode[],
  targetWidth: number,
  options: LayoutOptions,
): PackResult {
  const contentWidth = targetWidth - 2 * options.padding;
  const rows: LayoutNode[][] = [];
  let currentRow: LayoutNode[] = [];
  let currentRowWidth = 0;

  for (const child of children) {
    const needed = currentRow.length > 0 ? options.gap + child.size.w : child.size.w;
    if (currentRow.length > 0 && currentRowWidth + needed > contentWidth) {
      rows.push(currentRow);
      currentRow = [child];
      currentRowWidth = child.size.w;
    } else {
      currentRow.push(child);
      currentRowWidth += needed;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  let maxRowWidth = 0;
  let totalHeight = options.headerHeight;
  const rowMeta: RowMeta[] = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let rowWidth = 0;
    let rowHeight = 0;
    for (let j = 0; j < row.length; j++) {
      if (j > 0) rowWidth += options.gap;
      rowWidth += row[j].size.w;
      if (row[j].size.h > rowHeight) rowHeight = row[j].size.h;
    }
    if (rowWidth > maxRowWidth) maxRowWidth = rowWidth;
    if (r > 0) totalHeight += options.gap;
    totalHeight += rowHeight;
    rowMeta.push({ items: row, height: rowHeight, width: rowWidth });
  }

  return {
    w: maxRowWidth + 2 * options.padding,
    h: totalHeight + options.padding,
    rows: rowMeta,
  };
}
