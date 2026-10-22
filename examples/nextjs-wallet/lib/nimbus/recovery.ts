/**
 * Recovery: returning a deposit stranded in the platform wallet, and settling a deposit whose
 * outcome Solana had not reported.
 */

import type { Address } from "@solana/kit";
import {
  createDepositContext,
  refundStrandedDeposit,
  resolvePendingDeposit,
} from "@umbra-privacy/nimbus-solana-web";
import type {
  NimbusSession,
  PendingDepositResolutionResult,
  StrandedDepositRefundOptions,
  StrandedDepositRefundResult,
} from "@umbra-privacy/nimbus-solana-web";

import type { ResultSummary } from "../format";
import { describeSubmission } from "../submission";

import type { PendingDeposit } from "./deposit";

/**
 * Returns what the platform wallet holds of `mint` to the connected wallet: funds a deposit left
 * there when it did not land. Run it only once every deposit of the mint has settled.
 *
 * @param options - The progress hook, and the transaction version the wallet signs.
 * @throws `NimbusSdkError` as `refundStrandedDeposit` throws it; `NimbusSolanaFlowError` with
 *   reason `fee-payer-unfunded` when the wallet holds too little SOL to pay the refund's fee.
 */
export async function refundStrandedFunds(
  session: NimbusSession,
  args: { readonly mint: Address },
  options: Pick<
    StrandedDepositRefundOptions,
    "onProgress" | "transactionVersion"
  >,
): Promise<StrandedDepositRefundResult> {
  const context = await createDepositContext(session);
  return refundStrandedDeposit(context, args, options);
}

/**
 * Waits for a pending deposit to land, fail or expire at the store's finality, confirmed, and tells
 * the store, which releases a failed or expired deposit's funds.
 *
 * @throws `NimbusSdkError` as `resolvePendingDeposit` throws it.
 */
export async function settlePendingDeposit(
  pending: PendingDeposit,
): Promise<PendingDepositResolutionResult> {
  return resolvePendingDeposit(pending.context, {
    submission: pending.submission,
  });
}

/** Describes what a refund came to, for the user. */
export function describeRefundResult(
  result: StrandedDepositRefundResult,
): ResultSummary {
  switch (result.kind) {
    case "nothing-held":
      return {
        code: result.kind,
        message:
          "The platform wallet holds none of this token, so nothing was sent.",
        tone: "done",
      };
    case "declined":
      return {
        code: result.kind,
        message: "Your wallet declined to sign, so nothing was sent.",
        tone: "stopped",
      };
    case "submitted":
      return describeSubmission({
        submission: result.submission,
        what: "The refund",
      });
  }
}

/** Describes what settling a pending deposit came to, for the user. */
export function describeResolutionResult(
  result: PendingDepositResolutionResult,
): ResultSummary {
  switch (result.kind) {
    case "landed":
      return {
        code: result.kind,
        message: `The deposit landed in slot ${result.slot.toString()}. Refresh to see it in your private balance.`,
        tone: "done",
      };
    case "failed":
      return {
        code: result.kind,
        message: `The deposit landed and failed, so nothing was deposited: ${result.error}. Its funds are released and you can try again now.`,
        tone: "stopped",
      };
    case "expired":
      return {
        code: result.kind,
        message:
          "The deposit expired without landing, so nothing was deposited. You can try again now.",
        tone: "stopped",
      };
    case "unknown":
      return {
        code: result.kind,
        message: `Solana has still not settled the deposit, and it may land: ${result.detail}. Try again in a minute.`,
        tone: "waiting",
      };
    case "store-refused":
      return {
        code: result.kind,
        message:
          "This browser's account data could not be opened, so nothing was recorded.",
        tone: "stopped",
      };
  }
}
