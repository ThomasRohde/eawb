import { makeStyles, tokens, Text, Button, Caption1 } from '@fluentui/react-components';
import { ShieldQuestion20Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  overlay: {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 200,
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '8px',
    boxShadow: tokens.shadow16,
    padding: '16px',
    maxWidth: '360px',
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    color: tokens.colorPaletteYellowForeground1,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
});

interface PermissionOption {
  id: string;
  label: string;
}

interface PermissionDialogProps {
  requestId: string;
  title: string;
  description?: string | null;
  options: PermissionOption[];
  onResolve: (requestId: string, optionId: string | null) => void;
}

export function PermissionDialog({
  requestId,
  title,
  description,
  options,
  onResolve,
}: PermissionDialogProps) {
  const styles = useStyles();

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <ShieldQuestion20Regular className={styles.icon} />
          <Text weight="semibold">{title}</Text>
        </div>
        {description && (
          <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{description}</Caption1>
        )}
        <div className={styles.actions}>
          <Button appearance="secondary" size="small" onClick={() => onResolve(requestId, null)}>
            Cancel
          </Button>
          {options.map((opt) => (
            <Button
              key={opt.id}
              appearance={opt.label.toLowerCase().includes('reject') ? 'secondary' : 'primary'}
              size="small"
              onClick={() => onResolve(requestId, opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
