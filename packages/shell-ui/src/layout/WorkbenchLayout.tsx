import { useCallback, useEffect, type ComponentType } from 'react';
import { DockviewReact, themeAbyss, themeLight, type DockviewReadyEvent } from 'dockview';
import 'dockview/dist/styles/dockview.css';
import { WelcomePanel } from '../panels/WelcomePanel.js';
import {
  BcmTreeView,
  BcmHierarchyView,
  BcmInspector,
  BcmExportPanel,
  BcmModelManagerPanel,
  BcmMapPanel,
} from '@ea-workbench/bcm-ui';
import { AIActionsPanel } from '../panels/AIActionsPanel.js';
import { ChatPanel } from '@ea-workbench/chat-ui';
import { MarkdownEditorPanel, useEditorStore } from '@ea-workbench/editor-ui';
import { HelpPanel } from '@ea-workbench/help-ui';
import { FormSchemaDesignerPanel, FormFillerPanel } from '@ea-workbench/json-forms-ui';
import { VersionHistoryPanel } from '../panels/VersionHistoryPanel.js';
import { SettingsPanel } from '../panels/SettingsPanel.js';
import { useLayoutStore, layoutStorage, PANEL_TO_TOOL } from '../store/layout-store.js';
import { useThemeStore } from '../store/theme-store.js';
import { ErrorBoundary } from '../ErrorBoundary.js';
import { GroupHeaderActions } from './GroupHeaderActions.js';
import { EmptyGroupWatermark } from './EmptyGroupWatermark.js';
import { PopoutStyleProvider } from './PopoutStyleProvider.js';

function withErrorBoundary(Component: ComponentType<any>) {
  return function WrappedPanel(props: any) {
    return (
      <PopoutStyleProvider>
        <ErrorBoundary>
          <Component {...props} />
        </ErrorBoundary>
      </PopoutStyleProvider>
    );
  };
}

const components: Record<string, any> = {
  welcome: withErrorBoundary(WelcomePanel),
  'bcm-tree': withErrorBoundary(BcmTreeView),
  'bcm-hierarchy': withErrorBoundary(BcmHierarchyView),
  'bcm-inspector': withErrorBoundary(BcmInspector),
  'bcm-export': withErrorBoundary(BcmExportPanel),
  'bcm-ai': withErrorBoundary(AIActionsPanel),
  'bcm-models': withErrorBoundary(BcmModelManagerPanel),
  'bcm-map': withErrorBoundary(BcmMapPanel),
  'chat-panel': withErrorBoundary(ChatPanel),
  'md-editor': withErrorBoundary(MarkdownEditorPanel),
  'version-history': withErrorBoundary(VersionHistoryPanel),
  'help-panel': withErrorBoundary(HelpPanel),
  'settings-panel': withErrorBoundary(SettingsPanel),
  'json-forms-designer': withErrorBoundary(FormSchemaDesignerPanel),
  'json-forms-filler': withErrorBoundary(FormFillerPanel),
};

export function WorkbenchLayout() {
  const setApi = useLayoutStore((s) => s.setApi);
  const setActiveToolId = useLayoutStore((s) => s.setActiveToolId);
  const openPanel = useLayoutStore((s) => s.openPanel);
  const resetLayout = useLayoutStore((s) => s.resetLayout);
  const resolved = useThemeStore((s) => s.resolved);
  const dockviewTheme = resolved === 'dark' ? themeAbyss : themeLight;

  // Listen for cross-package document open events (e.g. from AI Chat)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.docId) {
        useEditorStore.getState().openDocument(detail.docId);
        openPanel('md-editor');
      }
    };
    window.addEventListener('eawb:open-document', handler);
    return () => window.removeEventListener('eawb:open-document', handler);
  }, [openPanel]);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      setApi(event.api);

      const saved = layoutStorage.load();
      if (saved) {
        try {
          event.api.fromJSON(saved);

          // If all panels were closed, reset to default
          if (event.api.panels.length === 0) {
            resetLayout();
          }
        } catch {
          // Corrupted layout — fall through to default
          resetLayout();
        }
      } else {
        resetLayout();
      }

      // Persist on changes, respecting suspension during resets
      event.api.onDidLayoutChange(() => {
        if (useLayoutStore.getState().suspendPersistence === 0) {
          layoutStorage.save(event.api);
        }
      });

      // Track which tool owns the active panel
      event.api.onDidActivePanelChange((e) => {
        if (e) {
          const toolId = PANEL_TO_TOOL[e.id] ?? null;
          if (toolId) setActiveToolId(toolId);
        }
      });
    },
    [setApi, resetLayout],
  );

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <DockviewReact
        theme={dockviewTheme}
        onReady={onReady}
        components={components}
        popoutUrl="/popout.html"
        floatingGroupBounds="boundedWithinViewport"
        rightHeaderActionsComponent={GroupHeaderActions}
        watermarkComponent={EmptyGroupWatermark}
      />
    </div>
  );
}
