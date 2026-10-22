/**
 * What each history entry was, for the user: a deposit, a withdrawal or a private transfer, with
 * the amounts that moved and the public wallet on the other side.
 */

import { getAddressDecoder } from "@solana/kit";
import { findMintByIdentifier } from "@umbra-privacy/nimbus-solana-web";
import type { HistoryPage, NimbusSdk } from "@umbra-privacy/nimbus-solana-web";

type HistoryItem = HistoryPage["items"][number];

/** What kind of entry a transaction is, from the account's side. */
export type ActivityKind =
  | "deposit"
  | "withdraw"
  | "deposit-withdraw"
  | "transfer-out"
  | "transfer-in"
  | "deposit-in";

/** One amount an entry moved: its mint, or none when the preset does not list it, and which way. */
export interface ActivityAmount {
  readonly mint: string | undefined;
  readonly amount: bigint;
  readonly direction: "in" | "out";
}

/** A history entry as the activity list shows it. */
export interface ActivityEntry {
  readonly kind: ActivityKind;
  readonly title: string;
  readonly amounts: readonly ActivityAmount[];
  /** The public wallet on the other side: a deposit's source or a withdrawal's destination. */
  readonly counterparty: string | undefined;
  /** What came back to the account on a transfer it sent, as change. */
  readonly change: readonly ActivityAmount[];
}

/** One public boundary leg, as a record or another's transaction carries it. */
interface Leg {
  readonly address: Uint8Array;
  readonly mint: Uint8Array;
  readonly amount: bigint;
}

/** Reads a leg's amount, its mint written as the address it is. */
function readLeg(leg: Leg, direction: "in" | "out"): ActivityAmount {
  return {
    amount: leg.amount,
    direction,
    mint: getAddressDecoder().decode(leg.mint),
  };
}

/** Reads what a transaction paid the account, one amount per note received. */
function readReceived(sdk: NimbusSdk, item: HistoryItem): ActivityAmount[] {
  return item.received.map((received) => ({
    amount: received.note.amount,
    direction: "in",
    mint: findMintByIdentifier(sdk, {
      mintIdentifier: received.note.mintIdentifier,
    })?.mint,
  }));
}

/** Adds up amounts of the same mint and direction, keeping the first-seen order. */
function sumAmounts(amounts: readonly ActivityAmount[]): ActivityAmount[] {
  const totals = new Map<string, ActivityAmount>();
  for (const entry of amounts) {
    const key = `${entry.direction}:${entry.mint ?? ""}`;
    const previous = totals.get(key);
    totals.set(key, {
      ...entry,
      amount: (previous?.amount ?? 0n) + entry.amount,
    });
  }
  return [...totals.values()];
}

/** The first leg's wallet, as an address. */
function readCounterparty(legs: readonly Leg[]): string | undefined {
  const first = legs[0];
  return first === undefined
    ? undefined
    : getAddressDecoder().decode(first.address);
}

/**
 * Says what a history entry was.
 *
 * @remarks
 * The account's own transactions carry their record, whose public legs decide: an inflow is a
 * deposit, an outflow a withdrawal, and neither a private transfer, whose received notes are its
 * change; one whose legs the feed has not served yet is a deposit when it spent nothing. Another's transaction that paid the account is a transfer received, or a deposit received
 * when its legs show the payer deposited straight into the account's balance.
 */
export function describeActivity(
  sdk: NimbusSdk,
  item: HistoryItem,
): ActivityEntry {
  const received = sumAmounts(readReceived(sdk, item));
  const ownLegs =
    item.record.kind === "kept" &&
    item.record.judgment.row.legs.kind === "known"
      ? item.record.judgment.row.legs
      : undefined;
  if (ownLegs !== undefined) {
    const { inflows, outflows } = ownLegs;
    if (inflows.length > 0 && outflows.length === 0) {
      return {
        amounts: sumAmounts(inflows.map((leg) => readLeg(leg, "in"))),
        change: [],
        counterparty: readCounterparty(inflows),
        kind: "deposit",
        title: "Deposit",
      };
    }
    if (outflows.length > 0 && inflows.length === 0) {
      return {
        amounts: sumAmounts(outflows.map((leg) => readLeg(leg, "out"))),
        change: received,
        counterparty: readCounterparty(outflows),
        kind: "withdraw",
        title: "Withdraw",
      };
    }
    if (outflows.length > 0) {
      return {
        amounts: sumAmounts([
          ...inflows.map((leg) => readLeg(leg, "in")),
          ...outflows.map((leg) => readLeg(leg, "out")),
        ]),
        change: [],
        counterparty: readCounterparty(outflows),
        kind: "deposit-withdraw",
        title: "Deposit and withdraw",
      };
    }
  }
  if (item.record.kind === "kept" && item.spent.length === 0) {
    return {
      amounts: received,
      change: [],
      counterparty: undefined,
      kind: "deposit",
      title: "Deposit",
    };
  }
  if (item.record.kind === "kept" || item.spent.length > 0) {
    return {
      amounts: [],
      change: received,
      counterparty: undefined,
      kind: "transfer-out",
      title: "Private transfer",
    };
  }
  if (item.others.kind === "legs" && item.others.legs.inflows.length > 0) {
    return {
      amounts: received,
      change: [],
      counterparty: readCounterparty(item.others.legs.inflows),
      kind: "deposit-in",
      title: "Deposit received",
    };
  }
  return {
    amounts: received,
    change: [],
    counterparty: undefined,
    kind: "transfer-in",
    title: "Received",
  };
}
