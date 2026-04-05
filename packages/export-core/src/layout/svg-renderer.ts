import type { LayoutNode, LayoutResult, ThemeConfig } from './types.js';
import { SvgBuilder } from './svg-builder.js';

function estimateTextWidth(text: string, fontSize: number, isBold: boolean): number {
  const base = fontSize * (isBold ? 0.62 : 0.56);
  let width = 0;

  for (const ch of text) {
    if (ch === ' ') width += base * 0.55;
    else if (/[ilI.,'`:;!]/.test(ch)) width += base * 0.6;
    else if (/[MW@#%&]/.test(ch)) width += base * 1.35;
    else if (/[A-Z0-9]/.test(ch)) width += base * 1.05;
    else width += base;
  }

  return width;
}

function splitLongToken(
  token: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const ch of token) {
    const candidate = current + ch;
    if (current.length > 0 && measure(candidate) > maxWidth) {
      chunks.push(current);
      current = ch;
      if (measure(current) > maxWidth) {
        chunks.push(current);
        current = '';
      }
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks.length > 0 ? chunks : [token];
}

function truncateWithEllipsis(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string {
  const ellipsis = '...';
  if (measure(text) <= maxWidth) return text;
  if (measure(ellipsis) > maxWidth) return text.slice(0, 1);

  let value = text.trimEnd();
  while (value.length > 0 && measure(`${value}${ellipsis}`) > maxWidth) {
    value = value.slice(0, -1).trimEnd();
  }

  return value.length > 0 ? `${value}${ellipsis}` : ellipsis;
}

function wrapLabelText(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (value: string) => number,
): string[] {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return [''];
  if (measure(compact) <= maxWidth) return [compact];

  const words = compact.split(' ');
  const lines: string[] = [];
  let current = '';

  const pushWord = (word: string): void => {
    if (!current) {
      if (measure(word) <= maxWidth) {
        current = word;
        return;
      }

      const chunks = splitLongToken(word, maxWidth, measure);
      lines.push(...chunks.slice(0, -1));
      current = chunks[chunks.length - 1] ?? '';
      return;
    }

    const candidate = `${current} ${word}`;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      return;
    }

    lines.push(current);
    current = '';
    pushWord(word);
  };

  for (const word of words) {
    pushWord(word);
  }

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, Math.max(0, maxLines - 1));
  const remainder = lines.slice(Math.max(0, maxLines - 1)).join(' ');
  visible.push(truncateWithEllipsis(remainder, maxWidth, measure));
  return visible;
}

export function renderSvg(layout: LayoutResult, theme: ThemeConfig): string {
  const svg = new SvgBuilder();

  svg.rect({
    x: 0,
    y: 0,
    width: layout.totalWidth,
    height: layout.totalHeight,
    fill: theme.palette.background,
  });

  function renderNode(node: LayoutNode): void {
    const fill = node._effectiveLeaf
      ? theme.palette.leafFill
      : theme.palette.depthFills[Math.min(node.depth, theme.palette.depthFills.length - 1)];

    svg.openGroup({
      class: `bcm-node ${node._effectiveLeaf ? 'bcm-node--leaf' : 'bcm-node--parent'}`,
      'data-node-id': node.id,
      'data-node-name': node.name,
      'data-node-depth': node.depth,
    });

    svg.rect({
      x: node.position.x,
      y: node.position.y,
      width: node.size.w,
      height: node.size.h,
      rx: theme.display.cornerRadius,
      ry: theme.display.cornerRadius,
      fill,
      stroke: theme.palette.border,
      'stroke-width': theme.display.strokeWidth,
    });

    const font = node._effectiveLeaf ? theme.typography.leafFont : theme.typography.parentFont;
    const fontWeight = font.style === 'bold' ? 'bold' : 'normal';
    const fontSize = font.size;
    const fontFamily = font.name;
    const textColor = font.color || '#000000';
    const lineHeight = Math.max(fontSize * 1.2, fontSize + 1);
    const maxTextWidth = Math.max(1, node.size.w - 2 * theme.spacing.padding);
    const textBoxHeight = node._effectiveLeaf ? node.size.h : theme.spacing.headerHeight;
    const maxLines = Math.max(1, Math.floor(textBoxHeight / lineHeight));
    const measure = (text: string): number =>
      estimateTextWidth(text, fontSize, fontWeight === 'bold');
    const labelLines = wrapLabelText(node.name, maxTextWidth, maxLines, measure);
    const textY = node._effectiveLeaf
      ? node.position.y + node.size.h / 2
      : node.position.y + theme.spacing.headerHeight / 2;
    const textAttrs = {
      x: node.position.x + node.size.w / 2,
      y: textY,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-family': fontFamily,
      'font-size': fontSize,
      'font-weight': fontWeight,
      fill: textColor,
    };

    if (labelLines.length > 1) {
      svg.textLines(labelLines, textAttrs, lineHeight);
    } else {
      svg.text(labelLines[0] ?? '', textAttrs);
    }

    svg.closeGroup();

    for (const child of node.children) {
      renderNode(child);
    }
  }

  const roots = layout.nodes.filter((n) => n.depth === 0);
  for (const root of roots) {
    renderNode(root);
  }

  return svg.toString(layout.totalWidth, layout.totalHeight);
}
