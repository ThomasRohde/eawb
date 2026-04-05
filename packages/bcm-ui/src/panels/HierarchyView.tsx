import { useMemo, useRef, useState, useCallback } from 'react';
import { makeStyles, tokens, Text, Spinner } from '@fluentui/react-components';
import { useModel } from '../api/hooks.js';
import { useBcmStore } from '../store/bcm-store.js';

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
  node: {
    position: 'absolute',
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    userSelect: 'none',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'box-shadow 0.15s',
    ':hover': {
      boxShadow: tokens.shadow4,
    },
  },
  selected: {
    borderTopColor: tokens.colorBrandStroke1,
    borderRightColor: tokens.colorBrandStroke1,
    borderBottomColor: tokens.colorBrandStroke1,
    borderLeftColor: tokens.colorBrandStroke1,
    boxShadow: tokens.shadow8,
    backgroundColor: tokens.colorBrandBackground2,
  },
  connector: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3,
  },
});

interface LayoutNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId: string | null;
  depth: number;
}

const NODE_PAD_X = 24; // horizontal padding inside node
const NODE_PAD_Y = 16; // vertical padding inside node
const MIN_NODE_W = 80;
const NODE_H = 40;
const H_GAP = 20;
const V_GAP = 60;
const FONT = '12px "Segoe UI", system-ui, sans-serif';

/** Estimate text width using a shared offscreen canvas. */
let _ctx: CanvasRenderingContext2D | null = null;
function measureText(text: string): number {
  if (!_ctx) {
    const canvas = document.createElement('canvas');
    _ctx = canvas.getContext('2d')!;
    _ctx.font = FONT;
  }
  return Math.ceil(_ctx.measureText(text).width);
}

function layoutTree(nodes: any[]): LayoutNode[] {
  if (nodes.length === 0) return [];

  interface TNode {
    id: string;
    name: string;
    parent: string | null;
    order: number;
    children: TNode[];
  }
  const map = new Map<string, TNode>();
  const roots: TNode[] = [];

  for (const n of nodes) map.set(n.id, { ...n, children: [] });
  for (const n of nodes) {
    const tn = map.get(n.id)!;
    if (n.parent === null) roots.push(tn);
    else map.get(n.parent)?.children.push(tn);
  }
  const sort = (arr: TNode[]) => {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);

  // Pre-measure widths
  const widths = new Map<string, number>();
  for (const n of nodes) {
    widths.set(n.id, Math.max(MIN_NODE_W, measureText(n.name) + NODE_PAD_X));
  }

  const layouts: LayoutNode[] = [];
  let xCursor = 0;

  function place(node: TNode, depth: number): { minX: number; maxX: number } {
    const w = widths.get(node.id)!;
    if (node.children.length === 0) {
      const x = xCursor;
      xCursor += w + H_GAP;
      layouts.push({
        id: node.id,
        name: node.name,
        x,
        y: depth * (NODE_H + V_GAP),
        width: w,
        height: NODE_H,
        parentId: node.parent,
        depth,
      });
      return { minX: x, maxX: x + w };
    }

    const childBounds = node.children.map((c) => place(c, depth + 1));
    const minX = childBounds[0].minX;
    const maxX = childBounds[childBounds.length - 1].maxX;
    const x = (minX + maxX) / 2 - w / 2;
    layouts.push({
      id: node.id,
      name: node.name,
      x,
      y: depth * (NODE_H + V_GAP),
      width: w,
      height: NODE_H,
      parentId: node.parent,
      depth,
    });
    return { minX, maxX };
  }

  for (const root of roots) {
    place(root, 0);
  }

  return layouts;
}

export function BcmHierarchyView() {
  const styles = useStyles();
  const { activeModelId, selectedNodeId, selectNode } = useBcmStore();
  const { data: model, isLoading } = useModel(activeModelId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const layout = useMemo(() => {
    if (!model?.nodes) return [];
    return layoutTree(model.nodes);
  }, [model?.nodes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(3, Math.max(0.2, s * delta)));
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
  if (layout.length === 0) {
    return (
      <div className={styles.empty}>
        <Text>No capabilities yet. Add some in the tree view.</Text>
      </div>
    );
  }

  const nodeMap = new Map(layout.map((n) => [n.id, n]));

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
        {/* Connectors */}
        <svg
          className={styles.connector}
          style={{
            width: Math.max(...layout.map((n) => n.x + n.width)) + 100,
            height: Math.max(...layout.map((n) => n.y + n.height)) + 100,
          }}
        >
          {layout
            .filter((n) => n.parentId)
            .map((n) => {
              const parent = nodeMap.get(n.parentId!);
              if (!parent) return null;
              const x1 = parent.x + parent.width / 2;
              const y1 = parent.y + parent.height;
              const x2 = n.x + n.width / 2;
              const y2 = n.y;
              const midY = (y1 + y2) / 2;
              return (
                <path
                  key={`${n.parentId}-${n.id}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke={tokens.colorNeutralStroke1}
                  strokeWidth="1.5"
                />
              );
            })}
        </svg>

        {/* Nodes */}
        {layout.map((n) => {
          const depthColors = [
            tokens.colorBrandBackground,
            tokens.colorPaletteBlueBackground2,
            tokens.colorPaletteTealBackground2,
            tokens.colorPaletteGreenBackground2,
          ];
          const bgColor = n.id === selectedNodeId ? tokens.colorBrandBackground2 : undefined;
          const borderLeft = `3px solid ${depthColors[n.depth % depthColors.length]}`;

          return (
            <div
              key={n.id}
              className={`${styles.node} ${n.id === selectedNodeId ? styles.selected : ''}`}
              style={{
                left: n.x,
                top: n.y,
                width: n.width,
                height: n.height,
                backgroundColor: bgColor,
                borderLeft,
              }}
              onClick={(e) => {
                e.stopPropagation();
                selectNode(n.id);
              }}
            >
              <Text size={200} wrap={false}>
                {n.name}
              </Text>
            </div>
          );
        })}
      </div>
    </div>
  );
}
