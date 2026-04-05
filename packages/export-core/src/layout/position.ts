import type { LayoutNode, LayoutOptions } from './types.js';

export function positionRoots(roots: LayoutNode[], options: LayoutOptions): void {
  let cursorX = options.viewMargin;
  for (const root of roots) {
    root.position = { x: cursorX, y: options.viewMargin };
    root.depth = 0;
    positionChildren(root, options);
    cursorX += root.size.w + options.rootGap;
  }
}

function positionChildren(node: LayoutNode, options: LayoutOptions): void {
  if (node._effectiveLeaf) return;

  let y = options.headerHeight;
  for (const row of node.rows) {
    let rowOffsetX = 0;
    if (options.alignment === 'center') {
      rowOffsetX = Math.max(0, (node.size.w - 2 * options.padding - row.width) / 2);
    } else if (options.alignment === 'right') {
      rowOffsetX = Math.max(0, node.size.w - 2 * options.padding - row.width);
    }

    if (row.placements && row.placements.length > 0) {
      for (const placement of row.placements) {
        placement.item.position = {
          x: node.position.x + options.padding + rowOffsetX + placement.x,
          y: node.position.y + y + placement.y,
        };
        placement.item.depth = node.depth + 1;
        positionChildren(placement.item, options);
      }
    } else {
      let x = options.padding + rowOffsetX;
      for (const child of row.items) {
        child.position = {
          x: node.position.x + x,
          y: node.position.y + y,
        };
        child.depth = node.depth + 1;
        positionChildren(child, options);
        x += child.size.w + options.gap;
      }
    }

    y += row.height + options.gap;
  }
}
