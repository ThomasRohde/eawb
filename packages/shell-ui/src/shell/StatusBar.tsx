import { useState, useEffect } from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import { CheckmarkCircle16Regular, Circle16Regular, Warning16Regular } from '@fluentui/react-icons';
import { useLayoutStore } from '../store/layout-store.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    height: '28px',
    padding: '0 12px',
    gap: '16px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: '12px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  spacer: {
    flex: 1,
  },
});

interface DraftStatus {
  hasChanges: boolean;
  changedFiles: string[];
}

export function StatusBar() {
  const styles = useStyles();
  const [connected, setConnected] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus | null>(null);

  useEffect(() => {
    // Check server connectivity
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setConnected(data.ok === true))
      .catch(() => setConnected(false));

    // Check draft status
    fetch('/api/draft-status')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setDraftStatus(data.data);
      })
      .catch(() => {});

    // Poll draft status every 10s
    const interval = setInterval(() => {
      fetch('/api/draft-status')
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) setDraftStatus(data.data);
        })
        .catch(() => {});
    }, 10_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.item}>
        {connected ? <CheckmarkCircle16Regular /> : <Warning16Regular />}
        <Text size={200} style={{ color: 'inherit' }}>
          {connected ? 'Connected' : 'Disconnected'}
        </Text>
      </div>

      <div
        className={styles.item}
        style={{ cursor: 'pointer' }}
        onClick={() => useLayoutStore.getState().openPanel('version-history')}
      >
        {draftStatus?.hasChanges ? (
          <>
            <Circle16Regular />
            <Text size={200} style={{ color: 'inherit' }}>
              Draft ({draftStatus.changedFiles.length} changes)
            </Text>
          </>
        ) : (
          <>
            <CheckmarkCircle16Regular />
            <Text size={200} style={{ color: 'inherit' }}>
              Clean
            </Text>
          </>
        )}
      </div>

      <div className={styles.spacer} />

      <Text size={200} style={{ color: 'inherit' }}>
        EA Workbench v0.1.0
      </Text>
    </div>
  );
}
