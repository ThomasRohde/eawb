import { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Input,
  Textarea,
  Label,
  Divider,
  Badge,
} from '@fluentui/react-components';
import { useModel, useUpdateNode } from '../api/hooks.js';
import { useBcmStore } from '../store/bcm-store.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'auto',
  },
  header: {
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  form: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  meta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
});

export function BcmInspector() {
  const styles = useStyles();
  const { activeModelId, selectedNodeId } = useBcmStore();
  const { data: model } = useModel(activeModelId);
  const updateNode = useUpdateNode(activeModelId ?? '');

  const node = model?.nodes.find((n: any) => n.id === selectedNodeId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (node) {
      setName(node.name);
      setDescription(node.description ?? '');
    }
  }, [node?.id, node?.name, node?.description]);

  const save = useCallback(() => {
    if (!activeModelId || !selectedNodeId || !node) return;
    const changes: any = {};
    if (name !== node.name) changes.name = name;
    if (description !== (node.description ?? '')) changes.description = description;
    if (Object.keys(changes).length > 0) {
      updateNode.mutate({ nodeId: selectedNodeId, ...changes });
    }
  }, [activeModelId, selectedNodeId, node, name, description, updateNode]);

  // Debounced save
  useEffect(() => {
    if (!node) return;
    const timer = setTimeout(save, 500);
    return () => clearTimeout(timer);
  }, [name, description]);

  if (!activeModelId) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <Text>No model selected</Text>
        </div>
      </div>
    );
  }

  if (!selectedNodeId || !node) {
    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <Text weight="semibold">{model?.header.title ?? 'Model'}</Text>
        </div>
        <div className={styles.empty}>
          <Text>Select a node to inspect</Text>
        </div>
      </div>
    );
  }

  const ancestors = getAncestorNames(model?.nodes ?? [], node.id);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold">Inspector</Text>
      </div>
      <div className={styles.form}>
        {ancestors.length > 0 && (
          <div className={styles.meta}>
            {ancestors.map((a, i) => (
              <Badge key={i} appearance="outline" size="small">
                {a}
              </Badge>
            ))}
          </div>
        )}

        <div className={styles.field}>
          <Label htmlFor="node-name" size="small">Name</Label>
          <Input
            id="node-name"
            value={name}
            onChange={(_, d) => setName(d.value)}
          />
        </div>

        <div className={styles.field}>
          <Label htmlFor="node-desc" size="small">Description</Label>
          <Textarea
            id="node-desc"
            value={description}
            onChange={(_, d) => setDescription(d.value)}
            rows={4}
            placeholder="Describe the scope and boundaries of this capability..."
          />
        </div>

        <Divider />

        <div className={styles.field}>
          <Label size="small">ID</Label>
          <Text size={200} font="monospace" style={{ color: tokens.colorNeutralForeground3 }}>
            {node.id}
          </Text>
        </div>
      </div>
    </div>
  );
}

function getAncestorNames(nodes: any[], nodeId: string): string[] {
  const names: string[] = [];
  let current = nodes.find((n: any) => n.id === nodeId);
  while (current?.parent) {
    const parent = nodes.find((n: any) => n.id === current.parent);
    if (parent) {
      names.unshift(parent.name);
      current = parent;
    } else break;
  }
  return names;
}
