import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Resolved theme based on mode + system preference */
  resolved: 'light' | 'dark';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      resolved: resolveTheme('system'),
      setMode: (mode) => set({ mode, resolved: resolveTheme(mode) }),
    }),
    {
      name: 'eawb-theme',
      partialize: (state) => ({ mode: state.mode }),
      // After rehydration, recompute resolved via setState so React re-renders
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          const resolved = resolveTheme(state.mode);
          // Must use setState — direct mutation won't trigger re-renders
          useThemeStore.setState({ resolved });
          applyThemeToDocument(resolved);
        }
      },
    },
  ),
);

// Sync <body> and <html> with the resolved theme so there's no background
// mismatch behind the FluentProvider container.
function applyThemeToDocument(resolved: 'light' | 'dark') {
  const bg = resolved === 'dark' ? '#292929' : '#ffffff';
  document.documentElement.style.colorScheme = resolved;
  document.body.style.backgroundColor = bg;
}

if (typeof window !== 'undefined') {
  // Apply on initial load (before rehydration completes)
  applyThemeToDocument(useThemeStore.getState().resolved);

  // Apply whenever resolved theme changes
  useThemeStore.subscribe((state, prev) => {
    if (state.resolved !== prev.resolved) {
      applyThemeToDocument(state.resolved);
    }
  });

  // Listen for OS theme changes when in system mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { mode } = useThemeStore.getState();
    if (mode === 'system') {
      useThemeStore.setState({ resolved: resolveTheme('system') });
    }
  });
}
