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
  const token = labelToken(sdk, mint);
  const available =
    balances.find((entry) => entry.mint === mint)?.available ?? 0n;
  const locked = flow.busy;

  /** Checks the form, runs the flow, and records its stages and result. */
  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
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
      <button
        type="submit"
        className="button primary large"
        disabled={locked || running !== undefined}
      >
        {locked ? (
          <>
            <span className="spinner on-accent" aria-hidden="true" />
            Working…
          </>
        ) : running !== undefined ? (
          `Waiting for the ${running}`
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
