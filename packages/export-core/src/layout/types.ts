// Layout types adapted from bcm-cli

export interface Size {
  w: number;
  h: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Placement {
  item: LayoutNode;
  x: number;
  y: number;
}

export interface RowMeta {
  items: LayoutNode[];
  height: number;
  width: number;
  placements?: Placement[];
}

export interface LayoutNode {
  id: string;
  name: string;
  description?: string;
  children: LayoutNode[];
  size: Size;
  rows: RowMeta[];
  position: Position;
  depth: number;
  _effectiveLeaf: boolean;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  totalWidth: number;
  totalHeight: number;
  leafSize: Size;
}

export interface PackResult {
  w: number;
  h: number;
  rows: RowMeta[];
}

export interface LayoutOptions {
  gap: number;
  padding: number;
  headerHeight: number;
  rootGap: number;
  viewMargin: number;
  aspectRatio: number;
  alignment: 'left' | 'center' | 'right';
  maxDepth: number; // -1 = all
  sortMode: 'subtrees' | 'alphabetical';
  minLeafWidth: number;
  maxLeafWidth: number;
  leafHeight: number;
}

export interface FontConfig {
  name: string;
  size: number;
  style: string;
  color: string | null;
}

export interface ThemeConfig {
  palette: {
    background: string;
    leafFill: string;
    depthFills: string[];
    border: string;
  };
  typography: {
    parentFont: FontConfig;
    leafFont: FontConfig;
  };
  spacing: {
    gap: number;
    padding: number;
    headerHeight: number;
    rootGap: number;
    viewMargin: number;
    minLeafWidth: number;
    maxLeafWidth: number;
    leafHeight: number;
  };
  display: {
    cornerRadius: number;
    strokeWidth: number;
  };
}

export type MeasureTextFn = (text: string) => number;
