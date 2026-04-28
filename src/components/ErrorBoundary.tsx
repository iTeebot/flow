import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-text-primary">
          <div className="rounded-2xl border border-error/20 bg-error/5 p-8 text-center shadow-lg max-w-md w-full">
            <h1 className="mb-4 text-2xl font-black text-error">Something went wrong</h1>
            <p className="text-sm text-text-muted mb-6">
              An unexpected error occurred in the application. Please try restarting the application.
            </p>
            {this.state.error && (
              <div className="mb-6 w-full rounded-lg bg-background/50 p-4 text-left overflow-auto max-h-48 border border-error/20">
                <p className="text-[11px] font-mono text-error/80 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
