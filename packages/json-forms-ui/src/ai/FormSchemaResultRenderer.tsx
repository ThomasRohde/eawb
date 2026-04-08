import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Input,
  MessageBar,
  MessageBarBody,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Checkmark16Regular, Dismiss16Regular, Save24Regular } from '@fluentui/react-icons';
import { JsonForms } from '@jsonforms/react';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { AIResultRendererProps } from '@ea-workbench/tool-api';
import { fluentCells, fluentRenderers } from '../renderers';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    minWidth: 0,
  },
  errorBar: {
    marginBottom: '4px',
  },
  errorList: {
    margin: '4px 0 0 16px',
    padding: 0,
    fontSize: '12px',
  },
  rawBlock: {
    fontFamily: 'monospace',
    fontSize: '11px',
    whiteSpace: 'pre-wrap',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '8px',
    borderRadius: '4px',
    maxHeight: '200px',
    overflow: 'auto',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  titleLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    minWidth: '40px',
  },
  previewWrap: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '12px',
    maxHeight: '420px',
    overflow: 'auto',
  },
  rawJsonViewer: {
    fontFamily: 'monospace',
    fontSize: '11px',
    whiteSpace: 'pre-wrap',
    maxHeight: '260px',
    overflow: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '8px',
    borderRadius: '4px',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  suggestionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  suggestionRow: {
    padding: '8px 10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  suggestionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  pointer: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  beforeAfter: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    fontSize: '11px',
  },
  beforeAfterCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '6px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
    maxHeight: '120px',
  },
  rationale: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    fontStyle: 'italic',
  },
  rowActions: {
    display: 'flex',
    gap: '4px',
  },
});

interface FullSchemaProposal {
  jsonSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
}

interface LayoutProposal {
  uiSchema: Record<string, unknown>;
}

interface ValidationSuggestion {
  pointer: string;
  field: string;
  current?: Record<string, unknown>;
  proposed: Record<string, unknown>;
  rationale?: string;
}

interface DescriptionSuggestion {
  pointer: string;
  field: string;
  description: string;
}

function isFullSchema(structured: unknown): structured is FullSchemaProposal {
  return (
    !!structured &&
    typeof structured === 'object' &&
    'jsonSchema' in (structured as object) &&
    'uiSchema' in (structured as object)
  );
}

function isLayoutOnly(structured: unknown): structured is LayoutProposal {
  return (
    !!structured &&
    typeof structured === 'object' &&
    !('jsonSchema' in (structured as object)) &&
    'uiSchema' in (structured as object)
  );
}

function pickList<T>(structured: unknown, key: string): T[] | null {
  if (
    structured &&
    typeof structured === 'object' &&
    Array.isArray((structured as Record<string, unknown>)[key])
  ) {
    return (structured as Record<string, T[]>)[key];
  }
  return null;
}

export function FormSchemaResultRenderer(props: AIResultRendererProps) {
  const styles = useStyles();
  const { actionId, content, structured, onItemAction, appliedItems, busyItem } = props;

  // ----- Parse failure / validation failure surfaces from the server.
  // The shell-ui panel passes envelope errors via the `content` prop and
  // sets `structured` to whatever the server returned. We detect that the
  // structured payload is `null` *and* there's content, which means the
  // server rejected the AI output.
  if (structured == null) {
    return (
      <div className={styles.root}>
        <MessageBar intent="warning" className={styles.errorBar}>
          <MessageBarBody>
            The AI response could not be parsed. Try running the action again with a clearer
            description, or rephrase your request.
          </MessageBarBody>
        </MessageBar>
        {content && <pre className={styles.rawBlock}>{content}</pre>}
      </div>
    );
  }

  // ----- Suggest Validations / Add Descriptions: per-field tables.
  if (actionId === 'json-forms.suggest_validations') {
    const suggestions = pickList<ValidationSuggestion>(structured, 'suggestions') ?? [];
    return (
      <div className={styles.root}>
        {suggestions.length === 0 ? (
          <Text>No validation suggestions — every field already looks well-constrained.</Text>
        ) : (
          <div className={styles.suggestionList}>
            {suggestions.map((s, idx) => {
              const applied = appliedItems?.has(idx);
              const busy = busyItem === idx;
              return (
                <div key={`${s.pointer}-${idx}`} className={styles.suggestionRow}>
                  <div className={styles.suggestionHeader}>
                    <div>
                      <Text weight="semibold">{s.field}</Text>{' '}
                      <span className={styles.pointer}>{s.pointer}</span>
                    </div>
                    <div className={styles.rowActions}>
                      {applied ? (
                        <Badge appearance="filled" color="success" icon={<Checkmark16Regular />}>
                          Applied
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="small"
                            appearance="primary"
                            disabled={busy}
                            onClick={() => onItemAction?.('apply', s, idx)}
                          >
                            Apply
                          </Button>
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<Dismiss16Regular />}
                            disabled={busy}
                            onClick={() => onItemAction?.('skip', s, idx)}
                            aria-label="Skip"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.beforeAfter}>
                    <div className={styles.beforeAfterCell}>
                      {s.current ? JSON.stringify(s.current, null, 2) : '(no current constraints)'}
                    </div>
                    <div className={styles.beforeAfterCell}>
                      {JSON.stringify(s.proposed, null, 2)}
                    </div>
                  </div>
                  {s.rationale && <div className={styles.rationale}>{s.rationale}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (actionId === 'json-forms.add_descriptions') {
    const suggestions = pickList<DescriptionSuggestion>(structured, 'descriptions') ?? [];
    return (
      <div className={styles.root}>
        {suggestions.length === 0 ? (
          <Text>Every field already has a description.</Text>
        ) : (
          <div className={styles.suggestionList}>
            {suggestions.map((s, idx) => {
              const applied = appliedItems?.has(idx);
              const busy = busyItem === idx;
              return (
                <div key={`${s.pointer}-${idx}`} className={styles.suggestionRow}>
                  <div className={styles.suggestionHeader}>
                    <div>
                      <Text weight="semibold">{s.field}</Text>{' '}
                      <span className={styles.pointer}>{s.pointer}</span>
                    </div>
                    <div className={styles.rowActions}>
                      {applied ? (
                        <Badge appearance="filled" color="success" icon={<Checkmark16Regular />}>
                          Applied
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="small"
                            appearance="primary"
                            disabled={busy}
                            onClick={() => onItemAction?.('apply', s, idx)}
                          >
                            Apply
                          </Button>
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<Dismiss16Regular />}
                            disabled={busy}
                            onClick={() => onItemAction?.('skip', s, idx)}
                            aria-label="Skip"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <Text size={200}>{s.description}</Text>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ----- Generate / Refine: full schema preview + Save/Apply.
  if (actionId === 'json-forms.generate_schema' || actionId === 'json-forms.refine_schema') {
    if (!isFullSchema(structured)) {
      return (
        <div className={styles.root}>
          <MessageBar intent="warning">
            <MessageBarBody>
              Unexpected response shape — missing jsonSchema/uiSchema.
            </MessageBarBody>
          </MessageBar>
        </div>
      );
    }
    return (
      <FullSchemaPreview
        actionId={actionId}
        proposal={structured}
        onItemAction={onItemAction}
        appliedItems={appliedItems}
        busyItem={busyItem}
      />
    );
  }

  // ----- Improve Layout: uiSchema-only preview.
  if (actionId === 'json-forms.improve_layout') {
    if (!isLayoutOnly(structured) && !isFullSchema(structured)) {
      return (
        <div className={styles.root}>
          <MessageBar intent="warning">
            <MessageBarBody>Unexpected response shape — missing uiSchema.</MessageBarBody>
          </MessageBar>
        </div>
      );
    }
    const proposal = structured as LayoutProposal;
    return (
      <LayoutPreview
        proposal={proposal}
        onItemAction={onItemAction}
        appliedItems={appliedItems}
        busyItem={busyItem}
      />
    );
  }

  return (
    <div className={styles.root}>
      <pre className={styles.rawBlock}>{JSON.stringify(structured, null, 2)}</pre>
    </div>
  );
}

// ===== Sub-components =====

interface FullSchemaPreviewProps {
  actionId: string;
  proposal: FullSchemaProposal;
  onItemAction?: (type: string, item: unknown, index: number) => Promise<void>;
  appliedItems?: Set<number>;
  busyItem?: number | null;
}

function FullSchemaPreview({
  actionId,
  proposal,
  onItemAction,
  appliedItems,
  busyItem,
}: FullSchemaPreviewProps) {
  const styles = useStyles();
  const isGenerate = actionId === 'json-forms.generate_schema';
  const defaultTitle =
    typeof (proposal.jsonSchema as { title?: unknown }).title === 'string'
      ? ((proposal.jsonSchema as { title?: string }).title as string)
      : 'AI-generated form';
  const [title, setTitle] = useState<string>(defaultTitle);
  const [previewData, setPreviewData] = useState<unknown>({});

  useEffect(() => setTitle(defaultTitle), [defaultTitle]);

  const applied = appliedItems?.has(0) ?? false;
  const busy = busyItem === 0;

  const handleApply = () => {
    if (isGenerate) {
      onItemAction?.('apply', { ...proposal, title }, 0);
    } else {
      onItemAction?.('apply', proposal, 0);
    }
  };

  const rawJson = useMemo(() => JSON.stringify(proposal, null, 2), [proposal]);

  return (
    <div className={styles.root}>
      {isGenerate && (
        <div className={styles.titleRow}>
          <Text className={styles.titleLabel}>Title</Text>
          <Input
            value={title}
            onChange={(_e, d) => setTitle(d.value)}
            disabled={applied || busy}
            style={{ flex: 1 }}
          />
        </div>
      )}

      <div className={styles.previewWrap}>
        <JsonForms
          schema={proposal.jsonSchema as JsonSchema}
          uischema={proposal.uiSchema as unknown as UISchemaElement}
          data={previewData}
          renderers={fluentRenderers}
          cells={fluentCells}
          onChange={({ data }) => setPreviewData(data)}
        />
      </div>

      <Accordion collapsible>
        <AccordionItem value="raw">
          <AccordionHeader>Raw JSON</AccordionHeader>
          <AccordionPanel>
            <pre className={styles.rawJsonViewer}>{rawJson}</pre>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <div className={styles.actionRow}>
        {applied ? (
          <Badge appearance="filled" color="success" icon={<Checkmark16Regular />}>
            {isGenerate ? 'Saved' : 'Applied'}
          </Badge>
        ) : (
          <Button
            appearance="primary"
            icon={<Save24Regular />}
            disabled={busy || (isGenerate && !title.trim())}
            onClick={handleApply}
          >
            {isGenerate ? 'Save as new schema' : 'Apply changes'}
          </Button>
        )}
      </div>
    </div>
  );
}

interface LayoutPreviewProps {
  proposal: LayoutProposal;
  onItemAction?: (type: string, item: unknown, index: number) => Promise<void>;
  appliedItems?: Set<number>;
  busyItem?: number | null;
}

function LayoutPreview({ proposal, onItemAction, appliedItems, busyItem }: LayoutPreviewProps) {
  const styles = useStyles();
  const applied = appliedItems?.has(0) ?? false;
  const busy = busyItem === 0;
  const rawJson = useMemo(() => JSON.stringify(proposal, null, 2), [proposal]);
  return (
    <div className={styles.root}>
      <Text>The AI proposes the following revised UI layout (fields unchanged):</Text>
      <Accordion collapsible defaultOpenItems={['raw']}>
        <AccordionItem value="raw">
          <AccordionHeader>Proposed UI Schema</AccordionHeader>
          <AccordionPanel>
            <pre className={styles.rawJsonViewer}>{rawJson}</pre>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      <div className={styles.actionRow}>
        {applied ? (
          <Badge appearance="filled" color="success" icon={<Checkmark16Regular />}>
            Applied
          </Badge>
        ) : (
          <Button
            appearance="primary"
            icon={<Save24Regular />}
            disabled={busy}
            onClick={() => onItemAction?.('apply', proposal, 0)}
          >
            Apply layout
          </Button>
        )}
      </div>
    </div>
  );
}
