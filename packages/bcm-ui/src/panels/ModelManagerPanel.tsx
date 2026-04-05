import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Input,
  Spinner,
  MessageBar,
  MessageBarBody,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardHeader,
  Body1,
  Caption1,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Delete16Regular,
  Edit16Regular,
  ArrowDownload16Regular,
  MoreHorizontal16Regular,
  CheckmarkCircle16Regular,
} from '@fluentui/react-icons';
import { useModels, useCreateModel, useDeleteModel } from '../api/hooks.js';
import { bcmApi } from '../api/client.js';
import { useBcmStore } from '../store/bcm-store.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  card: {
    cursor: 'pointer',
    ':hover': {
      boxShadow: tokens.shadow4,
    },
  },
  activeCard: {
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.colorBrandStroke1,
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

export function BcmModelManagerPanel() {
  const styles = useStyles();
  const qc = useQueryClient();
  const { data: models, isLoading } = useModels();
  const createModel = useCreateModel();
  const deleteModel = useDeleteModel();
  const { activeModelId, setActiveModel } = useBcmStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const result = await createModel.mutateAsync({ title: newTitle.trim() });
      setActiveModel(result.id);
      setNewTitle('');
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create model');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteModel.mutateAsync(deleteTarget.id);
      if (activeModelId === deleteTarget.id) {
        setActiveModel(null);
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenameTarget(null);
      return;
    }
    try {
      await bcmApi.updateModel(id, { title: renameValue.trim() });
      setRenameTarget(null);
      qc.invalidateQueries({ queryKey: ['bcm', 'models'] });
      qc.invalidateQueries({ queryKey: ['bcm', 'model', id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename model');
    }
  };

  const handleExport = async (modelId: string, format: string, save: boolean) => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          toolId: 'bcm-studio',
          artifactId: modelId,
          save,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const blob = new Blob([data.data.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold">Models</Text>
        <Button
          icon={<Add24Regular />}
          size="small"
          appearance="primary"
          onClick={() => {
            setCreateOpen(true);
            setNewTitle('');
          }}
        >
          New
        </Button>
      </div>

      {error && (
        <MessageBar intent="warning" style={{ margin: '8px' }}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {isLoading ? (
        <div className={styles.empty}>
          <Spinner size="small" />
        </div>
      ) : !models?.length ? (
        <div className={styles.empty}>
          <Text>No models yet. Create one to get started.</Text>
        </div>
      ) : (
        <div className={styles.list}>
          {models.map((m) => (
            <Card
              key={m.id}
              size="small"
              className={`${styles.card} ${m.id === activeModelId ? styles.activeCard : ''}`}
              onClick={() => setActiveModel(m.id)}
            >
              <CardHeader
                header={
                  renameTarget === m.id ? (
                    <Input
                      size="small"
                      value={renameValue}
                      onChange={(_, d) => setRenameValue(d.value)}
                      onBlur={() => handleRename(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(m.id);
                        if (e.key === 'Escape') setRenameTarget(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <Body1>
                      <strong>{m.title}</strong>
                      {m.id === activeModelId && (
                        <CheckmarkCircle16Regular
                          style={{
                            marginLeft: 6,
                            verticalAlign: 'middle',
                            color: tokens.colorBrandForeground1,
                          }}
                        />
                      )}
                    </Body1>
                  )
                }
                description={<Caption1>{m.nodeCount} capabilities</Caption1>}
                action={
                  <Menu>
                    <MenuTrigger disableButtonEnhancement>
                      <Button
                        icon={<MoreHorizontal16Regular />}
                        size="small"
                        appearance="subtle"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem
                          icon={<Edit16Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTarget(m.id);
                            setRenameValue(m.title);
                          }}
                        >
                          Rename
                        </MenuItem>
                        <MenuItem
                          icon={<ArrowDownload16Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(m.id, 'markdown', false);
                          }}
                        >
                          Export Markdown
                        </MenuItem>
                        <MenuItem
                          icon={<ArrowDownload16Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(m.id, 'html', false);
                          }}
                        >
                          Export HTML
                        </MenuItem>
                        <MenuItem
                          icon={<Delete16Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: m.id, title: m.title });
                          }}
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                }
              />
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(_, d) => setCreateOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>New Capability Model</DialogTitle>
            <DialogContent>
              <Input
                value={newTitle}
                onChange={(_, d) => setNewTitle(d.value)}
                placeholder="e.g. Core Banking Capabilities"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
                style={{ width: '100%' }}
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleCreate} disabled={!newTitle.trim()}>
                Create
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(_, d) => {
          if (!d.open) setDeleteTarget(null);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogContent>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This cannot be
              undone.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleDelete}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
