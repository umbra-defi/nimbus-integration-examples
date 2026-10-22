"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import {
  depositFromWallet,
  describeDepositResult,
  findPendingDeposit,
} from "../lib/nimbus/deposit";
import { sendPrivately } from "../lib/nimbus/private-send";
import { describeSpendResult } from "../lib/nimbus/spend";
import { withdrawToWallet } from "../lib/nimbus/withdraw";

import { useApp } from "./app-provider";
import type { OpenedAccount } from "./app-provider";
import { FlowForm } from "./flow-form";
import type { FlowSpec } from "./flow-form";

/** The card's tabs, in the order a user meets them. */
const TABS = [
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
  { id: "send", label: "Send" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Builds each tab's flow for the opened account. */
function buildSpecs(
  opened: OpenedAccount,
  onPending: ReturnType<typeof useApp>["setPending"],
): Readonly<Record<TabId, FlowSpec>> {
  const { session, connected } = opened;
  return {
    deposit: {
      amountLabel: "You deposit",
      note: "Your wallet signs the deposit and pays the network fee. The deposit is public; what you do with the balance afterwards is not.",
      ownRecipient: session.walletAddress,
      recipientLabel: "Into the private balance of",
      run: async (request, onProgress) => {
        const { context, result } = await depositFromWallet(session, request, {
          onProgress,
          transactionVersion: connected.transactionVersion,
        });
        onPending(findPendingDeposit(context, result));
        return describeDepositResult(result);
      },
      spendsPrivateBalance: false,
      submitLabel: "Deposit",
      what: "deposit",
    },
    send: {
      amountLabel: "You send",
      note: "It arrives in their private balance. Nobody watching sees who paid whom, how much, or which token.",
      ownRecipient: "",
      recipientLabel: "To a registered wallet",
      run: async (request, onProgress) =>
        describeSpendResult(
          await sendPrivately(session, request, { onProgress }),
          { decimals: request.decimals, what: "The Private Send" },
        ),
      spendsPrivateBalance: true,
      submitLabel: "Send privately",
      what: "Private Send",
    },
    withdraw: {
      amountLabel: "You withdraw",
      note: "The relayer submits it, so your wallet signs nothing. If no single payment covers the amount, your balance is combined first.",
      ownRecipient: session.walletAddress,
      recipientLabel: "To wallet",
      run: async (request, onProgress) =>
        describeSpendResult(
          await withdrawToWallet(session, request, { onProgress }),
          { decimals: request.decimals, what: "The withdrawal" },
        ),
      spendsPrivateBalance: true,
      submitLabel: "Withdraw",
      what: "withdrawal",
    },
  };
}

/**
 * Renders the action card: Deposit, Withdraw and Send as tabs over one focused form, sharing the
 * chosen token. Every tab stays mounted, so switching never drops a form's input.
 */
export function ActionCard({
  opened,
}: {
  readonly opened: OpenedAccount;
}): ReactElement {
  const { account, setPending } = useApp();
  const balances = account.reading.balances;
  const [tab, setTab] = useState<TabId>("deposit");
  const [chosen, setChosen] = useState<string | undefined>();
  const mint =
    chosen ??
    balances.find((entry) => entry.available > 0n)?.mint ??
    opened.session.sdk.mints[0]?.mint ??
    "";
  const specs = buildSpecs(opened, setPending);

  return (
    <section className="panel action-card" aria-label="Move funds">
      <div className="tabs" role="tablist" aria-label="Action">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`tab-${entry.id}`}
            aria-selected={tab === entry.id}
            aria-controls={`panel-${entry.id}`}
            className={tab === entry.id ? "tab active" : "tab"}
            onClick={() => {
              setTab(entry.id);
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {TABS.map((entry) => (
        <div
          key={entry.id}
          role="tabpanel"
          id={`panel-${entry.id}`}
          aria-labelledby={`tab-${entry.id}`}
          hidden={tab !== entry.id}
        >
          <FlowForm
            spec={specs[entry.id]}
            mint={mint}
            balances={balances}
            onMintChange={setChosen}
          />
        </div>
      ))}
    </section>
  );
}
