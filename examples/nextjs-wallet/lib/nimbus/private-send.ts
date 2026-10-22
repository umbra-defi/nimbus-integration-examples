/**
 * Private Send: paying another registered account from the private balance.
 */

import type { Address } from "@solana/kit";
import {
  createTransferContext,
  transfer,
} from "@umbra-privacy/nimbus-solana-web";
import type {
  NimbusSession,
  TransferOptions,
  TransferResult,
} from "@umbra-privacy/nimbus-solana-web";

/**
 * Sends `amount` of `mint` from the private balance to `recipient`, a registered wallet, through the
 * relayer; it arrives in the recipient's private balance.
 *
 * @param args - The mint, the amount in its base units, and the recipient's wallet address.
 * @param options - The progress hook, which also reports each combining step.
 * @throws `NimbusSdkError` as `transfer` throws it, with reason `recipient-unregistered` for a
 *   recipient that has not registered; `NimbusSolanaFlowError` when the protocol refuses the
 *   transfer.
 */
export async function sendPrivately(
  session: NimbusSession,
  args: {
    readonly mint: Address;
    readonly amount: bigint;
    readonly recipient: Address;
  },
  options: Pick<TransferOptions, "onProgress">,
): Promise<TransferResult> {
  const context = await createTransferContext(session);
  return transfer(context, args, options);
}
