import { makeStyles, tokens, Text, Badge, Button } from '@fluentui/react-components';
import {
  ArrowRight16Regular,
  Warning16Regular,
  Info16Regular,
  ErrorCircle16Regular,
  CheckmarkCircle16Regular,
  Wrench16Regular,
} from '@fluentui/react-icons';
import Markdown from 'react-markdown';

const useStyles = makeStyles({
  container: {
    flex: 1,
    overflow: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fallback: {
    fontFamily: 'monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
  },
  capItem: {
    padding: '8px 12px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  capName: {
    fontWeight: 600,
    fontSize: '13px',
  },
  capDesc: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    marginTop: '2px',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  finding: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    padding: '6px 10px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '12px',
  },
  findingContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  findingMessage: {
    flex: 1,
  },
  itemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '6px 10px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '12px',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemApplied: {
    opacity: 0.5,
  },
  renameName: {
    fontWeight: 600,
    minWidth: 0,
  },
  renameReason: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
  },
  mergeCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  mergeContent: {
    flex: 1,
  },
  enrichItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  enrichContent: {
    flex: 1,
  },
  enrichNodeId: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    fontFamily: 'monospace',
  },
  sectionLabel: {
    fontWeight: 600,
    fontSize: '12px',
    marginTop: '4px',
    color: tokens.colorNeutralForeground2,
  },
  suggestion: {
    fontSize: '12px',
    padding: '4px 0',
    color: tokens.colorNeutralForeground2,
  },
  markdown: {
    fontSize: '13px',
    lineHeight: '1.5',
    '& h1': { fontSize: '18px', fontWeight: 600, margin: '8px 0 4px' },
    '& h2': { fontSize: '15px', fontWeight: 600, margin: '8px 0 4px' },
    '& h3': { fontSize: '13px', fontWeight: 600, margin: '6px 0 2px' },
    '& p': { margin: '4px 0' },
    '& ul, & ol': { margin: '4px 0', paddingLeft: '20px' },
    '& li': { margin: '2px 0' },
  },
});

export type ItemActionType = 'apply-rename' | 'apply-description' | 'fix-finding' | 'apply-merge';

interface Props {
  actionId: string;
  content: string;
  structured: any;
  /** Called when a per-item action button is clicked. */
  onItemAction?: (type: ItemActionType, item: any, index: number) => Promise<void>;
  /** Indices of items that have been successfully applied. */
  appliedItems?: Set<number>;
  /** Index of the item currently being processed. */
  busyItem?: number | null;
}

const severityColor = (s: string) => {
  switch (s) {
    case 'high':
      return 'danger' as const;
    case 'medium':
      return 'warning' as const;
    default:
      return 'informative' as const;
  }
};

const severityIcon = (s: string) => {
  switch (s) {
    case 'high':
      return <ErrorCircle16Regular />;
    case 'medium':
      return <Warning16Regular />;
    default:
      return <Info16Regular />;
  }
};

const scoreColor = (s: string) => {
  switch (s) {
    case 'good':
      return 'success' as const;
    case 'fair':
      return 'warning' as const;
    case 'poor':
      return 'danger' as const;
    default:
      return 'informative' as const;
  }
};

const confidenceColor = (c: string) => {
  switch (c) {
    case 'high':
      return 'success' as const;
    case 'medium':
      return 'warning' as const;
    default:
      return 'informative' as const;
  }
};

export function AIResultRenderer({
  actionId,
  content,
  structured,
  onItemAction,
  appliedItems,
  busyItem,
}: Props) {
  const styles = useStyles();
  const applied = appliedItems ?? new Set<number>();

  // Generate First-Level / Expand Node — array of { name, description, order }
  if (
    (actionId === 'bcm.generate_first_level' || actionId === 'bcm.expand_node') &&
    Array.isArray(structured)
  ) {
    return (
      <div className={styles.container}>
        <Text weight="semibold" size={200}>
          {actionId === 'bcm.generate_first_level'
            ? `${structured.length} capabilities generated`
            : `${structured.length} sub-capabilities`}
        </Text>
        {structured.map((item: any, i: number) => (
          <div key={i} className={styles.capItem}>
            <div className={styles.capName}>
              {i + 1}. {item.name}
            </div>
            {item.description && <div className={styles.capDesc}>{item.description}</div>}
          </div>
        ))}
      </div>
    );
  }

  // Review MECE — { overallScore, findings[], suggestions[] }
  if (actionId === 'bcm.review_mece' && structured && typeof structured === 'object') {
    const { overallScore, findings, suggestions } = structured;
    return (
      <div className={styles.container}>
        {overallScore && (
          <div className={styles.scoreRow}>
            <Text weight="semibold" size={200}>
              Overall quality:
            </Text>
            <Badge
              appearance="filled"
              color={scoreColor(overallScore)}
              icon={overallScore === 'good' ? <CheckmarkCircle16Regular /> : <Warning16Regular />}
            >
              {overallScore.toUpperCase()}
            </Badge>
          </div>
        )}

        {Array.isArray(findings) && findings.length > 0 && (
          <>
            <Text className={styles.sectionLabel}>Findings ({findings.length})</Text>
            {findings.map((f: any, i: number) => (
              <div
                key={i}
                className={`${styles.finding} ${applied.has(i) ? styles.itemApplied : ''}`}
              >
                {severityIcon(f.severity)}
                <div className={styles.findingContent}>
                  <div className={styles.findingMessage}>
                    <Badge size="small" color={severityColor(f.severity)} appearance="outline">
                      {f.type}
                    </Badge>{' '}
                    {f.message}
                  </div>
                  {onItemAction && !applied.has(i) && (
                    <div>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<Wrench16Regular />}
                        disabled={busyItem === i}
                        onClick={() => onItemAction('fix-finding', f, i)}
                      >
                        {busyItem === i ? 'Fixing...' : 'Fix'}
                      </Button>
                    </div>
                  )}
                  {applied.has(i) && (
                    <Text size={100} style={{ color: tokens.colorPaletteGreenForeground1 }}>
                      <CheckmarkCircle16Regular /> Applied
                    </Text>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {Array.isArray(suggestions) && suggestions.length > 0 && (
          <>
            <Text className={styles.sectionLabel}>Suggestions</Text>
            {suggestions.map((s: string, i: number) => (
              <div key={i} className={styles.suggestion}>
                {'\u2022'} {s}
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // Normalize Names — array of { nodeId, currentName, suggestedName, reason }
  if (actionId === 'bcm.normalize_names' && Array.isArray(structured)) {
    if (structured.length === 0) {
      return (
        <div className={styles.container}>
          <Text size={200}>
            <CheckmarkCircle16Regular /> All names are consistent — no renames needed.
          </Text>
        </div>
      );
    }
    return (
      <div className={styles.container}>
        <Text weight="semibold" size={200}>
          {structured.length} rename{structured.length !== 1 ? 's' : ''} suggested
        </Text>
        {structured.map((item: any, i: number) => (
          <div key={i} className={`${styles.itemRow} ${applied.has(i) ? styles.itemApplied : ''}`}>
            <div className={styles.itemContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={styles.renameName}>{item.currentName}</span>
                <ArrowRight16Regular />
                <span className={styles.renameName}>{item.suggestedName}</span>
              </div>
              {item.reason && <div className={styles.renameReason}>{item.reason}</div>}
            </div>
            {onItemAction && !applied.has(i) && (
              <Button
                size="small"
                appearance="subtle"
                disabled={busyItem === i}
                onClick={() => onItemAction('apply-rename', item, i)}
              >
                {busyItem === i ? 'Applying...' : 'Apply'}
              </Button>
            )}
            {applied.has(i) && (
              <CheckmarkCircle16Regular
                style={{ color: tokens.colorPaletteGreenForeground1, flexShrink: 0 }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Suggest Merges — { suggestions: [{ nodeIds, reason, suggestedName, confidence }] }
  if (actionId === 'bcm.suggest_merges' && structured && typeof structured === 'object') {
    const suggestions = structured.suggestions;
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return (
        <div className={styles.container}>
          <Text size={200}>
            <CheckmarkCircle16Regular /> No merge opportunities found — the model looks clean.
          </Text>
        </div>
      );
    }
    return (
      <div className={styles.container}>
        <Text weight="semibold" size={200}>
          {suggestions.length} merge suggestion{suggestions.length !== 1 ? 's' : ''}
        </Text>
        {suggestions.map((s: any, i: number) => (
          <div
            key={i}
            className={`${styles.mergeCard} ${applied.has(i) ? styles.itemApplied : ''}`}
          >
            <div className={styles.mergeContent}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}
              >
                {s.suggestedName && (
                  <Text weight="semibold" size={200}>
                    {s.suggestedName}
                  </Text>
                )}
                {s.confidence && (
                  <Badge size="small" color={confidenceColor(s.confidence)} appearance="outline">
                    {s.confidence}
                  </Badge>
                )}
              </div>
              {s.reason && (
                <div style={{ fontSize: '12px', color: tokens.colorNeutralForeground2 }}>
                  {s.reason}
                </div>
              )}
            </div>
            {onItemAction && !applied.has(i) && (
              <Button
                size="small"
                appearance="subtle"
                disabled={busyItem === i}
                onClick={() => onItemAction('apply-merge', s, i)}
              >
                {busyItem === i ? 'Merging...' : 'Merge'}
              </Button>
            )}
            {applied.has(i) && (
              <CheckmarkCircle16Regular
                style={{ color: tokens.colorPaletteGreenForeground1, flexShrink: 0 }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Enrich Descriptions — array of { nodeId, description }
  if (actionId === 'bcm.enrich_descriptions' && Array.isArray(structured)) {
    if (structured.length === 0) {
      return (
        <div className={styles.container}>
          <Text size={200}>
            <CheckmarkCircle16Regular /> All capabilities already have descriptions.
          </Text>
        </div>
      );
    }
    return (
      <div className={styles.container}>
        <Text weight="semibold" size={200}>
          {structured.length} description{structured.length !== 1 ? 's' : ''} generated
        </Text>
        {structured.map((item: any, i: number) => (
          <div
            key={i}
            className={`${styles.enrichItem} ${applied.has(i) ? styles.itemApplied : ''}`}
          >
            <div className={styles.enrichContent}>
              <div className={styles.enrichNodeId}>{item.nodeId}</div>
              <div style={{ fontSize: '12px', marginTop: '2px' }}>{item.description}</div>
            </div>
            {onItemAction && !applied.has(i) && (
              <Button
                size="small"
                appearance="subtle"
                disabled={busyItem === i}
                onClick={() => onItemAction('apply-description', item, i)}
              >
                {busyItem === i ? 'Applying...' : 'Apply'}
              </Button>
            )}
            {applied.has(i) && (
              <CheckmarkCircle16Regular
                style={{ color: tokens.colorPaletteGreenForeground1, flexShrink: 0 }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Generate Review Brief — markdown content
  if (actionId === 'bcm.generate_review_brief') {
    return (
      <div className={styles.container}>
        <div className={styles.markdown}>
          <Markdown>{content}</Markdown>
        </div>
      </div>
    );
  }

  // Fallback — raw content
  return (
    <div className={styles.container}>
      <div className={styles.fallback}>{content}</div>
    </div>
  );
}
