import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bcmApi } from '../api/client.js';
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
} from '@fluentui/react-components';
import {
  Sparkle24Regular,
  Branch24Regular,
  Checkmark24Regular,
  TextDescription24Regular,
  Merge24Regular,
  DocumentText24Regular,
  TextFont24Regular,
} from '@fluentui/react-icons';
import { useBcmStore } from '../store/bcm-store.js';
import { useModel } from '../api/hooks.js';
import { AIResultRenderer, type ItemActionType } from './AIResultRenderer.js';

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

interface ActionDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactElement;
  needsNode: boolean;
  needsInput: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

const actions: ActionDef[] = [
  {
    id: 'bcm.generate_first_level',
    name: 'Generate First-Level',
    description: 'Generate top-level capabilities for a domain',
    icon: <Sparkle24Regular />,
    needsNode: false,
    needsInput: true,
    inputLabel: 'Describe the organization or domain',
    inputPlaceholder: 'e.g. A retail bank providing personal and business banking services...',
  },
  {
    id: 'bcm.expand_node',
    name: 'Expand Node',
    description: 'Decompose selected capability into sub-capabilities',
    icon: <Branch24Regular />,
    needsNode: true,
    needsInput: false,
  },
  {
    id: 'bcm.review_mece',
    name: 'Review MECE',
    description: 'Check for overlaps, gaps, and consistency',
    icon: <Checkmark24Regular />,
    needsNode: false,
    needsInput: false,
  },
  {
    id: 'bcm.normalize_names',
    name: 'Normalize Names',
    description: 'Suggest consistent naming across the model',
    icon: <TextFont24Regular />,
    needsNode: false,
    needsInput: false,
  },
  {
    id: 'bcm.suggest_merges',
    name: 'Suggest Merges',
    description: 'Find capabilities that could be combined',
    icon: <Merge24Regular />,
    needsNode: false,
    needsInput: false,
  },
  {
    id: 'bcm.enrich_descriptions',
    name: 'Enrich Descriptions',
    description: 'Generate descriptions for capabilities lacking them',
    icon: <TextDescription24Regular />,
    needsNode: false,
    needsInput: false,
  },
  {
    id: 'bcm.generate_review_brief',
    name: 'Generate Review Brief',
    description: 'Create a stakeholder review summary',
    icon: <DocumentText24Regular />,
    needsNode: false,
    needsInput: false,
  },
];

export function BcmAIActionsPanel() {
  const styles = useStyles();
  const { activeModelId, selectedNodeId } = useBcmStore();
  const { data: model } = useModel(activeModelId);
  const qc = useQueryClient();
  const [executing, setExecuting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [structuredResult, setStructuredResult] = useState<any>(null);
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  /** Snapshot of the model/node context that produced the current AI result. */
  const [executionContext, setExecutionContext] = useState<{
    modelId: string;
    nodeId: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<ActionDef | null>(null);
  const [inputText, setInputText] = useState('');
  /** Per-item state: indices of items already applied. */
  const [appliedItems, setAppliedItems] = useState<Set<number>>(new Set());
  /** Index of the item currently being processed. */
  const [busyItem, setBusyItem] = useState<number | null>(null);

  const refreshModel = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['bcm'] });
  }, [qc]);

  const handleItemAction = useCallback(
    async (type: ItemActionType, item: any, index: number) => {
      if (!executionContext) return;
      const modelId = executionContext.modelId;

      setError(null);
      setBusyItem(index);

      try {
        switch (type) {
          case 'apply-rename': {
            if (!item.nodeId || !item.suggestedName) break;
            await bcmApi.updateNode(modelId, item.nodeId, { name: item.suggestedName });
            refreshModel();
            break;
          }

          case 'apply-description': {
            if (!item.nodeId || !item.description) break;
            await bcmApi.updateNode(modelId, item.nodeId, { description: item.description });
            refreshModel();
            break;
          }

          case 'apply-merge': {
            const nodeIds: string[] = item.nodeIds ?? [];
            if (nodeIds.length < 2) break;

            const survivorId = nodeIds[0];
            const othersIds = nodeIds.slice(1);

            // 1. Rename the surviving node
            if (item.suggestedName) {
              await bcmApi.updateNode(modelId, survivorId, { name: item.suggestedName });
            }

            // 2. Move children from other nodes into the survivor
            if (model?.nodes) {
              for (const otherId of othersIds) {
                const children = model.nodes.filter((n: any) => n.parent === otherId);
                for (const child of children) {
                  await bcmApi.moveNode(modelId, child.id, {
                    parent: survivorId,
                    order: child.order ?? 0,
                  });
                }
              }
            }

            // 3. Delete the duplicate nodes
            for (const otherId of othersIds) {
              await bcmApi.deleteNode(modelId, otherId);
            }

            refreshModel();
            break;
          }

          case 'fix-finding': {
            // Send a follow-up AI call to fix this specific MECE finding
            const execRes = await fetch('/api/ai/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                actionId: 'bcm.fix_mece_finding',
                input: {
                  modelId,
                  finding: item,
                },
              }),
            });
            const execData = await execRes.json();
            if (!execData.ok) throw new Error(execData.error);

            // Apply the returned operations directly
            const ops = execData.data?.structured;
            if (Array.isArray(ops) && ops.length > 0) {
              const batchOps = ops
                .filter(
                  (op: any) => (op.op === 'add' && op.name) || (op.op === 'update' && op.nodeId),
                )
                .map((op: any) =>
                  op.op === 'add'
                    ? {
                        op: 'add' as const,
                        name: op.name,
                        description: op.description ?? '',
                        parent: op.parent ?? null,
                        order: op.order ?? 0,
                      }
                    : {
                        op: 'update' as const,
                        nodeId: op.nodeId,
                        ...(op.name !== undefined && { name: op.name }),
                        ...(op.description !== undefined && { description: op.description }),
                      },
                );
              if (batchOps.length > 0) {
                await bcmApi.batchMutate(modelId, batchOps);
                refreshModel();
              }
            }
            break;
          }
        }

        setAppliedItems((prev) => new Set(prev).add(index));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply item');
      } finally {
        setBusyItem(null);
      }
    },
    [executionContext, refreshModel],
  );

  const handleAccept = useCallback(async () => {
    if (!executionContext || !structuredResult || !lastActionId) return;

    // Validate that the model/node context hasn't changed since execution
    if (executionContext.modelId !== activeModelId) {
      setError(
        'The active model has changed since this result was generated. Please re-run the action.',
      );
      return;
    }
    if (lastActionId === 'bcm.expand_node' && executionContext.nodeId !== selectedNodeId) {
      setError(
        'The selected node has changed since this result was generated. Please re-run the action.',
      );
      return;
    }

    setError(null);
    setApplying(true);

    try {
      const modelId = executionContext.modelId;

      switch (lastActionId) {
        // Generate/expand produce arrays of { name, description, order } → batch add
        case 'bcm.generate_first_level': {
          const items = Array.isArray(structuredResult) ? structuredResult : [];
          // Create a single root node, then nest first-level capabilities under it
          const rootRes = await bcmApi.addNode(modelId, {
            name: model?.header?.title ?? 'Root',
            order: 0,
          });
          const rootId = rootRes.nodeId;
          const operations = items
            .filter((item: any) => item.name && typeof item.name === 'string')
            .map((item: any, i: number) => ({
              op: 'add' as const,
              name: item.name,
              description: item.description ?? '',
              parent: rootId,
              order: item.order ?? i,
            }));
          if (operations.length > 0) {
            await bcmApi.batchMutate(modelId, operations);
          }
          // Auto-expand the root so children are visible
          useBcmStore.getState().expandAll([rootId]);
          break;
        }
        case 'bcm.expand_node': {
          const items = Array.isArray(structuredResult) ? structuredResult : [];
          const parentId = executionContext.nodeId;
          if (!parentId) {
            setError('No node was selected when this action was run. Please re-run.');
            return;
          }
          const operations = items
            .filter((item: any) => item.name && typeof item.name === 'string')
            .map((item: any, i: number) => ({
              op: 'add' as const,
              name: item.name,
              description: item.description ?? '',
              parent: parentId,
              order: item.order ?? i,
            }));
          if (operations.length > 0) {
            await bcmApi.batchMutate(modelId, operations);
          }
          // Auto-expand the parent so new children are visible
          if (parentId) {
            useBcmStore.getState().expandAll([parentId]);
          }
          break;
        }

        // Normalize names → batch update (only unapplied items)
        case 'bcm.normalize_names': {
          const renames = Array.isArray(structuredResult) ? structuredResult : [];
          const operations = renames
            .filter(
              (item: any, i: number) => item.nodeId && item.suggestedName && !appliedItems.has(i),
            )
            .map((item: any) => ({
              op: 'update' as const,
              nodeId: item.nodeId,
              name: item.suggestedName,
            }));
          if (operations.length > 0) {
            await bcmApi.batchMutate(modelId, operations);
          }
          break;
        }

        // Enrich descriptions → batch update (only unapplied items)
        case 'bcm.enrich_descriptions': {
          const enrichments = Array.isArray(structuredResult) ? structuredResult : [];
          const operations = enrichments
            .filter(
              (item: any, i: number) => item.nodeId && item.description && !appliedItems.has(i),
            )
            .map((item: any) => ({
              op: 'update' as const,
              nodeId: item.nodeId,
              description: item.description,
            }));
          if (operations.length > 0) {
            await bcmApi.batchMutate(modelId, operations);
          }
          break;
        }

        // Review MECE, suggest merges, review brief — per-item only
        case 'bcm.review_mece':
        case 'bcm.suggest_merges':
        case 'bcm.generate_review_brief':
          break;

        default:
          setError(`Unknown action "${lastActionId}" — cannot apply results`);
          return;
      }

      // Refresh model data
      refreshModel();
      setResult(null);
      setStructuredResult(null);
      setLastActionId(null);
      setExecutionContext(null);
      setAppliedItems(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  }, [
    executionContext,
    structuredResult,
    lastActionId,
    activeModelId,
    selectedNodeId,
    refreshModel,
    model,
    appliedItems,
  ]);

  if (!activeModelId) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <Text>Select a model to use AI actions</Text>
        </div>
      </div>
    );
  }

  const clearResult = () => {
    setResult(null);
    setStructuredResult(null);
    setLastActionId(null);
    setExecutionContext(null);
    setAppliedItems(new Set());
  };

  const handleExecute = async (action: ActionDef, input?: string) => {
    setExecuting(true);
    setError(null);
    setResult(null);
    setAppliedItems(new Set());
    setDialogAction(null);

    try {
      const execRes = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.id,
          input: {
            modelId: activeModelId,
            nodeId: selectedNodeId,
            context: input,
          },
        }),
      });
      const execData = await execRes.json();
      if (!execData.ok) throw new Error(execData.error);

      const aiResult = execData.data;
      setResult(aiResult.content ?? JSON.stringify(aiResult, null, 2));
      setStructuredResult(aiResult.structured ?? null);
      setLastActionId(action.id);
      setExecutionContext({ modelId: activeModelId!, nodeId: selectedNodeId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI action failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleClick = (action: ActionDef) => {
    if (action.needsNode && !selectedNodeId) {
      setError('Select a node first for this action');
      return;
    }
    if (action.needsInput) {
      setDialogAction(action);
      setInputText('');
    } else {
      handleExecute(action);
    }
  };

  // Actions that support bulk "Accept All" (not per-item-only actions)
  const bulkAcceptActions = [
    'bcm.generate_first_level',
    'bcm.expand_node',
    'bcm.normalize_names',
    'bcm.enrich_descriptions',
  ];

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold">AI Actions</Text>
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

      {actions.map((action) => (
        <Card
          key={action.id}
          className={styles.card}
          size="small"
          onClick={() => handleClick(action)}
        >
          <CardHeader
            image={action.icon}
            header={
              <Body1>
                <strong>{action.name}</strong>
              </Body1>
            }
            description={action.description}
          />
        </Card>
      ))}

      {result && (
        <>
          <Text weight="semibold" size={200}>
            Result
          </Text>
          <AIResultRenderer
            actionId={lastActionId ?? ''}
            content={result}
            structured={structuredResult}
            onItemAction={handleItemAction}
            appliedItems={appliedItems}
            busyItem={busyItem}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            {lastActionId && bulkAcceptActions.includes(lastActionId) && (
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
                onClick={() => handleExecute(dialogAction!, inputText)}
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
