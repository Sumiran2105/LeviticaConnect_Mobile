import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useLocation } from "react-router-dom";

import { reportUnexpectedError } from "@/lib/monitoring";

class RouteErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    reportUnexpectedError(error, {
      source: "route-boundary",
      routeName: this.props.routeName,
      componentStack: errorInfo.componentStack,
    });
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
        <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-normal">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This page hit an unexpected problem. You can retry the page without losing the rest of the app.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Retry
          </button>
        </section>
      </main>
    );
  }
}

export function RouteErrorBoundary({ children, routeName }) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}`;

  return (
    <RouteErrorBoundaryInner routeName={routeName} resetKey={resetKey}>
      {children}
    </RouteErrorBoundaryInner>
  );
}
