import { Component, type ReactNode } from 'react';
import { Button, Text, tokens } from '@fluentui/react-components';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Text weight="semibold" style={{ color: tokens.colorPaletteRedForeground1 }}>
            Panel Error
          </Text>
          <br />
          <Text size={200}>{this.state.error}</Text>
          <br /><br />
          <Button size="small" onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
