import { makeStyles, tokens } from '@fluentui/react-components';
import { WorkbenchLayout } from './layout/WorkbenchLayout.js';
import { Sidebar } from './shell/Sidebar.js';
import { StatusBar } from './shell/StatusBar.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    minWidth: '200px',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'auto',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});

export function App() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.main}>
        <div className={styles.sidebar}>
          <Sidebar />
        </div>
        <div className={styles.content}>
          <WorkbenchLayout />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
