import { useEffect, useRef, useCallback } from 'react';
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  toolbarPlugin,
  markdownShortcutPlugin,
  thematicBreakPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { useQuery } from '@tanstack/react-query';
import { useEditorStore } from '../store/editor-store';
import '../styles/fluent-mdx.css';

async function fetchDocument(id: string) {
  const res = await fetch(`/api/tools/markdown-editor/documents/${id}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'Failed to load document');
  return json.data as { meta: { id: string; title: string }; content: string };
}

async function saveDocument(id: string, content: string) {
  await fetch(`/api/tools/markdown-editor/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

interface DocumentTabProps {
  docId: string;
}

export function DocumentTab({ docId }: DocumentTabProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markDirty = useEditorStore((s) => s.markDirty);
  const markClean = useEditorStore((s) => s.markClean);

  const { data, isLoading, error } = useQuery({
    queryKey: ['editor-doc', docId],
    queryFn: () => fetchDocument(docId),
  });

  // Set content when data loads
  useEffect(() => {
    if (data && editorRef.current) {
      editorRef.current.setMarkdown(data.content);
    }
  }, [data]);

  const handleChange = useCallback(
    (markdown: string) => {
      markDirty(docId);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await saveDocument(docId, markdown);
        markClean(docId);
      }, 1000);
    },
    [docId, markDirty, markClean],
  );

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (isLoading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (error) return <div style={{ padding: 16 }}>Error loading document</div>;

  return (
    <MDXEditor
      ref={editorRef}
      className="fluent-mdx-editor"
      markdown={data?.content ?? ''}
      onChange={handleChange}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertTable />
              <InsertThematicBreak />
            </>
          ),
        }),
      ]}
    />
  );
}
