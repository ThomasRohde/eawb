import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  makeStyles,
  tokens,
  Text,
  Select,
  Button,
  Spinner,
  Divider,
  Caption1,
  Tooltip,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { ArrowSync24Regular } from '@fluentui/react-icons';
import { apiFetch } from '../api/client.js';
import type { AIPreferences } from '@ea-workbench/shared-schema';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '16px',
    gap: '16px',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    color: tokens.colorNeutralForeground3,
    letterSpacing: '0.5px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  label: {
    flexShrink: 0,
  },
  select: {
    minWidth: '180px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '32px',
    textAlign: 'center',
  },
  updatedAt: {
    color: tokens.colorNeutralForeground3,
    fontSize: '11px',
  },
});

export function SettingsPanel() {
  const styles = useStyles();
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['ai', 'preferences'],
    queryFn: () => apiFetch<AIPreferences>('/api/ai/preferences'),
  });

  const updateMut = useMutation({
    mutationFn: (partial: Partial<AIPreferences>) =>
      apiFetch<AIPreferences>('/api/ai/preferences', {
        method: 'PUT',
        body: JSON.stringify(partial),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'preferences'] }),
  });

  const refreshMut = useMutation({
    mutationFn: () =>
      apiFetch<AIPreferences>('/api/ai/preferences/refresh', {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'preferences'] }),
  });

  const setModel = useCallback(
    (modelId: string) => {
      updateMut.mutate({ preferredModelId: modelId || null });
    },
    [updateMut],
  );

  const setMode = useCallback(
    (modeId: string) => {
      updateMut.mutate({ preferredModeId: modeId || null });
    },
    [updateMut],
  );

  const setConfigOverride = useCallback(
    (optionId: string, value: unknown) => {
      // Send only the changed key — server deep-merges into existing overrides.
      // null signals deletion of the override (revert to default).
      if (value === '') {
        updateMut.mutate({ configOverrides: { [optionId]: null } });
      } else {
        updateMut.mutate({ configOverrides: { [optionId]: value } });
      }
    },
    [updateMut, prefs],
  );

  if (isLoading) {
    return (
      <div className={styles.root}>
        <Spinner size="small" label="Loading preferences..." />
      </div>
    );
  }

  const cached = prefs?.cachedOptions;
  const hasOptions =
    cached &&
    (cached.models.length > 0 || cached.modes.length > 0 || cached.configOptions.length > 0);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold" size={400}>
          AI Settings
        </Text>
        <Tooltip content="Refresh available options from AI provider" relationship="label">
          <Button
            appearance="subtle"
            icon={<ArrowSync24Regular />}
            size="small"
            onClick={() => refreshMut.mutate()}
            disabled={refreshMut.isPending}
          >
            {refreshMut.isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Tooltip>
      </div>

      {refreshMut.isError && (
        <MessageBar intent="error">
          <MessageBarBody>Failed to refresh: {(refreshMut.error as Error).message}</MessageBarBody>
        </MessageBar>
      )}

      {!hasOptions ? (
        <div className={styles.emptyState}>
          <Text>No AI options cached yet.</Text>
          <Caption1>
            Start a conversation or click Refresh to discover available AI options.
          </Caption1>
        </div>
      ) : (
        <>
          {cached.models.length > 0 && (
            <div className={styles.section}>
              <Text className={styles.sectionTitle}>Model</Text>
              <div className={styles.row}>
                <Caption1 className={styles.label}>Preferred model</Caption1>
                <Select
                  className={styles.select}
                  size="small"
                  value={prefs?.preferredModelId ?? ''}
                  onChange={(_, d) => setModel(d.value)}
                >
                  <option value="">(Default)</option>
                  {cached.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {cached.modes.length > 0 && (
            <>
              <Divider />
              <div className={styles.section}>
                <Text className={styles.sectionTitle}>Mode</Text>
                <div className={styles.row}>
                  <Caption1 className={styles.label}>Preferred mode</Caption1>
                  <Select
                    className={styles.select}
                    size="small"
                    value={prefs?.preferredModeId ?? ''}
                    onChange={(_, d) => setMode(d.value)}
                  >
                    <option value="">(Default)</option>
                    {cached.modes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </>
          )}

          {cached.configOptions.filter((o) => o.category !== 'mode' && o.category !== 'model')
            .length > 0 && (
            <>
              <Divider />
              <div className={styles.section}>
                <Text className={styles.sectionTitle}>Configuration</Text>
                {cached.configOptions
                  .filter((o) => o.category !== 'mode' && o.category !== 'model')
                  .map((opt) => (
                    <div key={opt.id} className={styles.row}>
                      <Tooltip content={opt.description ?? ''} relationship="description">
                        <Caption1 className={styles.label}>{opt.name}</Caption1>
                      </Tooltip>
                      {opt.type === 'select' && opt.options ? (
                        <Select
                          className={styles.select}
                          size="small"
                          value={
                            prefs?.configOverrides?.[opt.id] != null
                              ? String(prefs.configOverrides[opt.id])
                              : ''
                          }
                          onChange={(_, d) => setConfigOverride(opt.id, d.value)}
                        >
                          <option value="">(Default)</option>
                          {opt.options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Button
                          size="small"
                          appearance={
                            prefs?.configOverrides?.[opt.id] != null
                              ? prefs.configOverrides[opt.id]
                                ? 'primary'
                                : 'secondary'
                              : 'outline'
                          }
                          onClick={() => {
                            const current = prefs?.configOverrides?.[opt.id];
                            if (current === true) {
                              setConfigOverride(opt.id, false);
                            } else if (current === false) {
                              // Cycle: false → clear (default)
                              setConfigOverride(opt.id, '');
                            } else {
                              // No override → true
                              setConfigOverride(opt.id, true);
                            }
                          }}
                        >
                          {prefs?.configOverrides?.[opt.id] != null
                            ? prefs.configOverrides[opt.id]
                              ? 'On'
                              : 'Off'
                            : 'Default'}
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}

          {cached.updatedAt && (
            <>
              <Divider />
              <Caption1 className={styles.updatedAt}>
                Options last refreshed: {new Date(cached.updatedAt).toLocaleString()}
              </Caption1>
            </>
          )}
        </>
      )}
    </div>
  );
}
