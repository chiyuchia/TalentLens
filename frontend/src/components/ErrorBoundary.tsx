import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { getErrorMessage } from "../lib/errors";
import { useUiStore } from "../lib/ui-store";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    useUiStore.getState().pushError({
      title: "页面运行异常",
      message: getErrorMessage(error, "页面渲染失败，请刷新后重试。"),
    });
    console.error(error, errorInfo);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <section className="w-full max-w-lg rounded-lg border border-border bg-muted/30 p-6 text-center shadow-sm animate-scale-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">页面遇到问题</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(this.state.error, "页面渲染失败，请刷新后重试。")}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4" />
            重试
          </button>
        </section>
      </main>
    );
  }
}
