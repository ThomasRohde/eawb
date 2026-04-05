import { useMemo, useRef, useState, useCallback } from 'react';
import { makeStyles, tokens, Text, Spinner } from '@fluentui/react-components';
import { useModel } from '../api/hooks.js';
import { useBcmStore } from '../store/bcm-store.js';
import type { LayoutNode, LayoutResult } from '@ea-workbench/export-core';
import {
  buildLayoutTree,
  layoutTrees,
  DEFAULT_LAYOUT_OPTIONS,
  DEFAULT_DEPTH_COLORS,
  DEFAULT_LEAF_COLOR,
} from '@ea-workbench/export-core';

const useStyles = makeStyles({
  root: {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  canvas: {
    position: 'absolute',
    transformOrigin: '0 0',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3,
  },
});

const PARENT_FONT = '13px bold "Segoe UI", system-ui, sans-serif';
const LEAF_FONT = '11px "Segoe UI", system-ui, sans-serif';

function renderNodeBox(
  node: LayoutNode,
  selectedNodeId: string | null,
  onSelect: (id: string) => void,
): React.JSX.Element {
  const isLeaf = node._effectiveLeaf;
  const fill = isLeaf
    ? DEFAULT_LEAF_COLOR
    : DEFAULT_DEPTH_COLORS[Math.min(node.depth, DEFAULT_DEPTH_COLORS.length - 1)];
  const isSelected = node.id === selectedNodeId;

  return (
    <g key={node.id}>
      <rect
        x={node.position.x}
        y={node.position.y}
        width={node.size.w}
        height={node.size.h}
        rx={4}
        ry={4}
        fill={fill}
        stroke={isSelected ? tokens.colorBrandStroke1 : '#CCCCCC'}
        strokeWidth={isSelected ? 2 : 1}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
      />
      {(() => {
        const fontSize = isLeaf ? 11 : 13;
        const lines = wrapText(node.name, node.size.w - 16, fontSize);
        const lineHeight = fontSize * 1.3;
        const cx = node.position.x + node.size.w / 2;
        const baseY = isLeaf
          ? node.position.y + node.size.h / 2 - ((lines.length - 1) * lineHeight) / 2
          : node.position.y + 24;
        return (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              font: isLeaf ? LEAF_FONT : PARENT_FONT,
              fill: '#000000',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {lines.map((line, i) => (
              <tspan key={i} x={cx} y={baseY + i * lineHeight}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })()}
      {node.children.map((child) => renderNodeBox(child, selectedNodeId, onSelect))}
    </g>
  );
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.58;
  const maxChars = Math.max(1, Math.floor(maxWidth / avgCharWidth));
  if (text.length <= maxChars) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function BcmMapPanel() {
  const styles = useStyles();
  const { activeModelId, selectedNodeId, selectNode } = useBcmStore();
  const { data: model, isLoading } = useModel(activeModelId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const layout: LayoutResult | null = useMemo(() => {
    if (!model?.nodes || model.nodes.length === 0) return null;
    const roots = buildLayoutTree(model.nodes);
    if (roots.length === 0) return null;
    return layoutTrees(roots, DEFAULT_LAYOUT_OPTIONS);
  }, [model?.nodes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(3, Math.max(0.15, s * delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setPan({
        x: dragStart.current.panX + (e.clientX - dragStart.current.x),
        y: dragStart.current.panY + (e.clientY - dragStart.current.y),
      });
    },
    [dragging],
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  if (!activeModelId) {
    return (
      <div className={styles.empty}>
        <Text>Select a model</Text>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className={styles.empty}>
        <Spinner size="small" />
      </div>
    );
  }
  if (!layout) {
    return (
      <div className={styles.empty}>
        <Text>No capabilities yet. Add some in the tree view.</Text>
      </div>
    );
  }

  const roots = layout.nodes.filter((n) => n.depth === 0);

  return (
    <div
      className={styles.root}
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className={styles.canvas}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        <svg
          width={layout.totalWidth}
          height={layout.totalHeight}
          viewBox={`0 0 ${layout.totalWidth} ${layout.totalHeight}`}
          style={{ display: 'block' }}
        >
          {/* Background */}
          <rect
            width={layout.totalWidth}
            height={layout.totalHeight}
            fill={tokens.colorNeutralBackground3}
          />
          {/* Render nodes from roots to get proper nesting order */}
          {roots.map((root) => renderNodeBox(root, selectedNodeId, selectNode))}
        </svg>
      </div>
    </div>
  );
}
