import { useRef, useState, useEffect, useMemo, type ReactNode } from 'react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { createDOMRenderer, RendererProvider } from '@griffel/react';
import { useThemeStore } from '../store/theme-store.js';

/**
 * Detects when a panel is rendered in a Dockview popout window and wraps it
 * with FluentProvider + Griffel RendererProvider targeting the popout document,
 * so both theme CSS variables and Griffel atomic CSS classes are injected into
 * the correct document.
 *
 * Dockview moves DOM nodes into the popout window *after* the React component
 * has mounted, so we poll via setInterval until ownerDocument diverges from the
 * main document.
 */
export function PopoutStyleProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [targetDoc, setTargetDoc] = useState<Document | null>(null);
  const resolved = useThemeStore((s) => s.resolved);

  useEffect(() => {
    const id = setInterval(() => {
      const el = ref.current;
      if (el && el.ownerDocument !== document) {
        setTargetDoc(el.ownerDocument);
        clearInterval(id);
      }
    }, 100);

    return () => clearInterval(id);
  }, []);

  const renderer = useMemo(() => (targetDoc ? createDOMRenderer(targetDoc) : null), [targetDoc]);

  if (targetDoc && renderer) {
    const theme = resolved === 'dark' ? webDarkTheme : webLightTheme;
    return (
      <RendererProvider renderer={renderer} targetDocument={targetDoc}>
        <FluentProvider
          theme={theme}
          targetDocument={targetDoc}
          style={{ height: '100%', width: '100%' }}
        >
          <div ref={ref} style={{ height: '100%', width: '100%' }}>
            {children}
          </div>
        </FluentProvider>
      </RendererProvider>
    );
  }

  return (
    <div ref={ref} style={{ height: '100%', width: '100%' }}>
      {children}
    </div>
  );
}
