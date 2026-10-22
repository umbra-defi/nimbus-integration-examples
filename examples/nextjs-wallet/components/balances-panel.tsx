"use client";

import type { ReservedSpend } from "@umbra-privacy/nimbus-solana-web";
import { useState } from "react";
import type { ReactElement } from "react";

import { describeThrown, formatAmount } from "../lib/format";
import type { ResultSummary } from "../lib/format";
import { releaseHeldFunds } from "../lib/nimbus/account";
import type { TokenBalance } from "../lib/nimbus/account";
import { labelToken } from "../lib/tokens";

import { useApp, useSdk } from "./app-provider";
import type { OpenedAccount } from "./app-provider";
import { ResultView } from "./result-view";
import { TokenAvatar } from "./token-avatar";

/** What each kind of held payment is called. */
const HELD_KINDS: Readonly<Record<ReservedSpend["kind"], string>> = {
  deposit: "Deposit",
  escape: "Escape",
  spend: "Payment",
};

/** What each held payment's state means, and whether Release frees it at once. */
const HELD_STATES: Readonly<
  Record<
    ReservedSpend["state"],
    { readonly label: string; readonly detail: string }
  >
> = {
  releasing: {
    detail:
      "Released. Returns once the sent attempt lands or can no longer land.",
    label: "Releasing",
  },
  sent: {
    detail:
      "May have reached the relayer or Solana. Releasing stops new attempts; the funds return once it lands or can no longer land.",
    label: "Sent",
  },
  unsent: {
    detail: "Stopped before anything left this device. Release returns it now.",
    label: "Not sent",
  },
};

/** Says what a release came to. */
function describeRelease(args: {
  readonly released: number;
  readonly settling: number;
  readonly running: number;
}): ResultSummary {
  if (args.running > 0 && args.released === 0 && args.settling === 0) {
    return {
      code: "running",
      message:
        "Another tab of this site is still running that payment, so it was left alone. It frees on its own when that tab finishes or closes.",
      tone: "waiting",
    };
  }
  if (args.released === 0 && args.settling === 0) {
    return {
      code: "released",
      message: "Nothing was held, so nothing changed.",
      tone: "done",
    };
  }
  const plural = (count: number): string => (count === 1 ? "" : "s");
  const parts = [
    args.released > 0
      ? `Released ${String(args.released)} payment${plural(args.released)}; the funds are available again.`
      : "",
    args.settling > 0
      ? `${String(args.settling)} payment${plural(args.settling)} may have been sent, so the funds return once it lands or can no longer land.`
      : "",
  ];
  return {
    code: args.settling > 0 ? "released, settling" : "released",
    message: parts.filter((part) => part !== "").join(" "),
    tone: args.settling > 0 ? "waiting" : "done",
  };
}

/** Says what else of a token's balance is not yet available, or nothing. */
function describeOtherStates(balance: TokenBalance, decimals: number): string {
  const parts = [
    balance.pending > 0n
      ? `${formatAmount(balance.pending, decimals)} settling`
      : "",
    balance.reserved > 0n
      ? `${formatAmount(balance.reserved, decimals)} in use`
      : "",
    balance.expired > 0n
      ? `${formatAmount(balance.expired, decimals)} expired`
      : "",
  ].filter((part) => part !== "");
  return parts.length === 0 ? "Available" : parts.join(" · ");
}

/** Renders the refresh control: a round button that spins while syncing. */
function RefreshButton({
  syncing,
  onRefresh,
}: {
  readonly syncing: boolean;
  readonly onRefresh: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={syncing ? "icon-button spinning" : "icon-button"}
      aria-label={syncing ? "Syncing" : "Refresh"}
      title="Sync with Solana"
      disabled={syncing}
      onClick={onRefresh}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13 8a5 5 0 1 1-1.46-3.54M13 3v2.5h-2.5" />
      </svg>
    </button>
  );
}

/**
 * Renders the balances panel: each token the account holds, with what is settling, in use or
 * expired; the payments holding funds, each with Release; and the last sync.
 */
export function BalancesPanel({
  opened,
}: {
  readonly opened: OpenedAccount;
}): ReactElement {
  const sdk = useSdk();
  const { account, running } = useApp();
  const { reading } = account;
  const [releasing, setReleasing] = useState<string | undefined>();
  const [summary, setSummary] = useState<ResultSummary | undefined>();
  const releasable = reading.reserved.filter(
    (spend) => spend.state !== "releasing" && !spend.running,
  );

  /** Releases one held payment, or every one, then reads the balance back. */
  async function release(spendId?: string): Promise<void> {
    setReleasing(spendId ?? "all");
    setSummary(undefined);
    try {
      const result = await releaseHeldFunds(
        opened.session,
        spendId === undefined ? {} : { spendId },
      );
      setSummary(
        describeRelease({
          released: result.released.length,
          running: result.running.length,
          settling: result.settling.length,
        }),
      );
      await account.reread();
    } catch (thrown) {
      setSummary(describeThrown(thrown));
    } finally {
      setReleasing(undefined);
    }
  }

  return (
    <section className="panel" aria-labelledby="balances-title">
      <div className="panel-head">
        <div className="panel-head-text">
          <h2 className="section-title" id="balances-title">
            Private balance
          </h2>
          <p className="muted small truncate">
            {account.syncing
              ? "Syncing with Solana…"
              : account.syncText === ""
                ? "Not synced yet"
                : account.syncText}
          </p>
        </div>
        <RefreshButton
          syncing={account.syncing}
          onRefresh={() => void account.refresh()}
        />
      </div>

      {reading.balances.length === 0 ? (
        <div className="empty-state">
          {account.loaded ? (
            <>
              <p>No private balance yet.</p>
              <p className="muted small">Deposit to start one.</p>
            </>
          ) : (
            <>
              <span className="skeleton" />
              <span className="skeleton short" />
            </>
          )}
        </div>
      ) : (
        <ul className="list">
          {reading.balances.map((balance) => {
            const token = labelToken(sdk, balance.mint);
            return (
              <li key={balance.mint} className="list-row" title={balance.mint}>
                <TokenAvatar token={token} size="large" />
                <div className="list-main">
                  <span className="list-title">{token.symbol}</span>
                  <span className="list-sub truncate">
                    {describeOtherStates(balance, token.decimals)}
                  </span>
                </div>
                <span className="list-value">
                  {formatAmount(balance.available, token.decimals)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {reading.reserved.length === 0 ? null : (
        <div className="held" aria-labelledby="held-title">
          <div className="held-head">
            <h3 className="held-title" id="held-title">
              In use
            </h3>
            {releasable.length > 1 ? (
              <button
                type="button"
                className="button quiet compact"
                disabled={releasing !== undefined || running !== undefined}
                onClick={() => void release()}
              >
                {releasing === "all" ? "Releasing…" : "Release all"}
              </button>
            ) : null}
          </div>
          {running === undefined ? null : (
            <p className="muted small">
              Release waits until the {running} running in this tab finishes, so
              it cannot stop it midway.
            </p>
          )}
          <ul className="list">
            {reading.reserved.map((spend) => {
              const token =
                spend.mint === undefined
                  ? undefined
                  : labelToken(sdk, spend.mint);
              const state = HELD_STATES[spend.state];
              return (
                <li key={spend.id} className="held-row">
                  <div className="list-main">
                    <span className="list-title">
                      <span className="truncate">
                        {token === undefined
                          ? `${spend.amount.toString()} base units`
                          : `${formatAmount(spend.amount, token.decimals)} ${token.symbol}`}
                      </span>
                      <span
                        className={`tag ${spend.running ? "running" : spend.state}`}
                      >
                        {spend.running ? "Running" : state.label}
                      </span>
                    </span>
                    <span className="list-sub">
                      {HELD_KINDS[spend.kind]}.{" "}
                      {spend.running
                        ? "Another tab of this site is still running this payment. It frees on its own when that tab finishes or closes."
                        : state.detail}
                    </span>
                  </div>
                  {spend.state === "releasing" || spend.running ? null : (
                    <button
                      type="button"
                      className="button quiet compact"
                      disabled={
                        releasing !== undefined || running !== undefined
                      }
                      onClick={() => void release(spend.id)}
                    >
                      {releasing === spend.id ? "Releasing…" : "Release"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {account.failure === undefined ? null : (
        <ResultView summary={account.failure} />
      )}
      {summary === undefined ? null : <ResultView summary={summary} />}
    </section>
  );
}
