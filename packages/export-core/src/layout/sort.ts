import type { LayoutNode, LayoutOptions } from './types.js';

export function sortChildren(children: LayoutNode[], sortMode: LayoutOptions['sortMode']): void {
  if (sortMode === 'subtrees') {
    children.sort((a, b) => {
      if (a._effectiveLeaf !== b._effectiveLeaf) return a._effectiveLeaf ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  } else {
    children.sort((a, b) => a.name.localeCompare(b.name));
  }
}
