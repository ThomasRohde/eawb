import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  Dropdown,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  Toast,
  ToastTitle,
  Toaster,
  Toolbar,
  ToolbarButton,
  makeStyles,
  tokens,
  useId,
  useToastController,
} from '@fluentui/react-components';
import { ArrowReset24Regular, Send24Regular } from '@fluentui/react-icons';
import { JsonForms } from '@jsonforms/react';
import { fluentCells, fluentRenderers } from '../renderers';
import { useRecentSubmissions, useSchema, useSchemaList, useSubmitForm } from '../api/hooks';
import { useFormsStore } from '../store/forms-store';

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
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: '16px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3,
  },
  errorBar: {
    marginBottom: '12px',
  },
  errorList: {
    margin: '4px 0 0 16px',
    padding: 0,
    fontSize: '12px',
  },
  submissionEntry: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: '11px',
    whiteSpace: 'pre-wrap' as const,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '8px',
    borderRadius: '4px',
    marginBottom: '8px',
  },
});

interface ServerError {
  message: string;
  details?: unknown;
}

export function FormFillerPanel() {
  const styles = useStyles();
  const toasterId = useId('json-forms-filler-toaster');
  const { dispatchToast } = useToastController(toasterId);

  const selectedSchemaId = useFormsStore((s) => s.selectedSchemaId);
  const setSelectedSchemaId = useFormsStore((s) => s.setSelectedSchemaId);

  const schemasQ = useSchemaList();
  const schemaQ = useSchema(selectedSchemaId);
  const submissionsQ = useRecentSubmissions(selectedSchemaId, 20);
  const submitMut = useSubmitForm();

  const [data, setData] = useState<unknown>({});
  const [errorCount, setErrorCount] = useState(0);
  const [serverError, setServerError] = useState<ServerError | null>(null);

  // Reset form state when selected schema changes.
  useEffect(() => {
    setData({});
    setErrorCount(0);
    setServerError(null);
  }, [selectedSchemaId]);

  const handleSubmit = async () => {
    if (!selectedSchemaId) return;
    setServerError(null);
    try {
      await submitMut.mutateAsync({ id: selectedSchemaId, data });
      dispatchToast(
        <Toast>
          <ToastTitle>Submission saved</ToastTitle>
        </Toast>,
        { intent: 'success' },
      );
      setData({});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const details = (err as { details?: unknown }).details;
      setServerError({ message, details });
    }
  };

  const handleClear = () => {
    setData({});
    setServerError(null);
  };

  const schemaOptions = useMemo(() => schemasQ.data ?? [], [schemasQ.data]);
  const selectedTitle = schemaOptions.find((s) => s.id === selectedSchemaId)?.title ?? '';

  const canSubmit =
    !!selectedSchemaId && !!schemaQ.data && errorCount === 0 && !submitMut.isPending;

  return (
    <div className={styles.root}>
      <Toaster toasterId={toasterId} />
      <Toolbar className={styles.toolbar}>
        <Dropdown
          className={styles.selector}
          placeholder="Select form schema"
          value={selectedTitle}
          selectedOptions={selectedSchemaId ? [selectedSchemaId] : []}
          onOptionSelect={(_e, d) => setSelectedSchemaId(d.optionValue ?? null)}
        >
          {schemaOptions.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.title}
            </Option>
          ))}
        </Dropdown>

        <ToolbarButton
          icon={<Send24Regular />}
          aria-label="Submit"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Submit
        </ToolbarButton>
        <ToolbarButton
          icon={<ArrowReset24Regular />}
          aria-label="Clear"
          disabled={!selectedSchemaId}
          onClick={handleClear}
        >
          Clear
        </ToolbarButton>
      </Toolbar>

      {!selectedSchemaId ? (
        <div className={styles.empty}>
          <Text>Select a form schema to fill out.</Text>
        </div>
      ) : (
        <div className={styles.body}>
          {serverError && (
            <MessageBar intent="error" className={styles.errorBar}>
              <MessageBarBody>
                <div>{serverError.message}</div>
                {Array.isArray(serverError.details) && serverError.details.length > 0 && (
                  <ul className={styles.errorList}>
                    {serverError.details.slice(0, 10).map((e, i) => (
                      <li key={i}>{formatAjvError(e)}</li>
                    ))}
                  </ul>
                )}
              </MessageBarBody>
            </MessageBar>
          )}

          {schemaQ.isLoading ? (
            <Spinner size="small" />
          ) : schemaQ.data ? (
            <JsonForms
              schema={schemaQ.data.jsonSchema}
              uischema={schemaQ.data.uiSchema}
              data={data}
              renderers={fluentRenderers}
              cells={fluentCells}
              onChange={({ data: next, errors }) => {
                setData(next);
                setErrorCount(errors?.length ?? 0);
              }}
            />
          ) : (
            <Text>Failed to load schema.</Text>
          )}

          <Accordion collapsible style={{ marginTop: '16px' }}>
            <AccordionItem value="recent">
              <AccordionHeader>
                Recent submissions ({submissionsQ.data?.length ?? 0})
              </AccordionHeader>
              <AccordionPanel>
                {submissionsQ.isLoading ? (
                  <Spinner size="tiny" />
                ) : (submissionsQ.data ?? []).length === 0 ? (
                  <Text size={200}>No submissions yet.</Text>
                ) : (
                  (submissionsQ.data ?? []).map((s) => (
                    <div key={s.id} className={styles.submissionEntry}>
                      <div>
                        <strong>{s.submittedAt}</strong>
                      </div>
                      <div>{JSON.stringify(s.data, null, 2)}</div>
                    </div>
                  ))
                )}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}

function formatAjvError(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const e = err as { instancePath?: string; message?: string; keyword?: string };
  const path = e.instancePath || '/';
  return `${path}: ${e.message ?? e.keyword ?? 'invalid'}`;
}
