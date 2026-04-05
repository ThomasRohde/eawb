import { useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Tab,
  TabList,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Spinner,
  Text,
  Toolbar,
  ToolbarButton,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Dismiss16Regular,
  DocumentText24Regular,
  Delete24Regular,
  Circle12Filled,
} from '@fluentui/react-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useEditorStore } from '../store/editor-store';
import { DocumentTab } from './DocumentTab';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    flexShrink: 0,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  tabStrip: {
    flex: 1,
    minWidth: 0,
  },
  tabContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  dirtyIndicator: {
    color: tokens.colorPaletteYellowForeground1,
    fontSize: '8px',
  },
  closeButton: {
    minWidth: 'auto',
    padding: '2px',
  },
  editorArea: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '12px',
    color: tokens.colorNeutralForeground3,
  },
});

interface DocMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

async function fetchDocuments(): Promise<DocMeta[]> {
  const res = await fetch('/api/tools/markdown-editor/documents');
  const json = await res.json();
  return json.ok ? json.data : [];
}

async function createDocument(title: string): Promise<DocMeta> {
  const res = await fetch('/api/tools/markdown-editor/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

async function deleteDocument(id: string): Promise<void> {
  await fetch(`/api/tools/markdown-editor/documents/${id}`, { method: 'DELETE' });
}

export function MarkdownEditorPanel() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { openDocIds, activeDocId, dirtyDocs, openDocument, closeDocument, setActiveDoc } =
    useEditorStore();
  const [newDocTitle, setNewDocTitle] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['editor-documents'],
    queryFn: fetchDocuments,
  });

  // Listen for external open-document events (from AI Chat)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.docId) {
        openDocument(detail.docId);
        queryClient.invalidateQueries({ queryKey: ['editor-documents'] });
      }
    };
    window.addEventListener('eawb:open-document', handler);
    return () => window.removeEventListener('eawb:open-document', handler);
  }, [openDocument, queryClient]);

  const handleNew = useCallback(async () => {
    if (!newDocTitle.trim()) return;
    const doc = await createDocument(newDocTitle.trim());
    queryClient.invalidateQueries({ queryKey: ['editor-documents'] });
    openDocument(doc.id);
    setNewDocTitle('');
    setShowNewDialog(false);
  }, [newDocTitle, queryClient, openDocument]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteDocument(id);
      closeDocument(id);
      queryClient.invalidateQueries({ queryKey: ['editor-documents'] });
      queryClient.removeQueries({ queryKey: ['editor-doc', id] });
    },
    [closeDocument, queryClient],
  );

  const handleTabClose = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      closeDocument(id);
    },
    [closeDocument],
  );

  const getDocTitle = (id: string) => documents?.find((d) => d.id === id)?.title ?? 'Untitled';

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <TabList
          className={styles.tabStrip}
          selectedValue={activeDocId ?? ''}
          onTabSelect={(_e, data) => setActiveDoc(data.value as string)}
          size="small"
        >
          {openDocIds.map((id) => (
            <Tab key={id} value={id}>
              <span className={styles.tabContent}>
                {dirtyDocs.has(id) && <Circle12Filled className={styles.dirtyIndicator} />}
                {getDocTitle(id)}
                <Button
                  className={styles.closeButton}
                  appearance="subtle"
                  size="small"
                  icon={<Dismiss16Regular />}
                  onClick={(e) => handleTabClose(e, id)}
                />
              </span>
            </Tab>
          ))}
        </TabList>

        <Dialog open={showNewDialog} onOpenChange={(_e, data) => setShowNewDialog(data.open)}>
          <DialogTrigger disableButtonEnhancement>
            <ToolbarButton icon={<Add24Regular />} aria-label="New document" />
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>New Document</DialogTitle>
              <DialogContent>
                <Input
                  placeholder="Document title"
                  value={newDocTitle}
                  onChange={(_e, data) => setNewDocTitle(data.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNew()}
                  style={{ width: '100%' }}
                />
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button appearance="primary" onClick={handleNew} disabled={!newDocTitle.trim()}>
                  Create
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>

        {activeDocId && (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <ToolbarButton icon={<DocumentText24Regular />} aria-label="Document list" />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {isLoading ? (
                  <MenuItem disabled>
                    <Spinner size="tiny" />
                  </MenuItem>
                ) : (
                  (documents ?? []).map((doc) => (
                    <MenuItem key={doc.id} onClick={() => openDocument(doc.id)}>
                      {doc.title}
                    </MenuItem>
                  ))
                )}
              </MenuList>
            </MenuPopover>
          </Menu>
        )}

        {activeDocId && (
          <ToolbarButton
            icon={<Delete24Regular />}
            aria-label="Delete document"
            onClick={() => handleDelete(activeDocId)}
          />
        )}
      </div>

      <div className={styles.editorArea}>
        {activeDocId ? (
          <DocumentTab key={activeDocId} docId={activeDocId} />
        ) : (
          <div className={styles.empty}>
            <DocumentText24Regular style={{ fontSize: 48 }} />
            <Text size={400}>No document open</Text>
            <Text size={200}>Create a new document or open one from the document list.</Text>
            {!isLoading && documents && documents.length > 0 && (
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button appearance="primary" icon={<DocumentText24Regular />}>
                    Open Document
                  </Button>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {documents.map((doc) => (
                      <MenuItem key={doc.id} onClick={() => openDocument(doc.id)}>
                        {doc.title}
                      </MenuItem>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
