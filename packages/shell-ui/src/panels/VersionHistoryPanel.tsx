import { useState, useEffect, useCallback, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
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
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuPopover,
  MenuButton,
  Card,
  CardHeader,
} from '@fluentui/react-components';
import {
  History24Regular,
  ArrowSync24Regular,
  ArrowUpload16Regular,
  ArrowDownload16Regular,
  ArrowSync16Regular,
  ArrowCounterclockwise16Regular,
  Add16Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  DocumentAdd16Regular,
  DocumentEdit16Regular,
  DocumentDismiss16Regular,
  Link16Regular,
  Delete16Regular,
  CloudArrowUp24Regular,
  MoreHorizontal16Regular,
} from '@fluentui/react-icons';
import { apiFetch, ApiError } from '../api/client.js';

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
  remoteCard: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '4px',
  },
  remoteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  remoteUrl: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  remoteActions: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  emptyRemote: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-start',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '4px',
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
  syncSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '4px',
  },
  syncStep: {
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  conflictList: {
    margin: '4px 0 0 0',
    paddingLeft: '20px',
    fontFamily: 'monospace',
    fontSize: '11px',
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

interface RemoteStatus {
  hasRemote: boolean;
  remote: string | null;
  remoteUrl: string | null;
  branch: string | null;
  upstream: string | null;
  hasUpstream: boolean;
  ahead: number;
  behind: number;
  diverged: boolean;
  lastFetchedAt: string | null;
}

interface SyncStepResult {
  step: 'checkpoint' | 'fetch' | 'pull' | 'push';
  status: 'ok' | 'skipped' | 'failed';
  durationMs: number;
  detail?: unknown;
  errorCode?: string;
  errorMessage?: string;
}

interface SyncResponse {
  ok: boolean;
  steps: SyncStepResult[];
  finalStatus: RemoteStatus;
  conflictedFiles?: string[];
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

function truncateMiddle(s: string, max: number = 48): string {
  if (s.length <= max) return s;
  const head = Math.floor((max - 3) / 2);
  const tail = max - 3 - head;
  return `${s.slice(0, head)}...${s.slice(s.length - tail)}`;
}

type BadgeColor = 'success' | 'informative' | 'warning' | 'danger' | 'subtle';

function statusBadge(status: RemoteStatus): { label: string; color: BadgeColor } {
  if (!status.hasRemote) return { label: 'No remote', color: 'subtle' };
  if (!status.hasUpstream) return { label: 'Not published', color: 'informative' };
  if (status.diverged) return { label: 'Diverged', color: 'danger' };
  if (status.ahead > 0) return { label: `Ahead ${status.ahead}`, color: 'informative' };
  if (status.behind > 0) return { label: `Behind ${status.behind}`, color: 'warning' };
  return { label: 'Synced', color: 'success' };
}

function isAuthError(code?: string): boolean {
  return code === 'AUTH_FAILED' || code === 'NETWORK_UNREACHABLE';
}

export function VersionHistoryPanel() {
  const styles = useStyles();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<Record<string, FileDiff[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  // Remote dialog state (used for both first connect and change URL)
  const [remoteDialogOpen, setRemoteDialogOpen] = useState(false);
  const [remoteUrlDraft, setRemoteUrlDraft] = useState('');
  const [savingRemote, setSavingRemote] = useState(false);
  const [removingRemote, setRemovingRemote] = useState(false);

  const refreshDebounce = useRef<number | null>(null);

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

  const fetchRemoteStatus = useCallback(async (forceFetch = false) => {
    try {
      const path = forceFetch ? '/api/remote?fetch=true' : '/api/remote';
      const data = await apiFetch<RemoteStatus>(path);
      setRemoteStatus(data);
    } catch {
      setRemoteStatus(null);
    }
  }, []);

  const debouncedRefresh = useCallback(() => {
    if (refreshDebounce.current !== null) window.clearTimeout(refreshDebounce.current);
    refreshDebounce.current = window.setTimeout(() => {
      fetchCheckpoints();
      fetchRemoteStatus(false);
      refreshDebounce.current = null;
    }, 250);
  }, [fetchCheckpoints, fetchRemoteStatus]);

  useEffect(() => {
    fetchCheckpoints();
    fetchRemoteStatus(false);
  }, [fetchCheckpoints, fetchRemoteStatus]);

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
          data.type === 'push:complete' ||
          data.type === 'pull:complete' ||
          data.type === 'fetch:complete' ||
          data.type === 'sync:complete' ||
          data.type === 'remote:changed'
        ) {
          debouncedRefresh();
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
      if (refreshDebounce.current !== null) window.clearTimeout(refreshDebounce.current);
    };
  }, [debouncedRefresh]);

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

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const result = await apiFetch<SyncResponse>('/api/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setSyncResult(result);
      await fetchCheckpoints();
      await fetchRemoteStatus(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Sync failed');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    setSyncing(true);
    setError(null);
    try {
      await apiFetch('/api/pull', { method: 'POST', body: JSON.stringify({}) });
      await fetchCheckpoints();
      await fetchRemoteStatus(false);
    } catch (err) {
      if (err instanceof ApiError) setError(`${err.message}${err.code ? ` (${err.code})` : ''}`);
      else setError(err instanceof Error ? err.message : 'Pull failed');
    } finally {
      setSyncing(false);
    }
  };

  const handlePush = async () => {
    setSyncing(true);
    setError(null);
    try {
      await apiFetch('/api/push', { method: 'POST', body: JSON.stringify({}) });
      await fetchRemoteStatus(false);
    } catch (err) {
      if (err instanceof ApiError) setError(`${err.message}${err.code ? ` (${err.code})` : ''}`);
      else setError(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleFetch = async () => {
    setSyncing(true);
    setError(null);
    try {
      await apiFetch('/api/fetch', { method: 'POST', body: JSON.stringify({}) });
      await fetchRemoteStatus(false);
    } catch (err) {
      if (err instanceof ApiError) setError(`${err.message}${err.code ? ` (${err.code})` : ''}`);
      else setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshStatus = async () => {
    setSyncing(true);
    try {
      await fetchRemoteStatus(true);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveRemote = async () => {
    if (!remoteUrlDraft.trim()) return;
    setSavingRemote(true);
    setError(null);
    try {
      await apiFetch('/api/remote', {
        method: 'POST',
        body: JSON.stringify({ url: remoteUrlDraft.trim() }),
      });
      setRemoteDialogOpen(false);
      setRemoteUrlDraft('');
      await fetchRemoteStatus(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save remote');
    } finally {
      setSavingRemote(false);
    }
  };

  const handleRemoveRemote = async () => {
    if (!confirm('Disconnect this workspace from the remote? Local history is unaffected.')) return;
    setRemovingRemote(true);
    setError(null);
    try {
      await apiFetch('/api/remote', { method: 'DELETE' });
      await fetchRemoteStatus(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove remote');
    } finally {
      setRemovingRemote(false);
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

  const badge = remoteStatus ? statusBadge(remoteStatus) : null;
  const hasRemote = remoteStatus?.hasRemote ?? false;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <History24Regular />
        <Text weight="semibold" className={styles.headerTitle}>
          Version History
        </Text>
      </div>

      {/* Remote status / sync */}
      {!hasRemote ? (
        <div className={styles.emptyRemote}>
          <CloudArrowUp24Regular />
          <Text weight="semibold">Not connected to GitHub</Text>
          <Text size={200}>
            Connect this workspace to a GitHub repository to share your work and sync changes.
          </Text>
          <Button
            appearance="primary"
            icon={<Link16Regular />}
            onClick={() => {
              setRemoteUrlDraft('');
              setRemoteDialogOpen(true);
            }}
          >
            Connect to GitHub
          </Button>
        </div>
      ) : (
        <div className={styles.remoteCard}>
          <div className={styles.remoteRow}>
            <Link16Regular />
            <Text className={styles.remoteUrl}>
              {truncateMiddle(remoteStatus?.remoteUrl ?? '', 48)}
            </Text>
            {badge && (
              <Badge appearance="filled" color={badge.color}>
                {badge.label}
              </Badge>
            )}
          </div>
          <div className={styles.remoteRow}>
            <Button
              appearance="primary"
              icon={syncing ? <Spinner size="tiny" /> : <ArrowSync24Regular />}
              onClick={handleSync}
              disabled={syncing}
            >
              Sync
            </Button>
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <MenuButton
                  appearance="subtle"
                  icon={<MoreHorizontal16Regular />}
                  disabled={syncing}
                />
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem icon={<ArrowDownload16Regular />} onClick={handlePull}>
                    Pull only
                  </MenuItem>
                  <MenuItem icon={<ArrowUpload16Regular />} onClick={handlePush}>
                    Push only
                  </MenuItem>
                  <MenuItem icon={<ArrowSync16Regular />} onClick={handleFetch}>
                    Fetch
                  </MenuItem>
                  <MenuItem icon={<ArrowSync16Regular />} onClick={handleRefreshStatus}>
                    Refresh status
                  </MenuItem>
                  <MenuItem
                    icon={<Link16Regular />}
                    onClick={() => {
                      setRemoteUrlDraft(remoteStatus?.remoteUrl ?? '');
                      setRemoteDialogOpen(true);
                    }}
                  >
                    Change remote URL...
                  </MenuItem>
                  <MenuItem
                    icon={<Delete16Regular />}
                    onClick={handleRemoveRemote}
                    disabled={removingRemote}
                  >
                    Disconnect remote
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
          <div className={styles.metaRow}>
            {remoteStatus?.branch && <span>branch: {remoteStatus.branch}</span>}
            {remoteStatus?.lastFetchedAt && (
              <span>fetched {relativeTime(remoteStatus.lastFetchedAt)}</span>
            )}
          </div>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <SyncResultDisplay result={syncResult} onDismiss={() => setSyncResult(null)} />
      )}

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {/* Checkpoint actions */}
      <div className={styles.header}>
        <Text weight="semibold" className={styles.headerTitle}>
          Checkpoints
        </Text>
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
      </div>

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
                {(cp.message.startsWith('Auto-save') || cp.message.startsWith('auto:')) && (
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

      {/* Restore confirmation */}
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

      {/* Remote URL dialog */}
      <Dialog open={remoteDialogOpen} onOpenChange={(_, d) => setRemoteDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{hasRemote ? 'Change remote URL' : 'Connect to GitHub'}</DialogTitle>
            <DialogContent>
              <Text size={200} block>
                Paste your repository URL (HTTPS or SSH). You can find it on your GitHub repo page
                under the green Code button.
              </Text>
              <div style={{ marginTop: 8 }}>
                <Input
                  placeholder="https://github.com/owner/repo.git"
                  value={remoteUrlDraft}
                  onChange={(_, d) => setRemoteUrlDraft(d.value)}
                  style={{ width: '100%' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRemote();
                  }}
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setRemoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleSaveRemote}
                disabled={savingRemote || !remoteUrlDraft.trim()}
              >
                {savingRemote ? <Spinner size="tiny" /> : 'Save'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

function SyncResultDisplay({ result, onDismiss }: { result: SyncResponse; onDismiss: () => void }) {
  const styles = useStyles();
  // Conflict variant
  if (result.conflictedFiles && result.conflictedFiles.length > 0) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Sync paused — conflicts need your attention</MessageBarTitle>
          <Text size={200} block>
            We safely rolled back the rebase. Your local work is intact. Please resolve the
            conflicts in these files and try again:
          </Text>
          <ul className={styles.conflictList}>
            {result.conflictedFiles.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Text size={200}>
            <a href="/api/docs/help/git-workflows.md#conflicts" target="_blank" rel="noreferrer">
              How to resolve conflicts
            </a>
          </Text>
        </MessageBarBody>
        <Button appearance="subtle" size="small" onClick={onDismiss}>
          Dismiss
        </Button>
      </MessageBar>
    );
  }

  // Auth-failure variant
  const failedStep = result.steps.find((s) => s.status === 'failed');
  if (failedStep && isAuthError(failedStep.errorCode)) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          <MessageBarTitle>Could not reach GitHub</MessageBarTitle>
          <Text size={200} block>
            {failedStep.errorCode === 'AUTH_FAILED'
              ? 'GitHub rejected your credentials. You may need to set up a Personal Access Token or SSH key.'
              : 'Could not connect to GitHub. Check your network connection.'}
          </Text>
          <Text size={200}>
            <a href="/api/docs/help/git-credentials.md" target="_blank" rel="noreferrer">
              How to set up GitHub credentials
            </a>
          </Text>
        </MessageBarBody>
        <Button appearance="subtle" size="small" onClick={onDismiss}>
          Dismiss
        </Button>
      </MessageBar>
    );
  }

  // Generic failure
  if (!result.ok) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          <MessageBarTitle>Sync failed</MessageBarTitle>
          <div className={styles.syncSteps}>
            {result.steps.map((s, i) => (
              <div key={i} className={styles.syncStep}>
                {s.status === 'ok' ? '✓' : s.status === 'skipped' ? '−' : '✗'} {s.step}
                {s.errorMessage && ` — ${s.errorMessage}`}
              </div>
            ))}
          </div>
        </MessageBarBody>
        <Button appearance="subtle" size="small" onClick={onDismiss}>
          Dismiss
        </Button>
      </MessageBar>
    );
  }

  // Success
  const pulled = result.steps.find((s) => s.step === 'pull' && s.status === 'ok');
  const pushed = result.steps.find((s) => s.step === 'push' && s.status === 'ok');
  const summary = pushed && pulled ? 'Synced — pulled & pushed' : pushed ? 'Pushed' : 'Up to date';
  return (
    <MessageBar intent="success">
      <MessageBarBody>
        <MessageBarTitle>{summary}</MessageBarTitle>
        <div className={styles.syncSteps}>
          {result.steps.map((s, i) => (
            <div key={i} className={styles.syncStep}>
              {s.status === 'ok' ? '✓' : s.status === 'skipped' ? '−' : '✗'} {s.step}
              {s.durationMs > 0 && ` (${s.durationMs}ms)`}
            </div>
          ))}
        </div>
      </MessageBarBody>
      <Button appearance="subtle" size="small" onClick={onDismiss}>
        Dismiss
      </Button>
    </MessageBar>
  );
}
