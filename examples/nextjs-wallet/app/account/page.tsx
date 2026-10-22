"use client";

import type { ReactElement } from "react";

import { AccountGate } from "../../components/account-gate";
import { AccountPanel } from "../../components/account-panel";
import { RecoveryCard } from "../../components/recovery-card";

/** Renders the account page: the account's details and sign-out, and recovery. */
export default function AccountPage(): ReactElement {
  return (
    <AccountGate>
      {(opened) => (
        <>
          <AccountPanel opened={opened} />
          <RecoveryCard opened={opened} />
        </>
      )}
    </AccountGate>
  );
}
