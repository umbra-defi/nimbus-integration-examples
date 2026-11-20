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

/** Says why a spend was refused before the final payment was submitted. */
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
        message: `The relayer accepted ${what.toLowerCase()}, and it had not settled when this stopped waiting. Do not send it again until you refresh and check your balance and activity, or you could pay twice.`,
        tone: "waiting",
      };
    case "not-followed":
      return {
        code: "relayed/not-followed",
        message: `The relayer accepted ${what.toLowerCase()} and will submit it to Solana, but settlement was not followed. Do not send it again until you refresh and check your balance and activity, or you could pay twice.`,
        tone: "waiting",
      };
  }
}

/** Says why combining notes stopped before the final payment was sent. */
function describeMergeFailure(
  result: Extract<WithdrawalResult, { readonly kind: "merge-failed" }>,
  what: string,
): ResultSummary {
  const code = `${result.kind}/${result.cause.kind}`;
  const completed =
    result.mergesCompleted === 0
      ? ""
      : ` ${String(result.mergesCompleted)} earlier combining step${result.mergesCompleted === 1 ? "" : "s"} finished and may have paid fees.`;
  if (result.cause.kind === "timeout") {
    return {
      code,
      message: `${what} was not sent. Combining your private balance timed out before a step settled, and that merge may already have landed or may land later.${completed} Refresh to sync and check your balance before retrying.`,
      tone: "waiting",
    };
  }
  return {
    code,
    message: `${what} was not sent. Combining your private balance stopped before the payment could be submitted.${completed} Refresh to sync and check your balance before retrying.`,
    tone: "stopped",
  };
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
        message: `${describeRefusal(result.refusal, args.decimals)} ${args.what} was not sent.`,
        tone: "stopped",
      };
    case "relay-refused":
      return {
        code: `${result.kind}/${result.code}`,
        message: `The relayer refused ${args.what.toLowerCase()}: ${result.detail}. ${args.what} was not sent, and the part this tried to spend is free again.`,
        tone: "stopped",
      };
    case "unsent":
      return {
        code: `${result.kind}/${result.refusal.kind}`,
        message: `This browser's account data would not record the transaction, so ${args.what.toLowerCase()} was not sent.`,
        tone: "stopped",
      };
    case "merge-failed":
      return describeMergeFailure(result, args.what);
  }
}
