import * as React from "react";

import { resolveClerkKey } from "../lib/shell";

export interface ShellProps {
  /** Reader content. */
  children: React.ReactNode;
}

const LazyServiceShell = React.lazy(() =>
  import("./service-shell").then((module) => ({ default: module.ServiceShell })),
);

/**
 * Renders the reader inside the shared Agenteresolve `ServiceShell` so the
 * header/footer/tokens match the other tools. Clerk login is optional: without
 * a publishable key `ServiceShell`'s `AuthProvider`/`UserButton` degrade
 * gracefully instead of crashing.
 */
function ShellBoundary({ children }: ShellProps) {
  return (
    <LazyServiceShell
      title="Louder"
      description="Leia PDFs e textos em voz alta, 100% no seu navegador. Nada é enviado para a internet."
      publishableKey={resolveClerkKey()}
      services={[{ label: "Louder", href: "https://louder.agenteresolve.com.br", external: true }]}
    >
      {children}
    </LazyServiceShell>
  );
}

interface ShellErrorBoundaryProps extends ShellProps {
  fallback: React.ReactNode;
}

class ShellErrorBoundary extends React.Component<ShellErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): React.ReactNode {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Mounts the reader content inside the shell. The UI library is loaded with a
 * lazy import and guarded by an error boundary, so even a failure to load it
 * cannot blank the reader — the standalone content is used instead.
 */
export function Shell({ children }: ShellProps) {
  return (
    <ShellErrorBoundary fallback={children}>
      <React.Suspense fallback={<p className="loading">Carregando interface…</p>}>
        <ShellBoundary>{children}</ShellBoundary>
      </React.Suspense>
    </ShellErrorBoundary>
  );
}
