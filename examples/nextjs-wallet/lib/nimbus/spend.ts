/**
 * What a withdrawal or a Private Send came to, said for the user: both spend from the private
 * balance through the relayer, and both report the same outcomes.
 */

import type {
  SpendRefusal,
  SpendSettlement,
  WithdrawalResult,
} from "@umbra-privacy/nimbus-solana-web";

import { formatAmount } from "../format";
import type { ResultSummary } from "../format";

/** Says why a spend stopped before anything left the device. */
function describeRefusal(refusal: SpendRefusal, decimals: number): string {
  switch (refusal.kind) {
    case "insufficient":
      return `Your private balance cannot cover this amount with its fees. It holds ${formatAmount(refusal.available, decimals)} of this token that can be spent.`;
    case "not-registered":
      return "This account's registration is not final yet, so nothing can be spent. Refresh in a minute and try again.";
    case "lease-refused":
      return "Part of your private balance is held by another transaction in progress. Try again once it finishes.";
    case "store-refused":
    case "attempt-refused":
    case "stale-handle":
    case "store-unavailable":
      return "This browser's account data could not be used. Reload the page and try again.";
  }
}

/** Says how following a relayed spend settled. */
function describeSettlement(
  settlement: SpendSettlement,
  what: string,
): ResultSummary {
  switch (settlement.kind) {
    case "landed":
      return {
        code: "relayed/landed",
        message: `${what} landed on Solana. ${settlement.sync.kind === "ingested" ? "Your private balance is up to date." : "Refresh to bring your private balance up to date."}`,
        tone: "done",
      };
    case "failed":
      return {
        code: `relayed/failed/${settlement.state}`,
        message: `The relayer sent ${what.toLowerCase()}, but Solana ${settlement.state === "expired" ? "did not take it in time" : "refused it"}${settlement.failureCode === "" ? "" : ` (${settlement.failureCode})`}. Your money is still in your private balance, though the part this tried to spend stays held for a few minutes.`,
        tone: "stopped",
      };
    case "pending":
      return {
        code: "relayed/pending",
        message: `The relayer accepted ${what.toLowerCase()}, and it had not settled when this stopped waiting. Refresh in a minute to see it land.`,
        tone: "waiting",
      };
    case "not-followed":
      return {
        code: "relayed",
        message: `The relayer accepted ${what.toLowerCase()} and will send it to Solana.`,
        tone: "done",
      };
  }
}

/**
 * Describes what a withdrawal or a Private Send came to.
 *
 * @param args - What the spend was ("The withdrawal"), and the mint's decimals.
 */
export function describeSpendResult(
  result: WithdrawalResult,
  args: { readonly what: string; readonly decimals: number },
): ResultSummary {
  switch (result.kind) {
    case "relayed":
      return describeSettlement(result.settlement, args.what);
    case "refused":
      return {
        code: `${result.kind}/${result.refusal.kind}`,
        message: `${describeRefusal(result.refusal, args.decimals)} Nothing was sent.`,
        tone: "stopped",
      };
    case "relay-refused":
      return {
        code: `${result.kind}/${result.code}`,
        message: `The relayer refused ${args.what.toLowerCase()}: ${result.detail}. Nothing was sent, and the part this tried to spend is free again.`,
        tone: "stopped",
      };
    case "unsent":
      return {
        code: `${result.kind}/${result.refusal.kind}`,
        message:
          "This browser's account data would not record the transaction, so nothing was sent.",
        tone: "stopped",
      };
    case "merge-failed":
      return {
        code: `${result.kind}/${result.cause.kind}`,
        message: `The payment needed your private balance combined first, and combining stopped after ${String(result.mergesCompleted)} finished step(s). Those steps stay combined, so a retry needs fewer. Your money is still in your private balance.`,
        tone: "stopped",
      };
  }
}
