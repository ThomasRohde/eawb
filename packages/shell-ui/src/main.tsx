import { createRoot } from 'react-dom/client';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.js';
import { useThemeStore } from './store/theme-store.js';

const queryClient = new QueryClient();

function Root() {
  const resolved = useThemeStore((s) => s.resolved);
  const theme = resolved === 'dark' ? webDarkTheme : webLightTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <FluentProvider theme={theme}>
        <App />
      </FluentProvider>
    </QueryClientProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Root />);
