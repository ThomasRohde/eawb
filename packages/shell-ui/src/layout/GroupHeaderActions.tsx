import { useCallback, useState, useEffect } from 'react';
import { Button, Tooltip, makeStyles } from '@fluentui/react-components';
import {
  Maximize20Regular,
  SquareMultiple20Regular,
  WindowNew20Regular,
  AppFolder20Regular,
} from '@fluentui/react-icons';
import type { IDockviewHeaderActionsProps } from 'dockview';
import { useThemeStore } from '../store/theme-store.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    paddingRight: '4px',
  },
});

export function GroupHeaderActions({
  api,
  containerApi,
  activePanel,
}: IDockviewHeaderActionsProps) {
  const styles = useStyles();
  const [isMaximized, setIsMaximized] = useState(() => api.isMaximized());

  useEffect(() => {
    const disposable = containerApi.onDidMaximizedGroupChange(() => {
      setIsMaximized(api.isMaximized());
    });
    return () => disposable.dispose();
  }, [api, containerApi]);

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      api.exitMaximized();
    } else {
      api.maximize();
    }
  }, [api, isMaximized]);

  const handleFloat = useCallback(() => {
    if (!activePanel) return;
    containerApi.addFloatingGroup(activePanel, {
      width: 600,
      height: 400,
    });
  }, [activePanel, containerApi]);

  const handlePopout = useCallback(() => {
    if (!activePanel) return;
    const resolved = useThemeStore.getState().resolved;
    containerApi.addPopoutGroup(activePanel, {
      popoutUrl: '/popout.html',
      onDidOpen: ({ window: w }) => {
        w.document.title = `EA Workbench — ${activePanel.title ?? activePanel.id}`;
        const bg = resolved === 'dark' ? '#292929' : '#ffffff';
        w.document.documentElement.style.colorScheme = resolved;
        w.document.body.style.backgroundColor = bg;
      },
    });
  }, [activePanel, containerApi]);

  const locationType = api.location.type;
  const isFloating = locationType === 'floating';
  const isPopout = locationType === 'popout';

  return (
    <div className={styles.root}>
      {!isFloating && !isPopout && (
        <Tooltip content="Float panel" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<AppFolder20Regular />}
            onClick={handleFloat}
          />
        </Tooltip>
      )}
      {!isPopout && (
        <Tooltip content={isMaximized ? 'Restore' : 'Maximize'} relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={isMaximized ? <SquareMultiple20Regular /> : <Maximize20Regular />}
            onClick={handleMaximize}
          />
        </Tooltip>
      )}
      {!isPopout && (
        <Tooltip content="Open in new window" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<WindowNew20Regular />}
            onClick={handlePopout}
          />
        </Tooltip>
      )}
    </div>
  );
}
