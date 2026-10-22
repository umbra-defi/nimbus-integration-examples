/**
 * Transactions as the page shows them: signatures in base58, explorer links, and where a sent
 * transaction ended up.
 */

import { getBase58Decoder } from "@solana/kit";
import type { TransactionSubmission } from "@umbra-privacy/nimbus-solana-web";

import type { ResultSummary } from "./format";

/** Encodes a signature or a 32-byte key as base58, the way explorers show them. */
export function encodeBase58(bytes: Uint8Array): string {
  return getBase58Decoder().decode(bytes);
}

/** Returns a Solana Explorer link for a mainnet transaction signature. */
export function buildExplorerLink(signature: Uint8Array): string {
  return `https://explorer.solana.com/tx/${encodeBase58(signature)}`;
}

/**
 * Describes where a transaction the wallet signed and sent ended up.
 *
 * @param args - The submission, and what the transaction was for, such as "The deposit".
 */
export function describeSubmission(args: {
  readonly submission: TransactionSubmission;
  readonly what: string;
}): ResultSummary {
  const { submission, what } = args;
  const code = `submitted/${submission.kind}`;
  const signature = encodeBase58(submission.signature);
  switch (submission.kind) {
    case "landed":
      return {
        code,
        message: `${what} landed on Solana in slot ${submission.slot.toString()}. Transaction ${signature}.`,
        tone: "done",
      };
    case "failed":
      return {
        code,
        message: `${what} landed and failed, so nothing moved apart from the network fee: ${submission.error}. Transaction ${signature}.`,
        tone: "stopped",
      };
    case "expired":
      return {
        code,
        message: `${what} expired before it landed, so nothing moved. You can try again now.`,
        tone: "stopped",
      };
    case "refused":
      return {
        code,
        message: `The RPC would not send ${what.toLowerCase()}, so nothing moved: ${submission.detail}`,
        tone: "stopped",
      };
    case "unknown":
      return {
        code,
        message: `Solana has not settled ${what.toLowerCase()} yet, and it may still land. Transaction ${signature}.`,
        tone: "waiting",
      };
  }
}
