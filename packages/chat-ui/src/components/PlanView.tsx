import { makeStyles, tokens, Caption1, Text } from '@fluentui/react-components';
import {
  Circle16Regular,
  ArrowCircleRight16Regular,
  CheckmarkCircle16Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  entry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    padding: '3px 0',
  },
  iconPending: { color: tokens.colorNeutralForeground3 },
  iconInProgress: { color: tokens.colorBrandForeground1 },
  iconCompleted: { color: tokens.colorPaletteGreenForeground1 },
  textPending: { color: tokens.colorNeutralForeground3 },
  textInProgress: { color: tokens.colorNeutralForeground1, fontWeight: '600' as any },
  textCompleted: { color: tokens.colorNeutralForeground3, textDecorationLine: 'line-through' },
  priorityHigh: {
    fontSize: '10px',
    padding: '0 4px',
    borderRadius: '3px',
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
    fontWeight: '600' as any,
    lineHeight: '16px',
  },
  priorityMedium: {
    fontSize: '10px',
    padding: '0 4px',
    borderRadius: '3px',
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteYellowForeground2,
    fontWeight: '600' as any,
    lineHeight: '16px',
  },
  priorityLow: {
    fontSize: '10px',
    padding: '0 4px',
    borderRadius: '3px',
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground3,
    fontWeight: '600' as any,
    lineHeight: '16px',
  },
});

interface PlanEntry {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

const STATUS_ICON = {
  pending: Circle16Regular,
  in_progress: ArrowCircleRight16Regular,
  completed: CheckmarkCircle16Regular,
} as const;

const STATUS_STYLE_KEY = {
  pending: 'iconPending',
  in_progress: 'iconInProgress',
  completed: 'iconCompleted',
} as const;

const TEXT_STYLE_KEY = {
  pending: 'textPending',
  in_progress: 'textInProgress',
  completed: 'textCompleted',
} as const;

const PRIORITY_STYLE_KEY = {
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
} as const;

export function PlanView({ entries }: { entries: PlanEntry[] }) {
  const styles = useStyles();

  if (!entries.length) return null;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={200} weight="semibold">
          Plan
        </Text>
        <Caption1>
          {entries.filter((e) => e.status === 'completed').length}/{entries.length} done
        </Caption1>
      </div>
      {entries.map((entry, i) => {
        const Icon = STATUS_ICON[entry.status];
        return (
          <div key={i} className={styles.entry}>
            <Icon className={styles[STATUS_STYLE_KEY[entry.status]]} />
            <Caption1 className={styles[TEXT_STYLE_KEY[entry.status]]} style={{ flex: 1 }}>
              {entry.content}
            </Caption1>
            {entry.priority !== 'medium' && (
              <span className={styles[PRIORITY_STYLE_KEY[entry.priority]]}>{entry.priority}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
