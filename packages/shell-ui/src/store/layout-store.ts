import { create } from 'zustand';
import type { DockviewApi } from 'dockview';
import { useThemeStore } from './theme-store.js';

interface PanelDef {
  id: string;
  component: string;
  title: string;
}

const ALL_PANELS: PanelDef[] = [
  { id: 'bcm-tree', component: 'bcm-tree', title: 'Tree' },
  { id: 'bcm-ai', component: 'bcm-ai', title: 'AI Actions' },
  { id: 'bcm-hierarchy', component: 'bcm-hierarchy', title: 'Hierarchy' },
  { id: 'bcm-map', component: 'bcm-map', title: 'Capability Map' },
  { id: 'chat-panel', component: 'chat-panel', title: 'AI Chat' },
  { id: 'bcm-inspector', component: 'bcm-inspector', title: 'Inspector' },
  { id: 'bcm-export', component: 'bcm-export', title: 'Export' },
  { id: 'bcm-models', component: 'bcm-models', title: 'Models' },
  { id: 'md-editor', component: 'md-editor', title: 'Editor' },
  { id: 'version-history', component: 'version-history', title: 'Version History' },
  { id: 'help-panel', component: 'help-panel', title: 'Help' },
];

const LAYOUT_KEY = 'eawb_layout';

/** Safe localStorage wrapper that degrades to no-op on storage-restricted environments. */
export const layoutStorage = {
  load(): ReturnType<DockviewApi['toJSON']> | null {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(api: DockviewApi): void {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(api.toJSON()));
    } catch {
      // Storage unavailable — degrade silently
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(LAYOUT_KEY);
    } catch {
      // Storage unavailable — degrade silently
    }
  },
};

interface LayoutState {
  api: DockviewApi | null;
  /**
   * Generation counter for persistence suspension. When > 0, onDidLayoutChange
   * should skip persistence. Incremented on reset start, decremented after a
   * microtask to let dockview's buffered layout-change events drain first.
   */
  suspendPersistence: number;
  setApi: (api: DockviewApi) => void;
  openPanel: (id: string) => void;
  resetLayout: () => void;
  popoutPanel: (id: string) => void;
  floatPanel: (id: string) => void;
  toggleMaximize: (panelId: string) => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  api: null,
  suspendPersistence: 0,

  setApi: (api) => set({ api }),

  openPanel: (id) => {
    const { api } = get();
    if (!api) return;

    // If panel already exists, focus it
    const existing = api.panels.find((p) => p.id === id);
    if (existing) {
      existing.api.setActive();
      return;
    }

    // Otherwise create it
    const def = ALL_PANELS.find((p) => p.id === id);
    if (!def) return;

    api.addPanel({
      id: def.id,
      component: def.component,
      title: def.title,
    });
  },

  popoutPanel: (id) => {
    const { api } = get();
    if (!api) return;
    const panel = api.panels.find((p) => p.id === id);
    if (!panel) return;
    const resolved = useThemeStore.getState().resolved;
    api.addPopoutGroup(panel, {
      popoutUrl: '/popout.html',
      onDidOpen: ({ window: w }) => {
        w.document.title = `EA Workbench — ${panel.title ?? panel.id}`;
        const bg = resolved === 'dark' ? '#292929' : '#ffffff';
        w.document.documentElement.style.colorScheme = resolved;
        w.document.body.style.backgroundColor = bg;
      },
    });
  },

  floatPanel: (id) => {
    const { api } = get();
    if (!api) return;
    const panel = api.panels.find((p) => p.id === id);
    if (!panel) return;
    const width = Math.min(600, api.width * 0.6);
    const height = Math.min(400, api.height * 0.6);
    api.addFloatingGroup(panel, {
      x: (api.width - width) / 2,
      y: (api.height - height) / 2,
      width,
      height,
    });
  },

  toggleMaximize: (panelId) => {
    const { api } = get();
    if (!api) return;
    const panel = api.panels.find((p) => p.id === panelId);
    if (!panel) return;
    if (api.hasMaximizedGroup()) {
      api.exitMaximizedGroup();
    } else {
      api.maximizeGroup(panel);
    }
  },

  resetLayout: () => {
    const { api } = get();
    if (!api) return;

    // Suspend persistence so intermediate states and buffered events are not saved.
    // Uses a counter so nested/concurrent resets don't prematurely re-enable.
    set((s) => ({ suspendPersistence: s.suspendPersistence + 1 }));

    let failed = false;
    try {
      // Remove all panels
      for (const panel of [...api.panels]) {
        panel.api.close();
      }

      // Recreate default layout
      const treePanel = api.addPanel({
        id: 'bcm-tree',
        component: 'bcm-tree',
        title: 'Tree',
      });

      api.addPanel({
        id: 'bcm-hierarchy',
        component: 'bcm-hierarchy',
        title: 'Hierarchy',
        position: { referencePanel: treePanel, direction: 'right' },
      });

      api.addPanel({
        id: 'bcm-inspector',
        component: 'bcm-inspector',
        title: 'Inspector',
        position: { referencePanel: 'bcm-hierarchy', direction: 'right' },
      });

      api.addPanel({
        id: 'bcm-export',
        component: 'bcm-export',
        title: 'Export',
        position: { referencePanel: 'bcm-inspector', direction: 'within' },
      });

      api.addPanel({
        id: 'bcm-ai',
        component: 'bcm-ai',
        title: 'AI Actions',
        position: { referencePanel: treePanel, direction: 'within' },
      });

      api.addPanel({
        id: 'bcm-models',
        component: 'bcm-models',
        title: 'Models',
        position: { referencePanel: treePanel, direction: 'within' },
      });

      api.addPanel({
        id: 'bcm-map',
        component: 'bcm-map',
        title: 'Capability Map',
        position: { referencePanel: 'bcm-hierarchy', direction: 'within' },
      });

      api.addPanel({
        id: 'chat-panel',
        component: 'chat-panel',
        title: 'AI Chat',
        position: { referencePanel: 'bcm-hierarchy', direction: 'within' },
      });

      // Persist the completed layout once
      layoutStorage.save(api);
    } catch {
      failed = true;
      // If rebuild fails, clear storage so next boot gets a clean default
      layoutStorage.clear();
    } finally {
      // Dockview buffers onDidLayoutChange to a microtask. Defer re-enabling
      // persistence so that any queued layout-change callback still sees the
      // suspension and skips saving (especially important after a failed reset).
      queueMicrotask(() => {
        set((s) => ({ suspendPersistence: Math.max(0, s.suspendPersistence - 1) }));
        // If the reset failed, clear again in case the deferred callback re-saved
        if (failed) layoutStorage.clear();
      });
    }
  },
}));

export { ALL_PANELS };
export type { PanelDef };
