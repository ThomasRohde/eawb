import { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
  MessageBar,
  MessageBarBody,
  Input,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip,
} from '@fluentui/react-components';
import {
  History24Regular,
  ArrowUpload24Regular,
  ArrowCounterclockwise16Regular,
  Add16Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  DocumentAdd16Regular,
  DocumentEdit16Regular,
  DocumentDismiss16Regular,
} from '@fluentui/react-icons';
import { apiFetch } from '../api/client.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '12px',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerTitle: {
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  entry: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  entryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  entryMessage: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  entryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '24px',
    marginTop: '2px',
  },
  hash: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  timestamp: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  files: {
    paddingLeft: '24px',
    marginTop: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  fileEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground2,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: '24px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

interface Checkpoint {
  id: string;
  message: string;
  timestamp: string;
  author: string;
}

interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
}

const FILE_STATUS_ICONS: Record<string, React.JSX.Element> = {
  added: <DocumentAdd16Regular />,
  modified: <DocumentEdit16Regular />,
  deleted: <DocumentDismiss16Regular />,
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function VersionHistoryPanel() {
  const styles = useStyles();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRemote, setHasRemote] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<Record<string, FileDiff[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const fetchCheckpoints = useCallback(async () => {
    try {
      const data = await apiFetch<Checkpoint[]>('/api/checkpoints?limit=50');
      setCheckpoints(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checkpoints');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHasRemote = useCallback(async () => {
    try {
      const data = await apiFetch<{ hasRemote: boolean }>('/api/has-remote');
      setHasRemote(data.hasRemote);
    } catch {
      // No remote available
    }
  }, []);

  useEffect(() => {
    fetchCheckpoints();
    fetchHasRemote();
  }, [fetchCheckpoints, fetchHasRemote]);

  // Listen for WebSocket events to auto-refresh
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === 'checkpoint:created' ||
          data.type === 'checkpoint:auto' ||
          data.type === 'push:complete'
        ) {
          fetchCheckpoints();
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => ws.close();
  }, [fetchCheckpoints]);

  const handleCreateCheckpoint = async () => {
    if (!commitMessage.trim()) return;
    setCreating(true);
    try {
      await apiFetch('/api/checkpoints', {
        method: 'POST',
        body: JSON.stringify({ message: commitMessage.trim() }),
      });
      setCommitMessage('');
      setDialogOpen(false);
      await fetchCheckpoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkpoint');
    } finally {
      setCreating(false);
    }
  };

  const handlePush = async () => {
    setPushing(true);
    setPushMessage(null);
    try {
      const result = await apiFetch<{ pushed: boolean; remote: string; branch: string }>(
        '/api/push',
        { method: 'POST', body: JSON.stringify({}) },
      );
      setPushMessage(`Pushed to ${result.remote}/${result.branch}`);
      setTimeout(() => setPushMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setPushing(false);
    }
  };

  const handleRestore = async (checkpointId: string) => {
    setRestoring(checkpointId);
    setConfirmRestore(null);
    try {
      await apiFetch('/api/restore', {
        method: 'POST',
        body: JSON.stringify({ checkpointId, force: true }),
      });
      await fetchCheckpoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  const toggleExpanded = async (checkpointId: string, index: number) => {
    if (expanded === checkpointId) {
      setExpanded(null);
      return;
    }
    setExpanded(checkpointId);

    if (!fileDiffs[checkpointId]) {
      // Compare with previous checkpoint (or show all files for first commit)
      const prev = checkpoints[index + 1];
      if (prev) {
        try {
          const result = await apiFetch<{ from: string; to: string; files: FileDiff[] }>(
            '/api/compare',
            {
              method: 'POST',
              body: JSON.stringify({ from: prev.id, to: checkpointId }),
            },
          );
          setFileDiffs((prev) => ({ ...prev, [checkpointId]: result.files }));
        } catch {
          // ignore
        }
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.root}>
        <Spinner size="small" label="Loading history..." />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <History24Regular />
        <Text weight="semibold" className={styles.headerTitle}>
          Version History
        </Text>
        <div className={styles.actions}>
          <Dialog open={dialogOpen} onOpenChange={(_, d) => setDialogOpen(d.open)}>
            <DialogTrigger disableButtonEnhancement>
              <Tooltip content="Create checkpoint" relationship="label">
                <Button appearance="subtle" icon={<Add16Regular />} size="small" />
              </Tooltip>
            </DialogTrigger>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>Create Checkpoint</DialogTitle>
                <DialogContent>
                  <Input
                    placeholder="Checkpoint message..."
                    value={commitMessage}
                    onChange={(_, d) => setCommitMessage(d.value)}
                    style={{ width: '100%' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCheckpoint();
                    }}
                  />
                </DialogContent>
                <DialogActions>
                  <DialogTrigger disableButtonEnhancement>
                    <Button appearance="secondary">Cancel</Button>
                  </DialogTrigger>
                  <Button
                    appearance="primary"
                    onClick={handleCreateCheckpoint}
                    disabled={creating || !commitMessage.trim()}
                  >
                    {creating ? <Spinner size="tiny" /> : 'Create'}
                  </Button>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>

          {hasRemote && (
            <Tooltip content="Push to remote" relationship="label">
              <Button
                appearance="subtle"
                icon={pushing ? <Spinner size="tiny" /> : <ArrowUpload24Regular />}
                size="small"
                onClick={handlePush}
                disabled={pushing}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {pushMessage && (
        <MessageBar intent="success">
          <MessageBarBody>{pushMessage}</MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.list}>
        {checkpoints.length === 0 ? (
          <div className={styles.empty}>
            <Text>No checkpoints yet</Text>
          </div>
        ) : (
          checkpoints.map((cp, index) => (
            <div key={cp.id} className={styles.entry}>
              <div className={styles.entryRow} onClick={() => toggleExpanded(cp.id, index)}>
                {expanded === cp.id ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
                <Text size={200} className={styles.entryMessage}>
                  {cp.message}
                </Text>
                {index > 0 && (
                  <Tooltip content="Restore to this checkpoint" relationship="label">
                    <Button
                      appearance="subtle"
                      icon={
                        restoring === cp.id ? (
                          <Spinner size="tiny" />
                        ) : (
                          <ArrowCounterclockwise16Regular />
                        )
                      }
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmRestore(cp.id);
                      }}
                      disabled={restoring !== null}
                    />
                  </Tooltip>
                )}
              </div>
              <div className={styles.entryMeta}>
                <Text className={styles.hash}>{cp.id.slice(0, 7)}</Text>
                <Text className={styles.timestamp}>{relativeTime(cp.timestamp)}</Text>
                {cp.message.startsWith('Auto-save') && (
                  <Badge appearance="outline" size="small" color="informative">
                    auto
                  </Badge>
                )}
              </div>

              {expanded === cp.id && fileDiffs[cp.id] && (
                <div className={styles.files}>
                  {fileDiffs[cp.id].map((f) => (
                    <div key={f.path} className={styles.fileEntry}>
                      {FILE_STATUS_ICONS[f.status] ?? <DocumentEdit16Regular />}
                      <span>{f.path}</span>
                      {f.additions > 0 && (
                        <span style={{ color: tokens.colorPaletteGreenForeground1 }}>
                          +{f.additions}
                        </span>
                      )}
                      {f.deletions > 0 && (
                        <span style={{ color: tokens.colorPaletteRedForeground1 }}>
                          -{f.deletions}
                        </span>
                      )}
                    </div>
                  ))}
                  {fileDiffs[cp.id].length === 0 && (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      No file changes
                    </Text>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Restore confirmation dialog */}
      <Dialog
        open={confirmRestore !== null}
        onOpenChange={(_, d) => {
          if (!d.open) setConfirmRestore(null);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Restore Checkpoint</DialogTitle>
            <DialogContent>
              <Text>
                This will restore the workspace to checkpoint{' '}
                <strong>{confirmRestore?.slice(0, 7)}</strong>. Any uncommitted changes will be
                stashed as a safety backup. Continue?
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmRestore(null)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={() => confirmRestore && handleRestore(confirmRestore)}
              >
                Restore
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
