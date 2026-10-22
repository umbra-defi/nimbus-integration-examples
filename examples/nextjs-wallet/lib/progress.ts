/**
 * The live progress log: each stage a flow's `onProgress` hands over, said in words.
 */

/** One line of a flow's progress log. */
export interface ProgressLine {
  /** The stage as the SDK names it. */
  readonly stage: string;
  readonly message: string;
}

/** What each stage of the deposit, withdraw, transfer, register and refund flows means. */
const STAGE_MESSAGES: Readonly<Record<string, string>> = {
  synced: "Brought this device up to date with Solana.",
  prepared: "Prepared on this device.",
  endorsed: "The committee approved the transaction.",
  proved: "The privacy work on this device finished.",
  "funding-signed": "Your wallet signed the transfer that funds the deposit.",
  "funding-sent": "Sent the funding transfer to Solana.",
  "funding-confirmed": "The funding transfer landed.",
  signed: "Your wallet signed the transaction.",
  sent: "Sent the transaction to Solana.",
  confirmed: "The transaction landed on Solana.",
  relayed: "The relayer accepted the transaction and will send it.",
  "merge-prepared":
    "Combining part of your private balance so one payment can cover the amount.",
  "merge-relayed": "The relayer accepted the combining step.",
  "merge-settled": "The combining step finished.",
  settled: "Followed the payment until Solana settled it.",
};

/**
 * Builds a log line from a stage any flow reports; a merge stage carries its step number.
 *
 * @param event - The stage, as `onProgress` hands it over.
 */
export function buildProgressLine(event: {
  readonly stage: string;
}): ProgressLine {
  const step =
    "merge" in event && typeof event.merge === "number"
      ? ` Step ${String(event.merge)}.`
      : "";
  return {
    message: `${STAGE_MESSAGES[event.stage] ?? "Moved to the next stage."}${step}`,
    stage: event.stage,
  };
}
