import { useState, useCallback, type ComponentType } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Card,
  CardHeader,
  Body1,
  Spinner,
  MessageBar,
  MessageBarBody,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Textarea,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import {
  Sparkle24Regular,
  Branch24Regular,
  Checkmark24Regular,
  TextDescription24Regular,
  Merge24Regular,
  DocumentText24Regular,
  TextFont24Regular,
  TextEditStyle24Regular,
  DocumentBulletList24Regular,
  TextExpand24Regular,
  TextGrammarCheckmark24Regular,
} from '@fluentui/react-icons';
import { useLayoutStore } from '../store/layout-store.js';
import { useBcmActionProvider } from '@ea-workbench/bcm-ui';
import { useEditorActionProvider } from '@ea-workbench/editor-ui';
import { useJsonFormsActionProvider } from '@ea-workbench/json-forms-ui';
import type {
  AIActionProvider,
  AIActionUIDefinition,
  AIResultRendererProps,
} from '@ea-workbench/tool-api';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '400px',
    overflow: 'auto',
    padding: '12px',
    gap: '8px',
  },
  header: {
    padding: '4px 0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolSelector: {
    minWidth: '180px',
  },
  card: {
    cursor: 'pointer',
    ':hover': {
      boxShadow: tokens.shadow4,
    },
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  executing: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

/** Map action IDs to icons. */
const ACTION_ICONS: Record<string, React.ReactElement> = {
  'bcm.generate_first_level': <Sparkle24Regular />,
  'bcm.expand_node': <Branch24Regular />,
  'bcm.review_mece': <Checkmark24Regular />,
  'bcm.normalize_names': <TextFont24Regular />,
  'bcm.suggest_merges': <Merge24Regular />,
  'bcm.enrich_descriptions': <TextDescription24Regular />,
  'bcm.generate_review_brief': <DocumentText24Regular />,
  'md.improve_clarity': <TextEditStyle24Regular />,
  'md.summarize': <DocumentBulletList24Regular />,
  'md.expand': <TextExpand24Regular />,
  'md.fix_grammar': <TextGrammarCheckmark24Regular />,
};

export function AIActionsPanel() {
  const styles = useStyles();
  const activeToolId = useLayoutStore((s) => s.activeToolId);

  // Providers are hooks — must call unconditionally
  const bcmProvider = useBcmActionProvider();
  const editorProvider = useEditorActionProvider();
  const jsonFormsProvider = useJsonFormsActionProvider();

  const providers: AIActionProvider[] = [bcmProvider, editorProvider, jsonFormsProvider];
  const providerMap = new Map(providers.map((p) => [p.toolId, p]));

  // Determine active provider from tool context
  const autoProvider = activeToolId ? (providerMap.get(activeToolId) ?? null) : null;
  const [manualToolId, setManualToolId] = useState<string | null>(null);

  // Use manual selection if set, otherwise auto-detect
  const activeProvider = manualToolId
    ? (providerMap.get(manualToolId) ?? autoProvider)
    : autoProvider;

  // Action execution state
  const [executing, setExecuting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [structuredResult, setStructuredResult] = useState<any>(null);
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  const [executionContext, setExecutionContext] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<AIActionUIDefinition | null>(null);
  const [inputText, setInputText] = useState('');
  const [appliedItems, setAppliedItems] = useState<Set<number>>(new Set());
  const [busyItem, setBusyItem] = useState<number | null>(null);
  // Track which provider produced the current result
  const [resultProvider, setResultProvider] = useState<AIActionProvider | null>(null);

  const clearResult = useCallback(() => {
    setResult(null);
    setStructuredResult(null);
    setLastActionId(null);
    setExecutionContext(null);
    setAppliedItems(new Set());
    setResultProvider(null);
  }, []);

  const handleExecute = useCallback(
    async (action: AIActionUIDefinition, provider: AIActionProvider, input?: string) => {
      setExecuting(true);
      setError(null);
      setResult(null);
      setAppliedItems(new Set());
      setDialogAction(null);

      const ctx = provider.getContext();

      try {
        const execRes = await fetch('/api/ai/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId: action.id,
            input: { ...ctx, context: input },
          }),
        });
        const execData = await execRes.json();
        if (!execData.ok) throw new Error(execData.error);

        const aiResult = execData.data;
        setResult(aiResult.content ?? JSON.stringify(aiResult, null, 2));
        setStructuredResult(aiResult.structured ?? null);
        setLastActionId(action.id);
        setExecutionContext(ctx);
        setResultProvider(provider);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI action failed');
      } finally {
        setExecuting(false);
      }
    },
    [],
  );

  const handleClick = useCallback(
    (action: AIActionUIDefinition, provider: AIActionProvider) => {
      if (action.needsSelection && !provider.hasActiveArtifact()) {
        setError('Select an item first for this action');
        return;
      }
      if (action.needsInput) {
        setDialogAction(action);
        setInputText('');
      } else {
        handleExecute(action, provider);
      }
    },
    [handleExecute],
  );

  const handleItemAction = useCallback(
    async (type: string, item: unknown, index: number) => {
      if (!resultProvider || !executionContext) return;
      setError(null);
      setBusyItem(index);
      try {
        await resultProvider.applyItem(lastActionId ?? '', item, index);
        setAppliedItems((prev) => new Set(prev).add(index));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply item');
      } finally {
        setBusyItem(null);
      }
    },
    [resultProvider, executionContext, lastActionId],
  );

  const handleAccept = useCallback(async () => {
    if (!resultProvider || !structuredResult || !lastActionId || !executionContext) return;
    setError(null);
    setApplying(true);
    try {
      const items = Array.isArray(structuredResult) ? structuredResult : [structuredResult];
      await resultProvider.applyAll(lastActionId, items, executionContext);
      clearResult();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  }, [resultProvider, structuredResult, lastActionId, executionContext, clearResult]);

  // Determine what to render
  const showDropdown = !activeProvider;
  const displayProvider = activeProvider;

  // Resolve the result renderer component from the provider that produced the result
  const ResultRenderer = resultProvider?.ResultRenderer as
    | ComponentType<AIResultRendererProps>
    | undefined;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold">AI Actions</Text>
        {(showDropdown || manualToolId) && (
          <Dropdown
            className={styles.toolSelector}
            placeholder="Select tool..."
            value={
              (manualToolId ? providerMap.get(manualToolId)?.toolName : activeProvider?.toolName) ??
              ''
            }
            selectedOptions={[manualToolId ?? activeToolId ?? '']}
            onOptionSelect={(_, data) => {
              setManualToolId(data.optionValue ?? null);
              clearResult();
            }}
          >
            {providers.map((p) => (
              <Option key={p.toolId} value={p.toolId}>
                {p.toolName}
              </Option>
            ))}
          </Dropdown>
        )}
      </div>

      {executing && (
        <div className={styles.executing}>
          <Spinner size="medium" label="Generating..." labelPosition="below" />
        </div>
      )}

      {error && (
        <MessageBar intent="warning">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {!displayProvider && !showDropdown && (
        <div className={styles.empty}>
          <Text>Select a tool to see available AI actions</Text>
        </div>
      )}

      {displayProvider && !displayProvider.hasActiveArtifact() && (
        <div className={styles.empty}>
          <Text>
            Open a {displayProvider.toolName === 'BCM Studio' ? 'model' : 'document'} to use AI
            actions
          </Text>
        </div>
      )}

      {displayProvider &&
        displayProvider.hasActiveArtifact() &&
        displayProvider.actions.map((action) => (
          <Card
            key={action.id}
            className={styles.card}
            size="small"
            onClick={() => handleClick(action, displayProvider)}
          >
            <CardHeader
              image={ACTION_ICONS[action.id] ?? <Sparkle24Regular />}
              header={
                <Body1>
                  <strong>{action.name}</strong>
                </Body1>
              }
              description={action.description}
            />
          </Card>
        ))}

      {result && ResultRenderer && (
        <>
          <Text weight="semibold" size={200}>
            Result
          </Text>
          <ResultRenderer
            actionId={lastActionId ?? ''}
            content={result}
            structured={structuredResult}
            onItemAction={handleItemAction}
            appliedItems={appliedItems}
            busyItem={busyItem}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            {lastActionId && resultProvider?.bulkAcceptActions.includes(lastActionId) && (
              <Button
                appearance="primary"
                size="small"
                onClick={handleAccept}
                disabled={!structuredResult || applying}
              >
                {applying ? 'Applying...' : 'Accept All'}
              </Button>
            )}
            <Button size="small" onClick={clearResult}>
              Dismiss
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={!!dialogAction}
        onOpenChange={(_, d) => {
          if (!d.open) setDialogAction(null);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{dialogAction?.name}</DialogTitle>
            <DialogContent>
              <Textarea
                value={inputText}
                onChange={(_, d) => setInputText(d.value)}
                placeholder={dialogAction?.inputPlaceholder}
                rows={4}
                style={{ width: '100%' }}
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDialogAction(null)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                disabled={!inputText.trim()}
                onClick={() => {
                  if (displayProvider && dialogAction) {
                    handleExecute(dialogAction, displayProvider, inputText);
                  }
                }}
              >
                Execute
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
