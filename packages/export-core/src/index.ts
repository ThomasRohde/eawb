export type { IExporter, ExportFormat, ExportOptions, ExportResult } from './types.js';
export { ExportRegistry } from './registry.js';
export { markdownExporter } from './exporters/markdown.js';
export { htmlExporter } from './exporters/html.js';
export { svgExporter } from './exporters/svg.js';

// Layout engine (ported from bcm-cli)
export { layoutTrees, buildLayoutTree, stubMeasureText } from './layout/index.js';
export type { TreeNode, FlatNode } from './layout/index.js';
export { renderSvg } from './layout/svg-renderer.js';
export {
  DEFAULT_LAYOUT_OPTIONS,
  DEFAULT_THEME,
  DEFAULT_DEPTH_COLORS,
  DEFAULT_LEAF_COLOR,
} from './layout/defaults.js';
export type {
  LayoutNode,
  LayoutResult,
  LayoutOptions,
  ThemeConfig,
  FontConfig,
  Size,
  Position,
  MeasureTextFn,
} from './layout/types.js';
