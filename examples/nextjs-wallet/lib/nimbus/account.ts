/**
 * The account's private balance: the note store synced from the chain and the indexer, its
 * balances read back one row per token, and the payments holding part of it.
 */

import {
  listReservedSpends,
  readBalances,
  releaseReservedNotes,
  syncNoteStore,
} from "@umbra-privacy/nimbus-solana-web";
import type {
  Balance,
  NimbusSession,
  NoteStoreSyncResult,
  ReleasedNotes,
  ReservedSpend,
} from "@umbra-privacy/nimbus-solana-web";

/** One token's private balance, each state the SDK reads side by side, in base units. */
export interface TokenBalance {
  readonly mint: string;
  readonly available: bigint;
  /** Received, waiting to become final before it can be spent. */
  readonly pending: bigint;
  /** Held by a payment, or a deposit merging it, that has not finished. */
  readonly reserved: bigint;
  /** Past its validity, so it can no longer be spent. */
  readonly expired: bigint;
}

/** What the account holds: its balance per token and the payments holding part of it. */
export interface AccountReading {
  readonly balances: readonly TokenBalance[];
  readonly reserved: readonly ReservedSpend[];
}

/**
 * Brings the session's store up to date with the chain and the indexer.
 *
 * @returns `ingested` with the confirmed slot read through, `unregistered` while the account has
 *   not registered on this device, or `unavailable` when the store could not be written.
 * @throws `NimbusSdkError` with reason `service-unavailable` or `unreadable` when the indexer or the
 *   RPC cannot answer.
 */
export async function syncAccount(
  session: NimbusSession,
): Promise<NoteStoreSyncResult> {
  return syncNoteStore(session);
}

/**
 * Groups the balances the SDK reads, one entry per mint and state, into one row per token. A
 * balance whose mint the preset does not list has no address to show, so it is left out.
 */
function groupBalances(balances: readonly Balance[]): readonly TokenBalance[] {
  const rows = new Map<string, TokenBalance>();
  for (const balance of balances) {
    if (balance.mint === undefined) {
      continue;
    }
    const row = rows.get(balance.mint) ?? {
      available: 0n,
      expired: 0n,
      mint: balance.mint,
      pending: 0n,
      reserved: 0n,
    };
    rows.set(balance.mint, {
      ...row,
      [balance.state]: row[balance.state] + balance.total,
    });
  }
  return [...rows.values()];
}

/**
 * Reads the private balance in zone 0 and the payments holding part of it, as the last sync left
 * them.
 *
 * @throws `NimbusSdkError` with reason `unreadable` or `unsupported-browser` when the store cannot be
 *   read.
 */
export async function readAccount(
  session: NimbusSession,
): Promise<AccountReading> {
  const [balances, reserved] = await Promise.all([
    readBalances(session, {}),
    listReservedSpends(session, {}),
  ]);
  return { balances: groupBalances(balances), reserved };
}

/**
 * Releases what stopped payments hold: the one `spendId` names, or every one when it names none.
 *
 * @throws `NimbusSdkError` with reason `service-unavailable` when the RPC cannot be reached, or
 *   `unreadable` when the store cannot be written.
 */
export async function releaseHeldFunds(
  session: NimbusSession,
  args: { readonly spendId?: string },
): Promise<ReleasedNotes> {
  return releaseReservedNotes(
    session,
    {},
    args.spendId === undefined ? {} : { spendId: args.spendId },
  );
}
