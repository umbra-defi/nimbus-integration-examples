"use client";

import type { ReactElement } from "react";

import { AccountGate } from "../../components/account-gate";
import { ActivityList } from "../../components/activity-list";

/** Renders the activity page: the account's transactions, newest first. */
export default function ActivityPage(): ReactElement {
  return (
    <AccountGate>
      {(opened) => <ActivityList session={opened.session} />}
    </AccountGate>
  );
}
