import { makeStyles, tokens, Text, Button } from '@fluentui/react-components';
import { CheckmarkCircle16Regular } from '@fluentui/react-icons';
import Markdown from 'react-markdown';
import type { AIResultRendererProps } from '@ea-workbench/tool-api';

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
  fallback: {
    fontFamily: 'monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
  },
});

export function EditorResultRenderer({
  content,
  structured,
  onItemAction,
  appliedItems,
  busyItem,
}: AIResultRendererProps) {
  const styles = useStyles();
  const applied = appliedItems ?? new Set<number>();

  // All editor actions return markdown/text content to replace the document
  const text = typeof structured === 'string' ? structured : content;

  return (
    <div className={styles.container}>
      <div className={styles.markdown}>
        <Markdown>{text}</Markdown>
      </div>
      {onItemAction && !applied.has(0) && (
        <Button
          size="small"
          appearance="primary"
          disabled={busyItem === 0}
          onClick={() => onItemAction('replace', { content: text }, 0)}
        >
          {busyItem === 0 ? 'Replacing...' : 'Replace Document Content'}
        </Button>
      )}
      {applied.has(0) && (
        <Text size={100} style={{ color: tokens.colorPaletteGreenForeground1 }}>
          <CheckmarkCircle16Regular /> Applied
        </Text>
      )}
    </div>
  );
}
