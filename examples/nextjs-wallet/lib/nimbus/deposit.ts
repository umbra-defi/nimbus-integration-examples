/**
 * Depositing from the connected wallet into a private balance.
 */

import type { Address } from "@solana/kit";
import {
  createDepositContext,
  deposit,
} from "@umbra-privacy/nimbus-solana-web";
import type {
  DepositContext,
  DepositOptions,
  DepositResult,
  DepositSubmission,
  NimbusSession,
} from "@umbra-privacy/nimbus-solana-web";

import type { ResultSummary } from "../format";
import { describeSubmission } from "../submission";

/** A deposit sent whose outcome Solana had not settled: what `resolvePendingDeposit` takes. */
export interface PendingDeposit {
  readonly context: DepositContext;
  readonly submission: DepositSubmission;
}

/**
 * Deposits `amount` of `mint` from the connected wallet as private balance for `recipient`, a
 * registered wallet: the session's own or someone else's.
 *
 * @param args - The mint, the amount in its base units, and the recipient's wallet address.
 * @param options - The progress hook, and the transaction version the wallet signs.
 * @returns The result, and the context it ran in, which resolving a pending deposit needs.
 * @throws `NimbusSdkError` as `deposit` throws it, with reason `recipient-unregistered` for a
 *   recipient that has not registered; `NimbusSolanaFlowError` when the protocol refuses the
 *   deposit, with reason `fee-payer-unfunded` when the wallet holds too little SOL to pay for it.
 */
export async function depositFromWallet(
  session: NimbusSession,
  args: {
    readonly mint: Address;
    readonly amount: bigint;
    readonly recipient: Address;
  },
  options: Pick<DepositOptions, "onProgress" | "transactionVersion">,
): Promise<{
  readonly context: DepositContext;
  readonly result: DepositResult;
}> {
  const context = await createDepositContext(session);
  const result = await deposit(context, args, options);
  return { context, result };
}

/** Returns the pending deposit a result leaves when Solana had not settled it, if any. */
export function findPendingDeposit(
  context: DepositContext,
  result: DepositResult,
): PendingDeposit | undefined {
  return result.kind === "submitted" &&
    result.submission.submission.kind === "unknown"
    ? { context, submission: result.submission }
    : undefined;
}

/** Describes what depositing came to, for the user. */
export function describeDepositResult(result: DepositResult): ResultSummary {
  switch (result.kind) {
    case "submitted": {
      const summary = describeSubmission({
        submission: result.submission.submission,
        what: "The deposit",
      });
      return summary.tone === "waiting"
        ? {
            ...summary,
            message: `${summary.message} Use Recovery to wait for it before depositing again.`,
          }
        : summary;
    }
    case "declined":
      return {
        code: result.kind,
        message: "Your wallet declined to sign, so nothing was sent.",
        tone: "stopped",
      };
    case "store-refused":
    case "intent-refused":
    case "attempt-refused":
      return {
        code: result.kind,
        message:
          "This browser's account data would not take the deposit, so nothing was sent.",
        tone: "stopped",
      };
    case "funding-failed":
    case "funding-unknown":
      return {
        code: `${result.kind}/${result.funding.kind}`,
        message:
          "The transfer that funds the deposit did not land, so nothing was deposited. Wait a minute before trying again.",
        tone: "stopped",
      };
    case "deposit-unsendable":
      return {
        code: result.kind,
        message: `The deposit could not be sent: ${result.refusal.message}. Its funds wait in your platform wallet; Recovery returns them.`,
        tone: "stopped",
      };
  }
}
