"use client";

import type {
  NimbusSession,
  NoteStoreSyncResult,
} from "@umbra-privacy/nimbus-solana-web";
import { useCallback, useEffect, useMemo, useState } from "react";

import { describeThrown } from "../lib/format";
import type { ResultSummary } from "../lib/format";
import { readAccount, syncAccount } from "../lib/nimbus/account";
import type { AccountReading } from "../lib/nimbus/account";

/** The account's state as the pages show it, and ways to bring it up to date. */
export interface AccountState {
  readonly reading: AccountReading;
  /** How far the last sync read, said for the user; empty before the first. */
  readonly syncText: string;
  readonly syncing: boolean;
  /** Whether a sync or read has finished since the account opened. */
  readonly loaded: boolean;
  /** Why the last sync or read failed, if it did. */
  readonly failure: ResultSummary | undefined;
  /** Syncs the store, then reads the balance and the held payments back. */
  readonly refresh: () => Promise<void>;
  /** Reads the balance and the held payments again, without syncing. */
  readonly reread: () => Promise<void>;
}

/** Says how far the last sync read, for the user. */
function describeSync(result: NoteStoreSyncResult): string {
  switch (result.kind) {
    case "ingested":
      return result.caughtUp
        ? `Synced through slot ${result.slot.toLocaleString("en-US")}`
        : `Synced through slot ${result.slot.toLocaleString("en-US")}, more to read`;
    case "unregistered":
      return "Not registered on this device yet";
    case "unavailable":
      return `Could not update at the ${result.step} step`;
  }
}

const EMPTY_READING: AccountReading = { balances: [], reserved: [] };

/**
 * Keeps the account's balance and held payments, synced when it registers, whenever `refreshKey`
 * changes, and on `refresh`; empty while no session is open. `onSynced` runs after each sync, so
 * the activity is read again.
 */
export function useAccount(
  session: NimbusSession | undefined,
  args: {
    readonly registered: boolean;
    readonly refreshKey: number;
    readonly onSynced: () => void;
  },
): AccountState {
  const { registered, refreshKey, onSynced } = args;
  const [reading, setReading] = useState<AccountReading>(EMPTY_READING);
  const [syncText, setSyncText] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failure, setFailure] = useState<ResultSummary | undefined>();

  useEffect(() => {
    setReading(EMPTY_READING);
    setSyncText("");
    setLoaded(false);
    setFailure(undefined);
  }, [session]);

  const reread = useCallback(async (): Promise<void> => {
    if (session === undefined) {
      return;
    }
    try {
      setReading(await readAccount(session));
      setFailure(undefined);
    } catch (thrown) {
      setFailure(describeThrown(thrown));
    }
  }, [session]);

  const refresh = useCallback(async (): Promise<void> => {
    if (session === undefined) {
      return;
    }
    setSyncing(true);
    setFailure(undefined);
    try {
      setSyncText(describeSync(await syncAccount(session)));
      setReading(await readAccount(session));
      onSynced();
    } catch (thrown) {
      setFailure(describeThrown(thrown));
    } finally {
      setSyncing(false);
      setLoaded(true);
    }
  }, [session, onSynced]);

  useEffect(() => {
    if (session !== undefined && registered) {
      void refresh();
    }
  }, [session, registered, refresh, refreshKey]);

  return useMemo(
    () => ({ failure, loaded, reading, refresh, reread, syncText, syncing }),
    [failure, loaded, reading, refresh, reread, syncText, syncing],
  );
}
