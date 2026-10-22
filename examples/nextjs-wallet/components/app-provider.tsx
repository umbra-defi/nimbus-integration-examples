"use client";

import type {
  ConnectedWallet,
  NimbusSdk,
  NimbusSession,
} from "@umbra-privacy/nimbus-solana-web";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";

import { describeThrown } from "../lib/format";
import type { ResultSummary } from "../lib/format";
import type { PendingDeposit } from "../lib/nimbus/deposit";
import type { SdkLoading } from "../lib/nimbus/load";
import { closeSession } from "../lib/nimbus/session";
import type { SignInMemory } from "../lib/nimbus/session";
import type { ProgressLine } from "../lib/progress";
import { applyThemeChoice, readThemeChoice } from "../lib/theme";
import type { ThemeChoice } from "../lib/theme";

import { useAccount } from "./use-account";
import type { AccountState } from "./use-account";

/** An opened session, the wallet it was opened with, and where its sign-in is remembered. */
export interface OpenedAccount {
  readonly session: NimbusSession;
  readonly connected: ConnectedWallet;
  readonly memory: SignInMemory;
}

/** One flow's progress and outcome, kept here so it survives moving between pages. */
export interface FlowRecord {
  readonly busy: boolean;
  readonly lines: readonly ProgressLine[];
  readonly summary: ResultSummary | undefined;
}

const IDLE_FLOW: FlowRecord = { busy: false, lines: [], summary: undefined };

/** Everything the pages share: the SDK, the opened account, its balance, and running flows. */
export interface AppState {
  readonly loading: SdkLoading | { readonly kind: "loading" };
  readonly opened: OpenedAccount | undefined;
  readonly open: (opened: OpenedAccount) => void;
  readonly signOut: () => Promise<void>;
  readonly signingOut: boolean;
  readonly signOutFailure: ResultSummary | undefined;
  readonly registered: boolean;
  readonly markRegistered: () => void;
  readonly account: AccountState;
  /** The flow running on the page, as a word for the user ("withdrawal"); none when idle. */
  readonly running: string | undefined;
  readonly setRunning: (what: string | undefined) => void;
  readonly flows: Readonly<Record<string, FlowRecord>>;
  readonly updateFlow: (
    key: string,
    update: (previous: FlowRecord) => FlowRecord,
  ) => void;
  /** Called when a flow returns, so the balance is synced again. */
  readonly finishFlow: () => void;
  readonly pending: PendingDeposit | undefined;
  readonly setPending: (pending: PendingDeposit | undefined) => void;
  /** Changes after every sync, so the activity is read again. */
  readonly syncCount: number;
  readonly theme: ThemeChoice;
  readonly setTheme: (choice: ThemeChoice) => void;
}

/** The shared state's context; {@link AppProvider} fills it for every page. */
export const AppContext = createContext<AppState | undefined>(undefined);

/** Returns the shared state; throws outside {@link AppProvider}, which wraps every page. */
export function useApp(): AppState {
  const state = useContext(AppContext);
  if (state === undefined) {
    throw new Error("useApp is called outside AppProvider");
  }
  return state;
}

/** Returns the SDK once it has loaded; throws before, so call it only below a loaded gate. */
export function useSdk(): NimbusSdk {
  const { loading } = useApp();
  if (loading.kind !== "loaded") {
    throw new Error("useSdk is called before the SDK loaded");
  }
  return loading.sdk;
}

/**
 * Holds the state every page shares and loads the SDK once, in the browser: the SDK needs
 * IndexedDB, WebAssembly, workers and Web Locks, none of which exist while the server renders.
 */
export function AppProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const [loading, setLoading] = useState<AppState["loading"]>({
    kind: "loading",
  });
  const [opened, setOpened] = useState<OpenedAccount | undefined>();
  const [registered, setRegistered] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailure, setSignOutFailure] = useState<
    ResultSummary | undefined
  >();
  const [running, setRunning] = useState<string | undefined>();
  const [flows, setFlows] = useState<Readonly<Record<string, FlowRecord>>>({});
  const [pending, setPending] = useState<PendingDeposit | undefined>();
  const [flowCount, setFlowCount] = useState(0);
  const [syncCount, setSyncCount] = useState(0);
  const [theme, setThemeState] = useState<ThemeChoice>("system");

  useEffect(() => {
    setThemeState(readThemeChoice());
  }, []);

  const setTheme = useCallback((choice: ThemeChoice) => {
    applyThemeChoice(choice);
    setThemeState(choice);
  }, []);

  useEffect(() => {
    let current = true;
    void import("../lib/nimbus/load").then(async ({ loadSdk }) => {
      const loaded = await loadSdk();
      if (current) {
        setLoading(loaded);
      }
    });
    return () => {
      current = false;
    };
  }, []);

  const countSync = useCallback(() => {
    setSyncCount((count) => count + 1);
  }, []);
  const finishFlow = useCallback(() => {
    setFlowCount((count) => count + 1);
  }, []);
  const account = useAccount(opened?.session, {
    onSynced: countSync,
    refreshKey: flowCount,
    registered,
  });

  const open = useCallback((account: OpenedAccount) => {
    setOpened(account);
    setRegistered(account.session.registration.kind === "registered");
    setFlows({});
    setPending(undefined);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (opened === undefined) {
      return;
    }
    setSigningOut(true);
    setSignOutFailure(undefined);
    try {
      await closeSession(opened.session, { memory: opened.memory });
      setOpened(undefined);
      setRegistered(false);
      setFlows({});
      setPending(undefined);
    } catch (thrown) {
      setSignOutFailure(describeThrown(thrown));
    } finally {
      setSigningOut(false);
    }
  }, [opened]);

  const updateFlow = useCallback(
    (key: string, update: (previous: FlowRecord) => FlowRecord) => {
      setFlows((previous) => ({
        ...previous,
        [key]: update(previous[key] ?? IDLE_FLOW),
      }));
    },
    [],
  );

  const markRegistered = useCallback(() => {
    setRegistered(true);
  }, []);

  const state = useMemo<AppState>(
    () => ({
      account,
      finishFlow,
      flows,
      loading,
      markRegistered,
      open,
      opened,
      pending,
      registered,
      running,
      setPending,
      setRunning,
      setTheme,
      signOut,
      signOutFailure,
      signingOut,
      syncCount,
      theme,
      updateFlow,
    }),
    [
      account,
      finishFlow,
      flows,
      loading,
      markRegistered,
      open,
      opened,
      pending,
      registered,
      running,
      signOut,
      signOutFailure,
      signingOut,
      syncCount,
      setTheme,
      theme,
      updateFlow,
    ],
  );

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

/** Reads one flow's record, idle when it has not run. */
export function readFlow(
  flows: Readonly<Record<string, FlowRecord>>,
  key: string,
): FlowRecord {
  return flows[key] ?? IDLE_FLOW;
}
