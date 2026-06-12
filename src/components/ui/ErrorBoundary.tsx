// Top-level error boundary. Catches any uncaught render-time errors
// anywhere in the React tree and shows a friendly fallback UI instead
// of letting the whole app go to a blank black screen. Also logs the
// error to the live console (if it exists) so the user can debug.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
    this.setState({ info });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    const { error, info } = this.state;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg-primary text-text-primary">
        <div className="card p-6 max-w-2xl w-full space-y-4">
          <div>
            <p className="text-down text-sm font-semibold uppercase tracking-wide">Something went wrong</p>
            <h1 className="text-2xl font-bold mt-1">The app hit an unexpected error</h1>
            <p className="text-text-secondary mt-2 text-sm">
              The error was caught and the rest of the page is still usable. You can retry,
              reset the page, or copy the error details to share with support.
            </p>
          </div>
          {error && (
            <pre className="text-xs bg-bg-tertiary p-3 rounded overflow-auto max-h-48 border border-border">
              <code>{error.name}: {error.message}
{info?.componentStack ?? ''}</code>
            </pre>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={this.handleReset} className="btn-primary text-sm">Try again</button>
            <button onClick={this.handleReload} className="btn-outline text-sm">Reload page</button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
              className="btn-ghost text-sm"
            >
              Clear local data & reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
