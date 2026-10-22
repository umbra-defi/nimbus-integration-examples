/**
 * Withdrawing from the private balance to a wallet.
 */

import type { Address } from "@solana/kit";
import {
  createWithdrawalContext,
  withdraw,
} from "@umbra-privacy/nimbus-solana-web";
import type {
  NimbusSession,
  WithdrawalResult,
  WithdrawOptions,
} from "@umbra-privacy/nimbus-solana-web";

/**
 * Withdraws `amount` of `mint` from the private balance to `recipient`'s token account, through the
 * relayer, combining the balance first when one payment cannot cover the amount.
 *
 * @param args - The mint, the amount in its base units, and the wallet address paid.
 * @param options - The progress hook, which also reports each combining step.
 * @throws `NimbusSdkError` as `withdraw` throws it; `NimbusSolanaFlowError` when the protocol
 *   refuses the withdrawal.
 */
export async function withdrawToWallet(
  session: NimbusSession,
  args: {
    readonly mint: Address;
    readonly amount: bigint;
    readonly recipient: Address;
  },
  options: Pick<WithdrawOptions, "onProgress">,
): Promise<WithdrawalResult> {
  const context = await createWithdrawalContext(session);
  return withdraw(context, args, options);
}
