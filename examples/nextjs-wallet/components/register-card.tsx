"use client";

import type { ReactElement } from "react";

import { describeThrown } from "../lib/format";
import {
  describeRegistrationResult,
  isRegistered,
  readRegistered,
  registerAccount,
} from "../lib/nimbus/register";
import { buildProgressLine } from "../lib/progress";

import { readFlow, useApp } from "./app-provider";
import type { OpenedAccount } from "./app-provider";
import { KeepTabOpen } from "./keep-tab-open";
import { ProgressLog } from "./progress-log";
import { ResultView } from "./result-view";

/** The key the registration's progress is kept under. */
const FLOW_KEY = "registration";

/** Renders the register card, shown in place of the wallet until the account is registered. */
export function RegisterCard({
  opened,
}: {
  readonly opened: OpenedAccount;
}): ReactElement {
  const { flows, updateFlow, setRunning, markRegistered } = useApp();
  const flow = readFlow(flows, FLOW_KEY);

  /** Registers the account, recording each stage. */
  async function register(): Promise<void> {
    setRunning("registration");
    updateFlow(FLOW_KEY, () => ({ busy: true, lines: [], summary: undefined }));
    try {
      const result = await registerAccount(opened.session, {
        onProgress: (event) => {
          updateFlow(FLOW_KEY, (previous) => ({
            ...previous,
            lines: [...previous.lines, buildProgressLine(event)],
          }));
        },
        transactionVersion: opened.connected.transactionVersion,
      });
      updateFlow(FLOW_KEY, (previous) => ({
        ...previous,
        summary: describeRegistrationResult(result),
      }));
      if (isRegistered(result) || (await readRegistered(opened.session))) {
        markRegistered();
      }
    } catch (thrown) {
      updateFlow(FLOW_KEY, (previous) => ({
        ...previous,
        summary: describeThrown(thrown),
      }));
    } finally {
      updateFlow(FLOW_KEY, (previous) => ({ ...previous, busy: false }));
      setRunning(undefined);
    }
  }

  return (
    <section className="panel" aria-labelledby="register-title">
      <h1 className="panel-title" id="register-title">
        Register your account
      </h1>
      <p className="muted">
        One transaction, once, before your first deposit. Your wallet signs it
        and pays the network fee.
      </p>
      <button
        type="button"
        className="button primary large"
        disabled={flow.busy}
        onClick={() => void register()}
      >
        {flow.busy ? "Registering…" : "Register"}
      </button>
      {flow.busy ? <KeepTabOpen what="registration" /> : null}
      <ProgressLog lines={flow.lines} running={flow.busy} />
      {flow.summary === undefined ? null : (
        <ResultView summary={flow.summary} />
      )}
    </section>
  );
}
