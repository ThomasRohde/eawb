import { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Tree,
  TreeItem,
  TreeItemLayout,
  Button,
  Divider,
  Spinner,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItemRadio,
  type MenuProps,
} from '@fluentui/react-components';
import {
  Grid24Regular,
  DocumentText24Regular,
  Apps24Regular,
  ArrowReset24Regular,
  Settings24Regular,
  WeatherSunny24Regular,
  WeatherMoon24Regular,
  DesktopSync24Regular,
} from '@fluentui/react-icons';
import { useTools } from '../api/tools.js';
import { useLayoutStore, ALL_PANELS } from '../store/layout-store.js';
import { useThemeStore, type ThemeMode } from '../store/theme-store.js';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logo: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  section: {
    padding: '8px',
  },
  sectionTitle: {
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    color: tokens.colorNeutralForeground3,
    letterSpacing: '0.5px',
  },
  spacer: {
    flex: 1,
  },
  footer: {
    padding: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
});

// Map tool IDs to their primary panel
const TOOL_PANELS: Record<string, string> = {
  'bcm-studio': 'bcm-tree',
  'acp-chat': 'chat-panel',
  'markdown-editor': 'md-editor',
  help: 'help-panel',
};

// Map artifact sections to panels
const ARTIFACT_PANELS: Record<string, string> = {
  Models: 'bcm-tree',
  Decisions: 'bcm-tree',
  Reviews: 'bcm-tree',
};

interface WorkspaceInfo {
  name: string;
  initialized: boolean;
}

const THEME_ICONS: Record<ThemeMode, React.JSX.Element> = {
  light: <WeatherSunny24Regular />,
  dark: <WeatherMoon24Regular />,
  system: <DesktopSync24Regular />,
};

const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function Sidebar() {
  const styles = useStyles();
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const { data: tools, isLoading: toolsLoading } = useTools();
  const openPanel = useLayoutStore((s) => s.openPanel);
  const resetLayout = useLayoutStore((s) => s.resetLayout);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const onThemeChange: MenuProps['onCheckedValueChange'] = (_e, data) => {
    const value = data.checkedItems[0] as ThemeMode;
    if (value) setThemeMode(value);
  };

  useEffect(() => {
    fetch('/api/workspace')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.data) {
          setWorkspace({
            name: data.data.config?.name ?? 'Workspace',
            initialized: data.data.initialized,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Grid24Regular />
        <Text className={styles.logo}>{workspace?.name ?? 'EA Workbench'}</Text>
      </div>

      <Divider />

      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Tools</Text>
        {toolsLoading ? (
          <Spinner size="tiny" />
        ) : (
          <Tree aria-label="Tools">
            {(tools ?? []).map((tool) => (
              <TreeItem
                key={tool.id}
                itemType="leaf"
                onClick={() => {
                  const panelId = TOOL_PANELS[tool.id];
                  if (panelId) openPanel(panelId);
                }}
              >
                <TreeItemLayout iconBefore={<Apps24Regular />}>{tool.name}</TreeItemLayout>
              </TreeItem>
            ))}
          </Tree>
        )}
      </div>

      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Panels</Text>
        <Tree aria-label="Panels">
          {ALL_PANELS.map((panel) => (
            <TreeItem key={panel.id} itemType="leaf" onClick={() => openPanel(panel.id)}>
              <TreeItemLayout iconBefore={<DocumentText24Regular />}>{panel.title}</TreeItemLayout>
            </TreeItem>
          ))}
        </Tree>
      </div>

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <Button
          appearance="subtle"
          icon={<Settings24Regular />}
          size="small"
          onClick={() => openPanel('settings-panel')}
        >
          Settings
        </Button>
        <Button
          appearance="subtle"
          icon={<ArrowReset24Regular />}
          size="small"
          onClick={resetLayout}
        >
          Reset Layout
        </Button>
        <Menu checkedValues={{ theme: [themeMode] }} onCheckedValueChange={onThemeChange}>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" icon={THEME_ICONS[themeMode]} size="small">
              {THEME_LABELS[themeMode]} Theme
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItemRadio icon={<WeatherSunny24Regular />} name="theme" value="light">
                Light
              </MenuItemRadio>
              <MenuItemRadio icon={<WeatherMoon24Regular />} name="theme" value="dark">
                Dark
              </MenuItemRadio>
              <MenuItemRadio icon={<DesktopSync24Regular />} name="theme" value="system">
                System
              </MenuItemRadio>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </div>
  );
}
