import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Select,
  Spinner,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  ArrowDownload24Regular,
  Save24Regular,
} from '@fluentui/react-icons';
import { useBcmStore } from '../store/bcm-store.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '16px',
    gap: '16px',
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    padding: '24px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  preview: {
    flex: 1,
    overflow: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    padding: '12px',
    fontFamily: 'monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

export function BcmExportPanel() {
  const styles = useStyles();
  const { activeModelId } = useBcmStore();
  const [format, setFormat] = useState<string>('markdown');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ content: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!activeModelId) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <Text>Select a model to export</Text>
        </div>
      </div>
    );
  }

  const handleExport = async (save: boolean) => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          toolId: 'bcm-studio',
          artifactId: activeModelId,
          save,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResult({ content: data.data.content, filename: data.data.filename });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.root}>
      <Text weight="semibold">Export Model</Text>

      <Select value={format} onChange={(_, d) => setFormat(d.value)}>
        <option value="markdown">Markdown</option>
        <option value="html">HTML</option>
        <option value="svg">SVG</option>
      </Select>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          icon={exporting ? <Spinner size="tiny" /> : <ArrowDownload24Regular />}
          onClick={() => handleExport(false)}
          disabled={exporting}
        >
          Preview
        </Button>
        <Button
          icon={<Save24Regular />}
          onClick={() => handleExport(true)}
          disabled={exporting}
        >
          Export & Save
        </Button>
        {result && (
          <Button onClick={handleDownload}>
            Download
          </Button>
        )}
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {result && (
        <div className={styles.preview}>
          {format === 'html' ? (
            <iframe
              srcDoc={result.content}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Export preview"
            />
          ) : (
            result.content
          )}
        </div>
      )}
    </div>
  );
}
