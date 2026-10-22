"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import { describeThrown, shortenAddress } from "../lib/format";
import type { ResultSummary } from "../lib/format";
import type { PendingDeposit } from "../lib/nimbus/deposit";
import {
  describeRefundResult,
  describeResolutionResult,
  refundStrandedFunds,
  settlePendingDeposit,
} from "../lib/nimbus/recovery";
import { buildProgressLine } from "../lib/progress";
import { encodeBase58 } from "../lib/submission";
import { listTokens } from "../lib/tokens";

import { readFlow, useApp, useSdk } from "./app-provider";
import type { OpenedAccount } from "./app-provider";
import { ProgressLog } from "./progress-log";
import { ResultView } from "./result-view";
import { TokenPicker } from "./token-picker";

/** The key recovery's progress is kept under, and the action in words. */
const FLOW_KEY = "recovery";

/**
 * Renders the recovery panel: a deposit Solana had not settled, which needs its outcome before
 * another, and returning funds a deposit left in the platform wallet.
 */
export function RecoveryCard({
  opened,
}: {
  readonly opened: OpenedAccount;
}): ReactElement {
  const sdk = useSdk();
  const {
    account,
    flows,
    updateFlow,
    running,
    setRunning,
    pending,
    setPending,
    finishFlow,
  } = useApp();
  const flow = readFlow(flows, FLOW_KEY);
  const [mint, setMint] = useState<string>(listTokens(sdk)[0]?.mint ?? "");
  const { session, connected } = opened;

  /** Runs one recovery action, recording its stages and its result. */
  async function run(action: () => Promise<ResultSummary>): Promise<void> {
    setRunning(FLOW_KEY);
    updateFlow(FLOW_KEY, () => ({ busy: true, lines: [], summary: undefined }));
    try {
      const summary = await action();
      updateFlow(FLOW_KEY, (previous) => ({ ...previous, summary }));
    } catch (thrown) {
      updateFlow(FLOW_KEY, (previous) => ({
        ...previous,
        summary: describeThrown(thrown),
      }));
    } finally {
      updateFlow(FLOW_KEY, (previous) => ({ ...previous, busy: false }));
      setRunning(undefined);
      finishFlow();
    }
  }

  /** Returns the platform wallet's holdings of the chosen mint to the connected wallet. */
  async function refund(): Promise<ResultSummary> {
    const entry = sdk.mints.find((candidate) => candidate.mint === mint);
    if (entry === undefined) {
      return { code: "form", message: "Choose a token.", tone: "stopped" };
    }
    const result = await refundStrandedFunds(
      session,
      { mint: entry.mint },
      {
        onProgress: (event) => {
          updateFlow(FLOW_KEY, (previous) => ({
            ...previous,
            lines: [...previous.lines, buildProgressLine(event)],
          }));
        },
        transactionVersion: connected.transactionVersion,
      },
    );
    return describeRefundResult(result);
  }

  /** Waits for the pending deposit's outcome. */
  async function settle(deposit: PendingDeposit): Promise<ResultSummary> {
    const result = await settlePendingDeposit(deposit);
    if (result.kind !== "unknown") {
      setPending(undefined);
    }
    return describeResolutionResult(result);
  }

  const blocked = flow.busy || running !== undefined;
  return (
    <section className="panel" aria-labelledby="recovery-title">
      <div className="panel-head-text">
        <h2 className="section-title" id="recovery-title">
          Recovery
        </h2>
        <p className="muted small">
          For deposits that did not finish. Nothing here is needed day to day.
        </p>
      </div>
      {pending === undefined ? null : (
        <div className="callout">
          <p>
            Deposit{" "}
            <code>
              {shortenAddress(
                encodeBase58(pending.submission.submission.signature),
              )}
            </code>{" "}
            had not settled when it returned and may still land. Wait for its
            outcome before depositing again.
          </p>
          <button
            type="button"
            className="button primary compact"
            disabled={blocked}
            onClick={() => void run(async () => settle(pending))}
          >
            Wait for the outcome
          </button>
        </div>
      )}
      <div className="field">
        <span className="field-label">Return stranded funds</span>
        <p className="muted small">
          A deposit that did not land can leave funds in your platform wallet.
          Once every deposit of a token has settled, this returns them to your
          wallet.
        </p>
        <div className="inline-row">
          <TokenPicker
            sdk={sdk}
            value={mint}
            balances={account.reading.balances}
            disabled={blocked}
            onChange={setMint}
          />
          <button
            type="button"
            className="button quiet compact"
            disabled={blocked}
            onClick={() => void run(refund)}
          >
            {flow.busy ? "Working…" : "Return funds"}
          </button>
        </div>
      </div>
      <ProgressLog lines={flow.lines} running={flow.busy} />
      {flow.summary === undefined ? null : (
        <ResultView summary={flow.summary} />
      )}
    </section>
  );
}
