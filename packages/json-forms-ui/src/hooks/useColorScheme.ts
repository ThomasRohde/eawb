import { useEffect, useState } from 'react';

type ColorScheme = 'light' | 'dark';

function readColorScheme(): ColorScheme {
  if (typeof document === 'undefined') return 'light';
  const explicit = document.documentElement.style.colorScheme;
  if (explicit === 'dark' || explicit === 'light') return explicit;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Subscribes to the workbench's resolved color scheme. The shell-ui theme
 * store writes `document.documentElement.style.colorScheme` whenever the user
 * (or OS, in system mode) changes themes, so we observe that single source of
 * truth without taking a hard dependency on `@ea-workbench/shell-ui`.
 */
export function useColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(() => readColorScheme());

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    const sync = () => {
      const next = readColorScheme();
      setScheme((prev) => (prev === next ? prev : next));
    };

    // 1. Watch for explicit overrides written by the shell theme store.
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['style'] });

    // 2. Watch the OS preference for "system" mode (when no explicit override
    //    is set, readColorScheme falls through to matchMedia).
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', sync);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
    };
  }, []);

  return scheme;
}
