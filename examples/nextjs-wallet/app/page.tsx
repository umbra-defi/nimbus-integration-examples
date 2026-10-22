"use client";

import type { ReactElement } from "react";

import { AccountGate } from "../components/account-gate";
import { ActionCard } from "../components/action-card";
import { BalancesPanel } from "../components/balances-panel";

/** Renders the wallet page: the action card, then the private balance with what is in use. */
export default function WalletPage(): ReactElement {
  return (
    <AccountGate>
      {(opened) => (
        <>
          <ActionCard opened={opened} />
          <BalancesPanel opened={opened} />
        </>
      )}
    </AccountGate>
  );
}
