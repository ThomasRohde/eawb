import {
  makeStyles,
  tokens,
  Title1,
  Body1,
  Card,
  CardHeader,
  Button,
} from '@fluentui/react-components';
import {
  DocumentAdd24Regular,
  FolderOpen24Regular,
  Info24Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
    gap: '24px',
  },
  title: {
    marginBottom: '8px',
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
    marginBottom: '24px',
    textAlign: 'center',
  },
  cards: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    width: '200px',
    cursor: 'pointer',
  },
});

export function WelcomePanel() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Title1 className={styles.title}>EA Workbench</Title1>
      <Body1 className={styles.subtitle}>
        Repo-native enterprise architecture workbench
      </Body1>

      <div className={styles.cards}>
        <Card className={styles.card}>
          <CardHeader
            image={<DocumentAdd24Regular />}
            header={<Body1><strong>New Model</strong></Body1>}
            description="Create a new capability model"
          />
        </Card>

        <Card className={styles.card}>
          <CardHeader
            image={<FolderOpen24Regular />}
            header={<Body1><strong>Open Model</strong></Body1>}
            description="Open an existing model"
          />
        </Card>

        <Card className={styles.card}>
          <CardHeader
            image={<Info24Regular />}
            header={<Body1><strong>Documentation</strong></Body1>}
            description="View workbench help"
          />
        </Card>
      </div>
    </div>
  );
}
