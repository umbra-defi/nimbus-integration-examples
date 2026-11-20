"use client";

import { address, isAddress } from "@solana/kit";
import type { Address } from "@solana/kit";
import { useState } from "react";
import type { ReactElement, SyntheticEvent } from "react";

import { describeThrown, formatAmount, parseAmount } from "../lib/format";
import type { ResultSummary } from "../lib/format";
import type { TokenBalance } from "../lib/nimbus/account";
import { buildProgressLine } from "../lib/progress";
import { labelToken } from "../lib/tokens";

import { readFlow, useApp, useSdk } from "./app-provider";
import { KeepTabOpen } from "./keep-tab-open";
import { ProgressLog } from "./progress-log";
import { ResultView } from "./result-view";
import { TokenPicker } from "./token-picker";

/** What a flow form submits: the mint, the amount in its base units, and the recipient. */
export interface FlowRequest {
  readonly mint: Address;
  readonly amount: bigint;
  readonly decimals: number;
  readonly recipient: Address;
}

/** How one flow fills the form: its words, its recipient, and what it runs. */
export interface FlowSpec {
  /** The key its progress is kept under, and the flow in words: "withdrawal". */
  readonly what: string;
  readonly amountLabel: string;
  readonly recipientLabel: string;
  readonly submitLabel: string;
  readonly note: string;
  /** Whether the amount comes from the private balance, which offers Max. */
  readonly spendsPrivateBalance: boolean;
  /** The recipient filled in at first, and offered again by "Use mine"; empty for none. */
  readonly ownRecipient: string;
  readonly run: (
    request: FlowRequest,
    onProgress: (event: { readonly stage: string }) => void,
  ) => Promise<ResultSummary>;
}

/** Warning copy and acknowledgement label when a prior run ended in an uncertain state. */
function describeWaitingGuard(
  spec: FlowSpec,
  summary: ResultSummary,
): { readonly warning: string; readonly confirmLabel: string } {
  if (!spec.spendsPrivateBalance) {
    return {
      confirmLabel: "I checked Recovery — allow another deposit",
      warning:
        "Your previous deposit has not settled yet and may still land. Check the Recovery card to wait for its outcome before submitting another deposit.",
    };
  }
  if (summary.code === "merge-failed/timeout") {
    return {
      confirmLabel: "I synced and checked my balance — allow retry",
      warning: `A balance-combining step timed out and may already have landed or may land later. Refresh and check your private balance before retrying this ${spec.what}.`,
    };
  }
  return {
    confirmLabel: `I checked my balance — allow a new ${spec.what}`,
    warning: `Your previous ${spec.what} is still pending and may still land. Do not submit it again until you refresh and check your balance and activity, or a second payment could pick different notes and pay twice.`,
  };
}

/**
 * Renders a flow's form: the amount with its token, the recipient, the action, and the flow's
 * steps and result, which outlive leaving the page.
 */
export function FlowForm({
  spec,
  mint,
  balances,
  onMintChange,
}: {
  readonly spec: FlowSpec;
  readonly mint: string;
  readonly balances: readonly TokenBalance[];
  readonly onMintChange: (mint: string) => void;
}): ReactElement {
  const sdk = useSdk();
  const { flows, updateFlow, running, setRunning, finishFlow } = useApp();
  const flow = readFlow(flows, spec.what);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState(spec.ownRecipient);
  const [problem, setProblem] = useState<string | undefined>();
  const [acknowledgedSummary, setAcknowledgedSummary] = useState<
    ResultSummary | undefined
  >();
  const token = labelToken(sdk, mint);
  const available =
    balances.find((entry) => entry.mint === mint)?.available ?? 0n;
  const locked = flow.busy;
  const waitingSummary =
    flow.summary?.tone === "waiting" ? flow.summary : undefined;
  const waitingGuard =
    waitingSummary !== undefined && acknowledgedSummary !== waitingSummary
      ? describeWaitingGuard(spec, waitingSummary)
      : undefined;

  /** Checks the form, runs the flow, and records its stages and result. */
  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (locked || running !== undefined || waitingGuard !== undefined) {
      return;
    }
    const entry = sdk.mints.find((candidate) => candidate.mint === mint);
    if (entry === undefined) {
      setProblem("Choose a token.");
      return;
    }
    const parsed = parseAmount(amount, entry.decimals);
    if (parsed.kind === "invalid") {
      setProblem(parsed.reason);
      return;
    }
    if (spec.spendsPrivateBalance && parsed.value > available) {
      setProblem(
        `That is more than your available ${formatAmount(available, entry.decimals)} ${token.symbol}.`,
      );
      return;
    }
    if (!isAddress(recipient.trim())) {
      setProblem("Enter a Solana wallet address.");
      return;
    }
    setProblem(undefined);
    setRunning(spec.what);
    updateFlow(spec.what, () => ({
      busy: true,
      lines: [],
      summary: undefined,
    }));
    try {
      const summary = await spec.run(
        {
          amount: parsed.value,
          decimals: entry.decimals,
          mint: entry.mint,
          recipient: address(recipient.trim()),
        },
        (stage) => {
          updateFlow(spec.what, (previous) => ({
            ...previous,
            lines: [...previous.lines, buildProgressLine(stage)],
          }));
        },
      );
      updateFlow(spec.what, (previous) => ({ ...previous, summary }));
      if (summary.tone === "done") {
        setAmount("");
      } else if (summary.tone === "waiting") {
        setAmount("");
        setRecipient(spec.ownRecipient);
      }
    } catch (thrown) {
      updateFlow(spec.what, (previous) => ({
        ...previous,
        summary: describeThrown(thrown),
      }));
    } finally {
      updateFlow(spec.what, (previous) => ({ ...previous, busy: false }));
      setRunning(undefined);
      finishFlow();
    }
  }

  return (
    <form className="flow" onSubmit={(event) => void submit(event)} noValidate>
      <div className="field amount-field">
        <label className="field-label" htmlFor={`${spec.what}-amount`}>
          {spec.amountLabel}
        </label>
        <div className="amount-row">
          <input
            id={`${spec.what}-amount`}
            className="amount-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            disabled={locked}
            onChange={(event) => {
              setAmount(event.target.value);
              setProblem(undefined);
            }}
          />
          <TokenPicker
            sdk={sdk}
            value={mint}
            balances={balances}
            disabled={locked}
            onChange={onMintChange}
          />
        </div>
        <div className="field-foot">
          <span className="truncate">
            {spec.spendsPrivateBalance
              ? `Private balance: ${formatAmount(available, token.decimals)} ${token.symbol}`
              : "From your connected wallet"}
          </span>
          {spec.spendsPrivateBalance && available > 0n ? (
            <button
              type="button"
              className="chip-button"
              disabled={locked}
              onClick={() => {
                setAmount(
                  formatAmount(available, token.decimals).replace(/,/gu, ""),
                );
                setProblem(undefined);
              }}
            >
              Max
            </button>
          ) : null}
        </div>
      </div>
      <div className="field">
        <div className="field-head">
          <label className="field-label" htmlFor={`${spec.what}-recipient`}>
            {spec.recipientLabel}
          </label>
          {spec.ownRecipient !== "" && recipient !== spec.ownRecipient ? (
            <button
              type="button"
              className="chip-button"
              disabled={locked}
              onClick={() => {
                setRecipient(spec.ownRecipient);
              }}
            >
              Use mine
            </button>
          ) : null}
        </div>
        <input
          id={`${spec.what}-recipient`}
          className="address-input"
          spellCheck={false}
          autoComplete="off"
          placeholder="Wallet address"
          value={recipient}
          disabled={locked}
          onChange={(event) => {
            setRecipient(event.target.value);
            setProblem(undefined);
          }}
        />
      </div>
      {problem === undefined ? null : (
        <p className="form-problem" role="alert">
          {problem}
        </p>
      )}
      {waitingGuard === undefined ? null : (
        <div className="callout" role="alert">
          <p>{waitingGuard.warning}</p>
          <button
            type="button"
            className="button quiet compact"
            disabled={locked}
            onClick={() => {
              setAcknowledgedSummary(waitingSummary);
            }}
          >
            {waitingGuard.confirmLabel}
          </button>
        </div>
      )}
      <button
        type="submit"
        className="button primary large"
        disabled={locked || running !== undefined || waitingGuard !== undefined}
      >
        {locked ? (
          <>
            <span className="spinner on-accent" aria-hidden="true" />
            Working…
          </>
        ) : running !== undefined ? (
          `Waiting for the ${running}`
        ) : waitingGuard !== undefined ? (
          "Check status before sending again"
        ) : (
          spec.submitLabel
        )}
      </button>
      <p className="note">{spec.note}</p>
      {locked ? <KeepTabOpen what={spec.what} /> : null}
      <ProgressLog lines={flow.lines} running={flow.busy} />
      {flow.summary === undefined ? null : (
        <ResultView summary={flow.summary} />
      )}
    </form>
  );
}
