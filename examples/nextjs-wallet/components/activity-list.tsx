"use client";

import type {
  HistoryPage,
  HistoryPosition,
  NimbusSession,
} from "@umbra-privacy/nimbus-solana-web";
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

import { describeActivity } from "../lib/activity";
import type { ActivityAmount, ActivityKind } from "../lib/activity";
import { describeThrown, formatAmount, shortenAddress } from "../lib/format";
import type { ResultSummary } from "../lib/format";
import { readHistoryPage } from "../lib/nimbus/history";
import { buildExplorerLink, encodeBase58 } from "../lib/submission";
import { labelToken } from "../lib/tokens";

import { useApp } from "./app-provider";
import { ResultView } from "./result-view";

type HistoryItem = HistoryPage["items"][number];

/** Each kind's icon path and colour class. */
const KIND_ICONS: Readonly<
  Record<ActivityKind, { readonly path: string; readonly tone: string }>
> = {
  deposit: { path: "M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10", tone: "in" },
  "deposit-in": { path: "M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10", tone: "in" },
  "deposit-withdraw": {
    path: "M5 3v10M2 10l3 3 3-3M11 13V3M8 6l3-3 3 3",
    tone: "both",
  },
  "transfer-in": {
    path: "M13 5H3M6 2 3 5l3 3M3 11h10M10 8l3 3-3 3",
    tone: "in",
  },
  "transfer-out": {
    path: "M3 5h10M10 2l3 3-3 3M13 11H3M6 8l-3 3 3 3",
    tone: "out",
  },
  withdraw: { path: "M8 13.5v-8M4.5 9 8 5.5 11.5 9M3 2.5h10", tone: "out" },
};

/** Writes an amount with its token's symbol and sign, or in base units for an unlisted mint. */
function formatActivityAmount(
  session: NimbusSession,
  entry: ActivityAmount,
): string {
  const sign = entry.direction === "in" ? "+" : "−";
  if (entry.mint === undefined) {
    return `${sign}${entry.amount.toString()} base units`;
  }
  const token = labelToken(session.sdk, entry.mint);
  return `${sign}${formatAmount(entry.amount, token.decimals)} ${token.symbol}`;
}

/** Renders a page of transactions as rows: what each was, where it landed, and what moved. */
export function ActivityRows({
  session,
  items,
}: {
  readonly session: NimbusSession;
  readonly items: readonly HistoryItem[];
}): ReactElement {
  return (
    <ul className="list">
      {items.map((item) => {
        const signature = encodeBase58(item.signature);
        const entry = describeActivity(session.sdk, item);
        const icon = KIND_ICONS[entry.kind];
        const detail =
          entry.counterparty === undefined
            ? `Slot ${item.slot.toLocaleString("en-US")}`
            : `${entry.kind === "withdraw" || entry.kind === "deposit-withdraw" ? "To" : "From"} ${shortenAddress(entry.counterparty)}`;
        return (
          <li key={signature} className="list-row">
            <span className={`movement ${icon.tone}`} aria-hidden="true">
              <svg viewBox="0 0 16 16">
                <path d={icon.path} />
              </svg>
            </span>
            <div className="list-main">
              <span className="list-title">{entry.title}</span>
              <a
                className="list-sub link truncate"
                href={buildExplorerLink(item.signature)}
                target="_blank"
                rel="noreferrer"
                title={signature}
              >
                {detail} · {signature.slice(0, 4)}…{signature.slice(-4)}
              </a>
            </div>
            <div className="list-end">
              {entry.amounts.map((amount) => (
                <span
                  key={`${amount.direction}-${amount.mint ?? ""}`}
                  className={
                    amount.direction === "in"
                      ? "list-value positive truncate"
                      : "list-value truncate"
                  }
                >
                  {formatActivityAmount(session, amount)}
                </span>
              ))}
              {entry.change.map((amount) => (
                <span
                  key={`change-${amount.mint ?? ""}`}
                  className="list-sub truncate"
                >
                  Change {formatActivityAmount(session, amount)}
                </span>
              ))}
              {entry.amounts.length === 0 && entry.change.length === 0 ? (
                <span className="list-sub">Private</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Renders the account's transactions, newest first, a page at a time. */
export function ActivityList({
  session,
}: {
  readonly session: NimbusSession;
}): ReactElement {
  const { syncCount, account } = useApp();
  const [positions, setPositions] = useState<
    readonly (HistoryPosition | "start")[]
  >(["start"]);
  const [page, setPage] = useState<HistoryPage | undefined>();
  const [summary, setSummary] = useState<ResultSummary | undefined>();
  const position = positions[positions.length - 1] ?? "start";

  const read = useCallback(async (): Promise<void> => {
    try {
      setPage(await readHistoryPage(session, { after: position }));
      setSummary(undefined);
    } catch (thrown) {
      setSummary(describeThrown(thrown));
    }
  }, [session, position]);

  useEffect(() => {
    setPositions(["start"]);
  }, [syncCount]);

  useEffect(() => {
    void read();
  }, [read, syncCount]);

  const next = page?.next;
  return (
    <section className="panel" aria-labelledby="activity-title">
      <div className="panel-head">
        <div className="panel-head-text">
          <h1 className="panel-title" id="activity-title">
            Activity
          </h1>
          <p className="muted small">
            Your private transactions, read from this device.
          </p>
        </div>
        <button
          type="button"
          className={account.syncing ? "icon-button spinning" : "icon-button"}
          aria-label={account.syncing ? "Syncing" : "Refresh"}
          disabled={account.syncing}
          onClick={() => void account.refresh()}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13 8a5 5 0 1 1-1.46-3.54M13 3v2.5h-2.5" />
          </svg>
        </button>
      </div>
      {page !== undefined && page.pendingOwn.length > 0 ? (
        <p className="banner">
          <span className="spinner" aria-hidden="true" />
          {page.pendingOwn.length} of your transactions{" "}
          {page.pendingOwn.length === 1 ? "has" : "have"} not appeared here yet.
        </p>
      ) : null}
      {page === undefined ? (
        <div className="empty-state">
          <span className="skeleton" />
          <span className="skeleton short" />
        </div>
      ) : page.items.length === 0 ? (
        <div className="empty-state">
          <p>Nothing here yet.</p>
          <p className="muted small">
            Which, in this case, is the whole point.
          </p>
        </div>
      ) : (
        <ActivityRows session={session} items={page.items} />
      )}
      {positions.length > 1 || next?.kind === "more" ? (
        <div className="pager">
          <button
            type="button"
            className="button quiet compact"
            disabled={positions.length <= 1}
            onClick={() => {
              setPositions((previous) => previous.slice(0, -1));
            }}
          >
            Newer
          </button>
          <button
            type="button"
            className="button quiet compact"
            disabled={next?.kind !== "more"}
            onClick={() => {
              if (next?.kind === "more") {
                setPositions((previous) => [...previous, next.position]);
              }
            }}
          >
            Older
          </button>
        </div>
      ) : null}
      {summary === undefined ? null : <ResultView summary={summary} />}
    </section>
  );
}
