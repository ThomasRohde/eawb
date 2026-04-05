import { useMemo, useState, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  FlatTree,
  FlatTreeItem,
  TreeItemLayout,
  TreeItemValue,
  useHeadlessFlatTree_unstable as useHeadlessFlatTree,
  Button,
  Text,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Input,
  Spinner,
} from '@fluentui/react-components';
import {
  Add16Regular,
  Delete16Regular,
  Edit16Regular,
  MoreHorizontal16Regular,
  ReOrder16Regular,
} from '@fluentui/react-icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useModel, useAddNode, useDeleteNode, useUpdateNode, useMoveNode } from '../api/hooks.js';
import { useBcmStore } from '../store/bcm-store.js';
import { ModelSelector } from './ModelSelector.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  tree: {
    flex: 1,
    overflow: 'auto',
    padding: '4px',
  },
  empty: {
    padding: '16px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  dragHandle: {
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    color: tokens.colorNeutralForeground3,
    ':hover': {
      color: tokens.colorNeutralForeground1,
    },
  },
  dragging: {
    opacity: '0.4',
  },
  overlay: {
    padding: '4px 12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '4px',
    boxShadow: tokens.shadow16,
    fontSize: '12px',
  },
});

interface RawNode {
  id: string;
  name: string;
  parent: string | null;
  order: number;
  description: string;
}

interface FlatItem {
  value: string;
  parentValue?: string;
  name: string;
}

/** Convert flat node list to the shape useHeadlessFlatTree expects. */
function buildFlatItems(nodes: RawNode[]): FlatItem[] {
  // Sort: group by parent, then order
  const childMap = new Map<string | null, RawNode[]>();
  for (const n of nodes) {
    const siblings = childMap.get(n.parent) ?? [];
    siblings.push(n);
    childMap.set(n.parent, siblings);
  }
  for (const siblings of childMap.values()) {
    siblings.sort((a, b) => a.order - b.order);
  }

  // DFS to produce flat list in tree-walk order
  const result: FlatItem[] = [];
  function walk(parentId: string | null) {
    const children = childMap.get(parentId);
    if (!children) return;
    for (const child of children) {
      result.push({
        value: child.id,
        parentValue: parentId ?? undefined,
        name: child.name,
      });
      walk(child.id);
    }
  }
  walk(null);
  return result;
}

function SortableTreeItem({
  item,
  modelId,
  nameMap,
}: {
  item: { value: TreeItemValue; getTreeItemProps: () => any };
  modelId: string;
  nameMap: Map<string, string>;
}) {
  const styles = useStyles();
  const { selectedNodeId, selectNode } = useBcmStore();
  const addNode = useAddNode(modelId);
  const deleteNodeMut = useDeleteNode(modelId);
  const updateNode = useUpdateNode(modelId);
  const nodeName = nameMap.get(String(item.value)) ?? '';
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(nodeName);
  const isSelected = selectedNodeId === String(item.value);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(item.value),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleAddChild = () => {
    addNode.mutate({ name: 'New Capability', parent: String(item.value), order: 0 });
  };

  const handleDelete = () => {
    deleteNodeMut.mutate(String(item.value));
  };

  const handleRename = () => {
    if (editName.trim() && editName !== nodeName) {
      updateNode.mutate({ nodeId: String(item.value), name: editName.trim() });
    }
    setEditing(false);
  };

  return (
    <FlatTreeItem
      ref={setNodeRef}
      style={style}
      {...item.getTreeItemProps()}
      className={isDragging ? styles.dragging : undefined}
    >
      <TreeItemLayout
        onClick={() => selectNode(String(item.value))}
        style={{
          backgroundColor: isSelected ? tokens.colorNeutralBackground1Selected : undefined,
          borderRadius: '4px',
        }}
        iconBefore={
          <span className={styles.dragHandle} {...attributes} {...listeners}>
            <ReOrder16Regular />
          </span>
        }
        actions={
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button icon={<MoreHorizontal16Regular />} size="small" appearance="subtle" />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<Add16Regular />} onClick={handleAddChild}>
                  Add child
                </MenuItem>
                <MenuItem
                  icon={<Edit16Regular />}
                  onClick={() => {
                    setEditing(true);
                    setEditName(nodeName);
                  }}
                >
                  Rename
                </MenuItem>
                <MenuItem icon={<Delete16Regular />} onClick={handleDelete}>
                  Delete
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        }
      >
        {editing ? (
          <Input
            size="small"
            value={editName}
            onChange={(_, d) => setEditName(d.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
          />
        ) : (
          <Text size={200}>{nodeName}</Text>
        )}
      </TreeItemLayout>
    </FlatTreeItem>
  );
}

export function BcmTreeView() {
  const styles = useStyles();
  const { activeModelId, expandedNodes, toggleExpanded } = useBcmStore();
  const { data: model, isLoading } = useModel(activeModelId);
  const addNode = useAddNode(activeModelId ?? '');
  const moveNode = useMoveNode(activeModelId ?? '');
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  const flatItems = useMemo(() => {
    if (!model?.nodes) return [];
    return buildFlatItems(model.nodes);
  }, [model?.nodes]);

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of model?.nodes ?? []) m.set(n.id, n.name);
    return m;
  }, [model?.nodes]);

  const openItems = useMemo(() => expandedNodes, [expandedNodes]);

  const flatTree = useHeadlessFlatTree(flatItems, {
    openItems,
    onOpenChange: (_e, data) => {
      toggleExpanded(String(data.value));
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id || !model?.nodes) return;

      const draggedNode = model.nodes.find((n) => n.id === String(active.id));
      const overNode = model.nodes.find((n) => n.id === String(over.id));
      if (!draggedNode || !overNode) return;

      // Move dragged node to be a sibling of the over node (same parent, adjacent order)
      const newParent = overNode.parent;
      const siblings = model.nodes
        .filter((n) => n.parent === newParent && n.id !== draggedNode.id)
        .sort((a, b) => a.order - b.order);
      const overIndex = siblings.findIndex((n) => n.id === overNode.id);
      const newOrder = overIndex >= 0 ? overIndex + 1 : siblings.length;

      moveNode.mutate({
        nodeId: draggedNode.id,
        parent: newParent,
        order: newOrder,
      });
    },
    [model?.nodes, moveNode],
  );

  const draggedName = dragActiveId ? (nameMap.get(dragActiveId) ?? null) : null;

  const rootCount = useMemo(
    () => model?.nodes?.filter((n) => n.parent === null).length ?? 0,
    [model?.nodes],
  );

  const handleAddRoot = () => {
    if (!activeModelId) return;
    addNode.mutate({ name: 'New Capability', order: rootCount });
  };

  if (!activeModelId) {
    return (
      <div className={styles.root}>
        <ModelSelector />
        <div className={styles.empty}>
          <Text>Select or create a model to get started.</Text>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.root}>
        <ModelSelector />
        <div className={styles.empty}>
          <Spinner size="small" />
        </div>
      </div>
    );
  }

  const visibleItems = Array.from(flatTree.items());
  const sortableIds = visibleItems.map((item) => String(item.value));

  return (
    <div className={styles.root}>
      <ModelSelector />
      <div style={{ padding: '4px 8px' }}>
        <Button size="small" icon={<Add16Regular />} onClick={handleAddRoot}>
          Add root capability
        </Button>
      </div>
      <div className={styles.tree}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <FlatTree aria-label="Capability tree" {...flatTree.getTreeProps()}>
            {visibleItems.map((item) => (
              <SortableTreeItem
                key={String(item.value)}
                item={item as typeof item & { getTreeItemProps: () => any }}
                modelId={activeModelId}
                nameMap={nameMap}
              />
            ))}
          </FlatTree>
          <DragOverlay>
            {draggedName ? <div className={styles.overlay}>{draggedName}</div> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
