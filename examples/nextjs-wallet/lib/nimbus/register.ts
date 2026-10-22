/**
 * Registering the session's account, which it must do once before its first deposit.
 */

import {
  createRegistrationContext,
  readRegistration,
  register,
} from "@umbra-privacy/nimbus-solana-web";
import type {
  NimbusSession,
  RegisterOptions,
  RegistrationResult,
} from "@umbra-privacy/nimbus-solana-web";

import type { ResultSummary } from "../format";
import { describeSubmission } from "../submission";

/**
 * Registers the session's account in the newest open pool: one transaction the wallet signs.
 *
 * @param options - The progress hook, and the transaction version the wallet signs.
 * @throws `NimbusSdkError` as `register` throws it, such as `service-unavailable` when a service
 *   cannot be reached; `NimbusSolanaFlowError` with reason `fee-payer-unfunded` when the wallet
 *   holds too little SOL for the fee, before anything is proved.
 */
export async function registerAccount(
  session: NimbusSession,
  options: Pick<RegisterOptions, "onProgress" | "transactionVersion">,
): Promise<RegistrationResult> {
  const context = await createRegistrationContext(session);
  return register(context, {}, options);
}

/**
 * Reads whether the account is registered now, from the context API: the session's own standing
 * is fixed when it opened, so after registering it still says unregistered.
 *
 * @throws `NimbusSdkError` with reason `service-unavailable` or `unreadable` when the context API
 *   cannot answer.
 */
export async function readRegistered(session: NimbusSession): Promise<boolean> {
  return (await readRegistration(session, {})).kind === "registered";
}

/** Returns whether a registration result leaves the account registered. */
export function isRegistered(result: RegistrationResult): boolean {
  return (
    result.kind === "complete" ||
    (result.kind === "submitted" &&
      result.submission.submission.kind === "landed")
  );
}

/** Describes what registering came to, for the user. */
export function describeRegistrationResult(
  result: RegistrationResult,
): ResultSummary {
  switch (result.kind) {
    case "complete":
      return {
        code: result.kind,
        message: "This account is registered already, so nothing was sent.",
        tone: "done",
      };
    case "declined":
      return {
        code: result.kind,
        message: "Your wallet declined to sign, so nothing was sent.",
        tone: "stopped",
      };
    case "store-refused":
      return {
        code: `${result.kind}/${result.refusal.kind}`,
        message:
          "This browser's account data could not be opened, so nothing was sent.",
        tone: "stopped",
      };
    case "submitted":
      return describeSubmission({
        submission: result.submission.submission,
        what: "The registration",
      });
  }
}
