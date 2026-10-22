"use client";

import {
  followWallets,
  listWallets,
  openWalletConnection,
} from "@umbra-privacy/nimbus-solana-web";
import type { NimbusSdk, Wallet } from "@umbra-privacy/nimbus-solana-web";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { describeThrown } from "../lib/format";
import type { ResultSummary } from "../lib/format";
import { openSession } from "../lib/nimbus/session";
import type { SignInMemory } from "../lib/nimbus/session";

import { useApp } from "./app-provider";
import { ResultView } from "./result-view";

/** The sign-in memory choices, as the segmented control offers them. */
const MEMORY_CHOICES: readonly {
  readonly value: SignInMemory;
  readonly label: string;
}[] = [
  { label: "This tab", value: "tab" },
  { label: "This browser", value: "browser" },
  { label: "Never", value: "none" },
];

/** Returns the wallets that sign on the SDK's cluster, kept current as extensions register. */
function useClusterWallets(sdk: NimbusSdk): readonly Wallet[] {
  const [wallets, setWallets] = useState<readonly Wallet[]>(() =>
    listWallets(sdk),
  );
  useEffect(
    () =>
      followWallets(sdk, {
        onChange: setWallets,
      }),
    [sdk],
  );
  return wallets;
}

/** Renders the connect card: the wallet picker and where the sign-in is remembered. */
export function ConnectCard({
  sdk,
}: {
  readonly sdk: NimbusSdk;
}): ReactElement {
  const { open } = useApp();
  const wallets = useClusterWallets(sdk);
  const [memory, setMemory] = useState<SignInMemory>("tab");
  const [busy, setBusy] = useState<string | undefined>();
  const [summary, setSummary] = useState<ResultSummary | undefined>();

  /** Connects a wallet and opens the session for its account. */
  async function connectAndOpen(wallet: Wallet): Promise<void> {
    setBusy(wallet.name);
    setSummary(undefined);
    try {
      const connection = await openWalletConnection(sdk, { wallet });
      if (connection.kind === "declined") {
        setSummary({
          code: "declined",
          message: `You declined to connect ${wallet.name}.`,
          tone: "stopped",
        });
        return;
      }
      if (connection.kind === "no-account") {
        setSummary({
          code: "no-account",
          message: `${wallet.name} offered no account that signs on Solana mainnet.`,
          tone: "stopped",
        });
        return;
      }
      const result = await openSession(sdk, {
        memory,
        signer: connection.connected.signer,
      });
      if (result.kind === "declined") {
        setSummary({
          code: "declined",
          message: "You declined to sign, so no account was opened.",
          tone: "stopped",
        });
        return;
      }
      open({
        connected: connection.connected,
        memory,
        session: result.session,
      });
    } catch (thrown) {
      setSummary(describeThrown(thrown));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section className="panel" aria-labelledby="connect-title">
      <h1 className="panel-title" id="connect-title">
        Connect a wallet
      </h1>
      <p className="muted">
        Your wallet signs one message to open your private account on this
        device. Signing moves no money.
      </p>
      {wallets.length === 0 ? (
        <div className="empty-state">
          <p>No Solana wallet found in this browser.</p>
          <p className="muted small">
            Install one that supports the Wallet Standard, then reload.
          </p>
        </div>
      ) : (
        <ul className="option-list" aria-label="Wallets">
          {wallets.map((wallet) => (
            <li key={wallet.name}>
              <button
                type="button"
                className="option"
                disabled={busy !== undefined}
                onClick={() => void connectAndOpen(wallet)}
              >
                <img className="option-icon" src={wallet.icon} alt="" />
                <span className="option-label">{wallet.name}</span>
                {busy === wallet.name ? (
                  <span className="spinner" aria-label="Waiting for wallet" />
                ) : (
                  <span className="option-hint">Connect</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="field-group">
        <span className="field-label" id="memory-label">
          Remember sign-in
        </span>
        <div
          className="segmented"
          role="radiogroup"
          aria-labelledby="memory-label"
        >
          {MEMORY_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={memory === choice.value}
              className={memory === choice.value ? "segment active" : "segment"}
              disabled={busy !== undefined}
              onClick={() => {
                setMemory(choice.value);
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
        <p className="muted small">
          This tab and This browser keep the signature unencrypted in this
          browser&apos;s storage, readable by any script on this site. Never
          asks your wallet again after every reload.
        </p>
      </div>
      {summary === undefined ? null : <ResultView summary={summary} />}
    </section>
  );
}
