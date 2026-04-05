import { makeStyles, tokens, Caption1, Tooltip } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  barOuter: {
    width: '80px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: tokens.colorNeutralBackground4,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: '3px',
    transitionProperty: 'width',
    transitionDuration: '300ms',
  },
  barNormal: { backgroundColor: tokens.colorBrandBackground },
  barWarning: { backgroundColor: tokens.colorPaletteYellowBackground2 },
  barDanger: { backgroundColor: tokens.colorPaletteRedBackground3 },
});

interface UsageBarProps {
  used: number;
  size: number;
  cost?: { amount: number; currency: string } | null;
}

export function UsageBar({ used, size, cost }: UsageBarProps) {
  const styles = useStyles();
  const pct = size > 0 ? Math.min((used / size) * 100, 100) : 0;

  const barColor = pct >= 90 ? styles.barDanger : pct >= 70 ? styles.barWarning : styles.barNormal;

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const tooltip = [
    `${formatTokens(used)} / ${formatTokens(size)} tokens (${pct.toFixed(0)}%)`,
    cost ? `Cost: ${cost.currency} ${cost.amount.toFixed(4)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Tooltip content={tooltip} relationship="label">
      <div className={styles.root}>
        <div className={styles.barOuter}>
          <div className={`${styles.barInner} ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          {formatTokens(used)}/{formatTokens(size)}
        </Caption1>
        {cost && (
          <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
            {cost.currency}&nbsp;{cost.amount.toFixed(4)}
          </Caption1>
        )}
      </div>
    </Tooltip>
  );
}
