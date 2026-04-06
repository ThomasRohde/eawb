import { useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editor-store.js';
import { EditorResultRenderer } from './EditorResultRenderer.js';
import type { AIActionProvider, AIActionUIDefinition } from '@ea-workbench/tool-api';

const EDITOR_ACTIONS: AIActionUIDefinition[] = [
  {
    id: 'md.improve_clarity',
    name: 'Improve Clarity',
    description: 'Rewrite for clarity, conciseness, and readability',
    needsSelection: false,
    needsInput: false,
  },
  {
    id: 'md.summarize',
    name: 'Summarize',
    description: 'Generate an executive summary of the document',
    needsSelection: false,
    needsInput: false,
  },
  {
    id: 'md.expand',
    name: 'Expand',
    description: 'Expand outline or bullet points into full prose',
    needsSelection: false,
    needsInput: false,
  },
  {
    id: 'md.fix_grammar',
    name: 'Fix Grammar & Style',
    description: 'Correct grammar, spelling, and style issues',
    needsSelection: false,
    needsInput: false,
  },
];

const BULK_ACCEPT_ACTIONS = ['md.improve_clarity', 'md.expand', 'md.fix_grammar'];

async function fetchDocContent(docId: string): Promise<string> {
  const res = await fetch(`/api/tools/markdown-editor/documents/${docId}`);
  const data = await res.json();
  if (!data.ok) throw new Error('Failed to load document');
  return data.data.content ?? '';
}

async function updateDocContent(docId: string, content: string): Promise<void> {
  const res = await fetch(`/api/tools/markdown-editor/documents/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error('Failed to update document');
}

/**
 * Hook that returns an AIActionProvider for the Markdown Editor.
 */
export function useEditorActionProvider(): AIActionProvider {
  const activeDocId = useEditorStore((s) => s.activeDocId);

  const getContext = useCallback(() => ({ documentId: activeDocId }), [activeDocId]);

  const hasActiveArtifact = useCallback(() => !!activeDocId, [activeDocId]);

  const applyItem = useCallback(
    async (_actionId: string, item: any, _index: number) => {
      if (!activeDocId) return;
      if (item.content) {
        await updateDocContent(activeDocId, item.content);
      }
    },
    [activeDocId],
  );

  const applyAll = useCallback(
    async (_actionId: string, items: unknown[], context: Record<string, unknown>) => {
      const docId = context.documentId as string;
      if (!docId) return;
      // Editor actions produce a single result — take the first item's content
      const firstItem = items[0] as any;
      if (firstItem?.content) {
        await updateDocContent(docId, firstItem.content);
      }
    },
    [],
  );

  return useMemo(
    () => ({
      toolId: 'markdown-editor',
      toolName: 'Markdown Editor',
      actions: EDITOR_ACTIONS,
      getContext,
      hasActiveArtifact,
      ResultRenderer: EditorResultRenderer,
      applyItem,
      applyAll,
      bulkAcceptActions: BULK_ACCEPT_ACTIONS,
    }),
    [getContext, hasActiveArtifact, applyItem, applyAll],
  );
}
