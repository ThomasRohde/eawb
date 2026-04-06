import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  Toolbar,
  ToolbarButton,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Add24Regular, Delete24Regular, Save24Regular } from '@fluentui/react-icons';
import { JsonForms } from '@jsonforms/react';
import { fluentCells, fluentRenderers } from '../renderers';
import Editor, { type OnMount } from '@monaco-editor/react';
import {
  useCreateSchema,
  useDeleteSchema,
  useSchema,
  useSchemaList,
  useUpdateSchema,
} from '../api/hooks';
import { useFormsStore } from '../store/forms-store';
import { useColorScheme } from '../hooks/useColorScheme';

const DEFAULT_JSON_SCHEMA = `{
  "type": "object",
  "properties": {
    "name": { "type": "string", "title": "Name" }
  },
  "required": ["name"]
}
`;

const DEFAULT_UI_SCHEMA = `{
  "type": "VerticalLayout",
  "elements": [
    { "type": "Control", "scope": "#/properties/name" }
  ]
}
`;

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
    gap: '8px',
    padding: '4px 8px',
    flexShrink: 0,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  selector: {
    minWidth: '220px',
  },
  body: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  editorColumn: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  editorPane: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  editorLabel: {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  monacoHost: {
    flex: 1,
    minHeight: 0,
  },
  previewColumn: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  previewHeader: {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  previewBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: '12px 16px',
  },
  errorBar: {
    margin: '8px 12px 0',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3,
  },
});

interface ParseState {
  jsonSchema: Record<string, unknown> | null;
  uiSchema: Record<string, unknown> | null;
  jsonError: string | null;
  uiError: string | null;
}

function parseJsonSafe(text: string): {
  value: Record<string, unknown> | null;
  error: string | null;
} {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: null, error: 'Must be a JSON object' };
    }
    return { value: parsed as Record<string, unknown>, error: null };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export function FormSchemaDesignerPanel() {
  const styles = useStyles();
  const colorScheme = useColorScheme();
  const monacoTheme = colorScheme === 'dark' ? 'vs-dark' : 'vs';
  const selectedSchemaId = useFormsStore((s) => s.selectedSchemaId);
  const setSelectedSchemaId = useFormsStore((s) => s.setSelectedSchemaId);

  const schemasQ = useSchemaList();
  const schemaQ = useSchema(selectedSchemaId);
  const createMut = useCreateSchema();
  const updateMut = useUpdateSchema();
  const deleteMut = useDeleteSchema();

  const [jsonSchemaText, setJsonSchemaText] = useState(DEFAULT_JSON_SCHEMA);
  const [uiSchemaText, setUiSchemaText] = useState(DEFAULT_UI_SCHEMA);
  const [previewData, setPreviewData] = useState<unknown>({});
  const [parse, setParse] = useState<ParseState>(() => {
    const j = parseJsonSafe(DEFAULT_JSON_SCHEMA);
    const u = parseJsonSafe(DEFAULT_UI_SCHEMA);
    return {
      jsonSchema: j.value,
      uiSchema: u.value,
      jsonError: j.error,
      uiError: u.error,
    };
  });
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Last successfully parsed schemas (for the preview to fall back to).
  const lastGoodRef = useRef<{
    jsonSchema: Record<string, unknown> | null;
    uiSchema: Record<string, unknown> | null;
  }>({ jsonSchema: parse.jsonSchema, uiSchema: parse.uiSchema });

  // Snapshot of the editor text the LAST time we hydrated from the server.
  // We use it to detect "dirty" state (the user has unsaved edits) so a
  // background query refetch — e.g. triggered by an AI apply on the same
  // schema — doesn't silently clobber what the user has typed.
  const lastHydratedRef = useRef<{
    id: string | null;
    jsonText: string;
    uiText: string;
  }>({ id: null, jsonText: '', uiText: '' });
  const [refetchSkipped, setRefetchSkipped] = useState(false);

  // Hydrate the editor text from server data, but ONLY when it's safe.
  // - Force-hydrate when the selected schema id changes (a new schema was picked).
  // - When the same schema's data refetches: hydrate only if the editor text
  //   matches what we last loaded (clean). If the user is mid-edit, skip and
  //   show a warning so they can decide whether to save or reload.
  useEffect(() => {
    if (!schemaQ.data) return;
    const data = schemaQ.data;
    const newJsonText = JSON.stringify(data.jsonSchema, null, 2);
    const newUiText = JSON.stringify(data.uiSchema, null, 2);

    const last = lastHydratedRef.current;
    const idChanged = last.id !== selectedSchemaId;
    const editorMatchesLastHydrated =
      jsonSchemaText === last.jsonText && uiSchemaText === last.uiText;
    const serverMatchesEditor = jsonSchemaText === newJsonText && uiSchemaText === newUiText;

    if (!idChanged && !editorMatchesLastHydrated && !serverMatchesEditor) {
      // Dirty: user has unsaved edits AND the server copy is different.
      // Don't clobber. Surface a banner so they can choose to save or reload.
      setRefetchSkipped(true);
      return;
    }

    setJsonSchemaText(newJsonText);
    setUiSchemaText(newUiText);
    const j = parseJsonSafe(newJsonText);
    const u = parseJsonSafe(newUiText);
    setParse({
      jsonSchema: j.value,
      uiSchema: u.value,
      jsonError: j.error,
      uiError: u.error,
    });
    if (j.value) lastGoodRef.current.jsonSchema = j.value;
    if (u.value) lastGoodRef.current.uiSchema = u.value;
    lastHydratedRef.current = {
      id: selectedSchemaId,
      jsonText: newJsonText,
      uiText: newUiText,
    };
    if (idChanged) {
      setPreviewData({});
    }
    setSaveError(null);
    setRefetchSkipped(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaQ.data, selectedSchemaId]);

  // When the user accepts the incoming server copy after a skipped refetch,
  // hydrate from the most recent server data and clear the dirty banner.
  const handleReloadFromServer = () => {
    if (!schemaQ.data) return;
    const data = schemaQ.data;
    const newJsonText = JSON.stringify(data.jsonSchema, null, 2);
    const newUiText = JSON.stringify(data.uiSchema, null, 2);
    setJsonSchemaText(newJsonText);
    setUiSchemaText(newUiText);
    const j = parseJsonSafe(newJsonText);
    const u = parseJsonSafe(newUiText);
    setParse({
      jsonSchema: j.value,
      uiSchema: u.value,
      jsonError: j.error,
      uiError: u.error,
    });
    if (j.value) lastGoodRef.current.jsonSchema = j.value;
    if (u.value) lastGoodRef.current.uiSchema = u.value;
    lastHydratedRef.current = {
      id: selectedSchemaId,
      jsonText: newJsonText,
      uiText: newUiText,
    };
    setSaveError(null);
    setRefetchSkipped(false);
  };

  // Debounced reparse when text changes.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const j = parseJsonSafe(jsonSchemaText);
      const u = parseJsonSafe(uiSchemaText);
      setParse({
        jsonSchema: j.value,
        uiSchema: u.value,
        jsonError: j.error,
        uiError: u.error,
      });
      if (j.value) lastGoodRef.current.jsonSchema = j.value;
      if (u.value) lastGoodRef.current.uiSchema = u.value;
    }, 300);
    return () => window.clearTimeout(handle);
  }, [jsonSchemaText, uiSchemaText]);

  const previewSchema = parse.jsonSchema ?? lastGoodRef.current.jsonSchema;
  const previewUiSchema = parse.uiSchema ?? lastGoodRef.current.uiSchema;

  const canSave =
    !!selectedSchemaId &&
    !parse.jsonError &&
    !parse.uiError &&
    !!parse.jsonSchema &&
    !!parse.uiSchema;

  const handleEditorMount: OnMount = (_editor, monaco) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
    });
  };

  const handleNew = async () => {
    if (!newTitle.trim()) return;
    try {
      const meta = await createMut.mutateAsync({ title: newTitle.trim() });
      setSelectedSchemaId(meta.id);
      setNewTitle('');
      setShowNewDialog(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async () => {
    if (!selectedSchemaId || !parse.jsonSchema || !parse.uiSchema) return;
    setSaveError(null);
    try {
      await updateMut.mutateAsync({
        id: selectedSchemaId,
        body: {
          jsonSchema: parse.jsonSchema,
          uiSchema: parse.uiSchema,
        },
      });
      // Mark the just-saved buffer as the new "clean" baseline so the
      // post-save query refetch doesn't fall through the dirty-state guard.
      lastHydratedRef.current = {
        id: selectedSchemaId,
        jsonText: jsonSchemaText,
        uiText: uiSchemaText,
      };
      setRefetchSkipped(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async () => {
    if (!selectedSchemaId) return;
    if (!window.confirm('Delete this form schema and its submissions?')) return;
    await deleteMut.mutateAsync(selectedSchemaId);
    setSelectedSchemaId(null);
  };

  const schemaOptions = useMemo(() => schemasQ.data ?? [], [schemasQ.data]);
  const selectedTitle = schemaOptions.find((s) => s.id === selectedSchemaId)?.title ?? '';

  return (
    <div className={styles.root}>
      <Toolbar className={styles.toolbar}>
        <Dropdown
          className={styles.selector}
          placeholder="Select form schema"
          value={selectedTitle}
          selectedOptions={selectedSchemaId ? [selectedSchemaId] : []}
          onOptionSelect={(_e, data) => setSelectedSchemaId(data.optionValue ?? null)}
        >
          {schemaOptions.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.title}
            </Option>
          ))}
        </Dropdown>

        <Dialog open={showNewDialog} onOpenChange={(_e, data) => setShowNewDialog(data.open)}>
          <DialogTrigger disableButtonEnhancement>
            <ToolbarButton icon={<Add24Regular />} aria-label="New schema">
              New
            </ToolbarButton>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>New Form Schema</DialogTitle>
              <DialogContent>
                <Input
                  placeholder="Schema title"
                  value={newTitle}
                  onChange={(_e, data) => setNewTitle(data.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNew()}
                  style={{ width: '100%' }}
                />
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button appearance="primary" onClick={handleNew} disabled={!newTitle.trim()}>
                  Create
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>

        <ToolbarButton
          icon={<Save24Regular />}
          aria-label="Save"
          disabled={!canSave || updateMut.isPending}
          onClick={handleSave}
        >
          Save
        </ToolbarButton>
        <ToolbarButton
          icon={<Delete24Regular />}
          aria-label="Delete"
          disabled={!selectedSchemaId}
          onClick={handleDelete}
        >
          Delete
        </ToolbarButton>
      </Toolbar>

      {(parse.jsonError || parse.uiError || saveError) && (
        <MessageBar intent="warning" className={styles.errorBar}>
          <MessageBarBody>
            {parse.jsonError && <div>JSON Schema: {parse.jsonError}</div>}
            {parse.uiError && <div>UI Schema: {parse.uiError}</div>}
            {saveError && <div>Save: {saveError}</div>}
          </MessageBarBody>
        </MessageBar>
      )}

      {refetchSkipped && (
        <MessageBar intent="warning" className={styles.errorBar}>
          <MessageBarBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ flex: 1 }}>
                The schema on disk has changed (likely an AI apply). Save your edits to keep them,
                or reload to discard them and pick up the new version.
              </span>
              <Button size="small" appearance="primary" onClick={handleReloadFromServer}>
                Discard &amp; reload
              </Button>
            </div>
          </MessageBarBody>
        </MessageBar>
      )}

      {!selectedSchemaId ? (
        <div className={styles.empty}>
          <Text>Create or select a form schema to begin.</Text>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.editorColumn}>
            <div className={styles.editorPane}>
              <div className={styles.editorLabel}>JSON Schema</div>
              <div className={styles.monacoHost}>
                <Editor
                  language="json"
                  theme={monacoTheme}
                  value={jsonSchemaText}
                  onChange={(value) => setJsonSchemaText(value ?? '')}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
            <div className={styles.editorPane} style={{ borderBottom: 'none' }}>
              <div className={styles.editorLabel}>UI Schema</div>
              <div className={styles.monacoHost}>
                <Editor
                  language="json"
                  theme={monacoTheme}
                  value={uiSchemaText}
                  onChange={(value) => setUiSchemaText(value ?? '')}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
          </div>
          <div className={styles.previewColumn}>
            <div className={styles.previewHeader}>Live Preview</div>
            <div className={styles.previewBody}>
              {schemaQ.isLoading ? (
                <Spinner size="small" />
              ) : previewSchema && previewUiSchema ? (
                <JsonForms
                  schema={previewSchema}
                  uischema={previewUiSchema}
                  data={previewData}
                  renderers={fluentRenderers}
                  cells={fluentCells}
                  onChange={({ data }) => setPreviewData(data)}
                />
              ) : (
                <Text>No valid schema yet.</Text>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
