import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bcmApi } from '../api/client.js';
import { useBcmStore } from '../store/bcm-store.js';
import { useModel } from '../api/hooks.js';
import { AIResultRenderer } from '../panels/AIResultRenderer.js';
import type { AIActionProvider, AIActionUIDefinition } from '@ea-workbench/tool-api';
import type { ItemActionType } from '../panels/AIResultRenderer.js';

const BCM_ACTIONS: AIActionUIDefinition[] = [
  {
    id: 'bcm.generate_first_level',
    name: 'Generate First-Level',
    description: 'Generate top-level capabilities for a domain',
    needsSelection: false,
    needsInput: true,
    inputLabel: 'Describe the organization or domain',
    inputPlaceholder: 'e.g. A retail bank providing personal and business banking services...',
  },
  {
    id: 'bcm.expand_node',
    name: 'Expand Node',
    description: 'Decompose selected capability into sub-capabilities',
    needsSelection: true,
    needsInput: false,
  },
  {
    id: 'bcm.review_mece',
    name: 'Review MECE',
    description: 'Check for overlaps, gaps, and consistency',
    needsSelection: false,
    needsInput: false,
  },
  {
    id: 'bcm.normalize_names',
    name: 'Normalize Names',
    description: 'Suggest consistent naming across the model',
    needsSelection: false,
    needsInput: false,
  },
  {
    id: 'bcm.suggest_merges',
    name: 'Suggest Merges',
    description: 'Find capabilities that could be combined',
    needsSelection: false,
    needsInput: false,
  },
  {
    id: 'bcm.enrich_descriptions',
    name: 'Enrich Descriptions',
    description: 'Generate descriptions for capabilities lacking them',
    needsSelection: false,
    needsInput: false,
  },
  {
    id: 'bcm.generate_review_brief',
    name: 'Generate Review Brief',
    description: 'Create a stakeholder review summary',
    needsSelection: false,
    needsInput: false,
  },
];

const BULK_ACCEPT_ACTIONS = [
  'bcm.generate_first_level',
  'bcm.expand_node',
  'bcm.normalize_names',
  'bcm.enrich_descriptions',
];

/**
 * Hook that returns an AIActionProvider for BCM Studio.
 * Must be called from within a React component (uses hooks).
 */
export function useBcmActionProvider(): AIActionProvider {
  const { activeModelId, selectedNodeId } = useBcmStore();
  const { data: model } = useModel(activeModelId);
  const qc = useQueryClient();

  const refreshModel = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['bcm'] });
  }, [qc]);

  const getContext = useCallback(
    () => ({
      modelId: activeModelId,
      nodeId: selectedNodeId,
    }),
    [activeModelId, selectedNodeId],
  );

  const hasActiveArtifact = useCallback(() => !!activeModelId, [activeModelId]);

  const applyItem = useCallback(
    async (actionId: string, item: any, _index: number) => {
      const modelId = activeModelId;
      if (!modelId) return;

      // Determine item action type from actionId
      let type: ItemActionType;
      switch (actionId) {
        case 'bcm.normalize_names':
          type = 'apply-rename';
          break;
        case 'bcm.enrich_descriptions':
          type = 'apply-description';
          break;
        case 'bcm.suggest_merges':
          type = 'apply-merge';
          break;
        case 'bcm.review_mece':
          type = 'fix-finding';
          break;
        default:
          return;
      }

      switch (type) {
        case 'apply-rename': {
          if (!item.nodeId || !item.suggestedName) break;
          await bcmApi.updateNode(modelId, item.nodeId, {
            name: item.suggestedName,
          });
          refreshModel();
          break;
        }
        case 'apply-description': {
          if (!item.nodeId || !item.description) break;
          await bcmApi.updateNode(modelId, item.nodeId, {
            description: item.description,
          });
          refreshModel();
          break;
        }
        case 'apply-merge': {
          const nodeIds: string[] = item.nodeIds ?? [];
          if (nodeIds.length < 2) break;
          const survivorId = nodeIds[0];
          const othersIds = nodeIds.slice(1);
          if (item.suggestedName) {
            await bcmApi.updateNode(modelId, survivorId, {
              name: item.suggestedName,
            });
          }
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
          for (const otherId of othersIds) {
            await bcmApi.deleteNode(modelId, otherId);
          }
          refreshModel();
          break;
        }
        case 'fix-finding': {
          const execRes = await fetch('/api/ai/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actionId: 'bcm.fix_mece_finding',
              input: { modelId, finding: item },
            }),
          });
          const execData = await execRes.json();
          if (!execData.ok) throw new Error(execData.error);
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
                      ...(op.description !== undefined && {
                        description: op.description,
                      }),
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
    },
    [activeModelId, model, refreshModel],
  );

  const applyAll = useCallback(
    async (actionId: string, items: unknown[], context: Record<string, unknown>) => {
      const modelId = context.modelId as string;
      if (!modelId) return;

      switch (actionId) {
        case 'bcm.generate_first_level': {
          const rootRes = await bcmApi.addNode(modelId, {
            name: model?.header?.title ?? 'Root',
            order: 0,
          });
          const rootId = rootRes.nodeId;
          const operations = (items as any[])
            .filter((item) => item.name && typeof item.name === 'string')
            .map((item, i) => ({
              op: 'add' as const,
              name: item.name,
              description: item.description ?? '',
              parent: rootId,
              order: item.order ?? i,
            }));
          if (operations.length > 0) {
            await bcmApi.batchMutate(modelId, operations);
          }
          useBcmStore.getState().expandAll([rootId]);
          break;
        }
        case 'bcm.expand_node': {
          const parentId = context.nodeId as string;
          if (!parentId) return;
          const operations = (items as any[])
            .filter((item) => item.name && typeof item.name === 'string')
            .map((item, i) => ({
              op: 'add' as const,
              name: item.name,
              description: item.description ?? '',
              parent: parentId,
              order: item.order ?? i,
            }));
          if (operations.length > 0) {
            await bcmApi.batchMutate(modelId, operations);
          }
          useBcmStore.getState().expandAll([parentId]);
          break;
        }
        case 'bcm.normalize_names': {
          const operations = (items as any[])
            .filter((item) => item.nodeId && item.suggestedName)
            .map((item) => ({
              op: 'update' as const,
              nodeId: item.nodeId,
              name: item.suggestedName,
            }));
          if (operations.length > 0) {
            await bcmApi.batchMutate(modelId, operations);
          }
          break;
        }
        case 'bcm.enrich_descriptions': {
          const operations = (items as any[])
            .filter((item) => item.nodeId && item.description)
            .map((item) => ({
              op: 'update' as const,
              nodeId: item.nodeId,
              description: item.description,
            }));
          if (operations.length > 0) {
            await bcmApi.batchMutate(modelId, operations);
          }
          break;
        }
      }

      refreshModel();
    },
    [model, refreshModel],
  );

  return useMemo(
    () => ({
      toolId: 'bcm-studio',
      toolName: 'BCM Studio',
      actions: BCM_ACTIONS,
      getContext,
      hasActiveArtifact,
      ResultRenderer: AIResultRenderer,
      applyItem,
      applyAll,
      bulkAcceptActions: BULK_ACCEPT_ACTIONS,
    }),
    [getContext, hasActiveArtifact, applyItem, applyAll],
  );
}
