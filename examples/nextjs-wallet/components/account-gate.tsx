"use client";

import type { ReactElement, ReactNode } from "react";

import { useApp } from "./app-provider";
import type { OpenedAccount } from "./app-provider";
import { ConnectCard } from "./connect-card";
import { RegisterCard } from "./register-card";
import { ResultView } from "./result-view";

/**
 * Renders `children` for a registered, opened account, and in its place whatever stands before
 * one: the SDK loading or failing to, the connect card, or the register card.
 */
export function AccountGate({
  children,
}: {
  readonly children: (opened: OpenedAccount) => ReactNode;
}): ReactElement {
  const { loading, opened, registered } = useApp();
  if (loading.kind === "loading") {
    return (
      <div className="panel center-panel" aria-busy="true">
        <span className="spinner large" aria-hidden="true" />
        <p className="muted">Loading the SDK…</p>
      </div>
    );
  }
  if (loading.kind === "failed") {
    return (
      <div className="panel">
        <h1 className="panel-title">The SDK did not load</h1>
        <ResultView
          summary={{
            code: loading.reason,
            message: loading.message,
            tone: "stopped",
          }}
        />
      </div>
    );
  }
  if (opened === undefined) {
    return <ConnectCard sdk={loading.sdk} />;
  }
  if (!registered) {
    return <RegisterCard opened={opened} />;
  }
  return <>{children(opened)}</>;
}
