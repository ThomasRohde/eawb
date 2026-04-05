import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Select,
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  Label,
} from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { useModels, useCreateModel } from '../api/hooks.js';
import { useBcmStore } from '../store/bcm-store.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  select: {
    flex: 1,
  },
});

export function ModelSelector() {
  const styles = useStyles();
  const { data: models } = useModels();
  const createModel = useCreateModel();
  const { activeModelId, setActiveModel } = useBcmStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const result = await createModel.mutateAsync({ title: newTitle.trim() });
    setActiveModel(result.id);
    setNewTitle('');
    setDialogOpen(false);
  };

  return (
    <div className={styles.root}>
      <Select
        className={styles.select}
        value={activeModelId ?? ''}
        onChange={(_, data) => setActiveModel(data.value || null)}
      >
        <option value="">Select a model...</option>
        {(models ?? []).map((m) => (
          <option key={m.id} value={m.id}>
            {m.title} ({m.nodeCount} nodes)
          </option>
        ))}
      </Select>

      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Button icon={<Add24Regular />} size="small" title="New model" />
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>New Capability Model</DialogTitle>
            <DialogContent>
              <Label htmlFor="model-title">Title</Label>
              <Input
                id="model-title"
                value={newTitle}
                onChange={(_, data) => setNewTitle(data.value)}
                placeholder="e.g. Core Banking Capabilities"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleCreate} disabled={!newTitle.trim()}>
                Create
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
