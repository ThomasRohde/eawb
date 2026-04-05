import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { DocumentText24Regular } from '@fluentui/react-icons';
import type { IWatermarkPanelProps } from 'dockview';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '12px',
    color: tokens.colorNeutralForeground4,
    userSelect: 'none',
  },
});

export function EmptyGroupWatermark(_props: IWatermarkPanelProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <DocumentText24Regular />
      <Text size={300}>Open a panel from the sidebar</Text>
    </div>
  );
}
