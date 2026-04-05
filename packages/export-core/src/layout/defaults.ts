import type { LayoutOptions, ThemeConfig, FontConfig } from './types.js';

export const DEFAULT_PARENT_FONT: FontConfig = {
  name: 'Segoe UI',
  size: 13,
  style: 'bold',
  color: null,
};

export const DEFAULT_LEAF_FONT: FontConfig = {
  name: 'Segoe UI',
  size: 11,
  style: '',
  color: null,
};

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  gap: 8,
  padding: 12,
  headerHeight: 48,
  rootGap: 30,
  viewMargin: 20,
  aspectRatio: 1.6,
  alignment: 'center',
  maxDepth: -1,
  sortMode: 'subtrees',
  minLeafWidth: 120,
  maxLeafWidth: 200,
  leafHeight: 55,
};

export const DEFAULT_DEPTH_COLORS: string[] = [
  '#D6E4F0', // Level 0: light blue
  '#D9EAD3', // Level 1: light green
  '#E1D5E7', // Level 2: light lavender
  '#FCE5CD', // Level 3: light peach
  '#FFF2CC', // Level 4: light yellow
  '#F4CCCC', // Level 5: light pink
];

export const DEFAULT_LEAF_COLOR = '#E8E8E8';

export const DEFAULT_THEME: ThemeConfig = {
  palette: {
    background: '#FFFFFF',
    leafFill: DEFAULT_LEAF_COLOR,
    depthFills: DEFAULT_DEPTH_COLORS,
    border: '#CCCCCC',
  },
  typography: {
    parentFont: DEFAULT_PARENT_FONT,
    leafFont: DEFAULT_LEAF_FONT,
  },
  spacing: {
    gap: DEFAULT_LAYOUT_OPTIONS.gap,
    padding: DEFAULT_LAYOUT_OPTIONS.padding,
    headerHeight: DEFAULT_LAYOUT_OPTIONS.headerHeight,
    rootGap: DEFAULT_LAYOUT_OPTIONS.rootGap,
    viewMargin: DEFAULT_LAYOUT_OPTIONS.viewMargin,
    minLeafWidth: DEFAULT_LAYOUT_OPTIONS.minLeafWidth,
    maxLeafWidth: DEFAULT_LAYOUT_OPTIONS.maxLeafWidth,
    leafHeight: DEFAULT_LAYOUT_OPTIONS.leafHeight,
  },
  display: {
    cornerRadius: 4,
    strokeWidth: 1,
  },
};
