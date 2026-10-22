/**
 * Formatting for the page: token amounts, addresses and the SDK's errors.
 */

import {
  isNimbusSdkError,
  isNimbusSolanaFlowError,
} from "@umbra-privacy/nimbus-solana-web";
import type {
  NimbusMint,
  NimbusSdk,
  NimbusSolanaFlowError,
} from "@umbra-privacy/nimbus-solana-web";

/** How a flow ended, for the result panel's colour. */
export type ResultTone = "done" | "waiting" | "stopped";

/** A flow's result, said in words, with the SDK's `kind` beside it for developers. */
export interface ResultSummary {
  readonly tone: ResultTone;
  /** The SDK result's `kind`, and a nested kind where one decides the outcome. */
  readonly code: string;
  readonly message: string;
  /** The SDK's own text, for a developer, shown folded away under the message when present. */
  readonly detail?: string;
}

/** The decimals of SOL: lamports per SOL is 10^9. */
const SOL_DECIMALS = 9;

/** Finds the SDK's entry for a mint, which carries its decimals. */
export function findMint(sdk: NimbusSdk, mint: string): NimbusMint | undefined {
  return sdk.mints.find((entry) => entry.mint === mint);
}

/** Formats an amount in base units with the mint's decimals, such as `1.5` for `1500000n` at 6. */
export function formatAmount(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value)
    .toString()
    .padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/u, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  return `${negative ? "-" : ""}${grouped}${fraction === "" ? "" : `.${fraction}`}`;
}

/**
 * Parses an amount typed in whole tokens into base units.
 *
 * @returns `amount` with the base units, or `invalid` with why, said for the user.
 */
export function parseAmount(
  text: string,
  decimals: number,
):
  | { readonly kind: "amount"; readonly value: bigint }
  | { readonly kind: "invalid"; readonly reason: string } {
  const match = /^(\d+)(?:\.(\d*))?$/u.exec(text.trim().replace(/,/gu, ""));
  if (match?.[1] === undefined) {
    return { kind: "invalid", reason: "Enter an amount such as 12.5." };
  }
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) {
    return {
      kind: "invalid",
      reason: `This token has ${String(decimals)} decimal places, so the amount can have at most that many.`,
    };
  }
  const value = BigInt(match[1] + fraction.padEnd(decimals, "0"));
  if (value === 0n) {
    return { kind: "invalid", reason: "Enter an amount above zero." };
  }
  return { kind: "amount", value };
}

/** Shortens an address or signature to its first and last four characters. */
export function shortenAddress(text: string): string {
  return text.length <= 12 ? text : `${text.slice(0, 4)}…${text.slice(-4)}`;
}

/** What each of the SDK's error reasons means for the user. */
const ERROR_REASONS: Readonly<Record<string, string>> = {
  misconfigured: "A setting this app was built with is missing or wrong.",
  unreadable:
    "A service or this browser's storage answered something that could not be read.",
  "unsupported-browser":
    "This browser lacks something the app needs, or refused its storage.",
  "wallet-unsupported":
    "The wallet could not sign what was asked, or signed something else.",
  "service-unavailable":
    "A service could not be reached. Try again in a moment.",
  "dependency-nonconforming":
    "A downloaded file did not match what the app expects, so it was not used.",
  unauthorized:
    "The gateway refused the request, because this app holds no valid access token.",
  "recipient-unregistered":
    "The recipient has not registered yet, so nothing was sent. Ask them to register, or check the address.",
  "account-unregistered":
    "This account is not registered in the pool yet, so nothing was sent. Register first, or wait a moment after registering.",
};

/** Reads a lamport amount the SDK put in an error's detail as a decimal string. */
function readDetailLamports(
  detail: Readonly<Record<string, unknown>>,
  key: string,
): bigint | undefined {
  const value = detail[key];
  return typeof value === "string" && /^\d+$/u.test(value)
    ? BigInt(value)
    : undefined;
}

/**
 * Describes a protocol refusal the app can say in words, keeping the SDK's text as the detail.
 *
 * @returns The summary, or `undefined` for a reason the app has no words for.
 */
function describeFlowRefusal(
  thrown: NimbusSolanaFlowError,
): ResultSummary | undefined {
  if (thrown.reason === "fee-payer-unfunded") {
    const required = readDetailLamports(thrown.detail, "requiredLamports");
    const held = readDetailLamports(thrown.detail, "heldLamports");
    const amounts =
      required === undefined
        ? ""
        : ` It needs at least ${formatAmount(required, SOL_DECIMALS)} SOL${
            held === undefined
              ? ""
              : ` and holds ${formatAmount(held, SOL_DECIMALS)} SOL`
          }.`;
    return {
      code: thrown.reason,
      detail: thrown.message,
      message: `Your wallet needs a little SOL to pay the network fee. Add some and try again.${amounts}`,
      tone: "stopped",
    };
  }
  if (
    thrown.reason === "transaction-unsendable" &&
    typeof thrown.detail.error === "string"
  ) {
    return {
      code: thrown.reason,
      detail: thrown.message,
      message:
        "Solana would not accept this transaction, so nothing was signed or sent. Try again in a moment.",
      tone: "stopped",
    };
  }
  return undefined;
}

/**
 * Describes what a flow threw: the SDK's reason in words, then its message; a protocol refusal the
 * app has words for is said plainly, its text kept as the detail.
 *
 * @returns The reason as the SDK names it, and a message for the user.
 */
export function describeThrown(thrown: unknown): ResultSummary {
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  if (isNimbusSdkError(thrown)) {
    return {
      code: thrown.reason,
      message: `${ERROR_REASONS[thrown.reason] ?? "The SDK stopped."} ${message}`,
      tone: "stopped",
    };
  }
  if (isNimbusSolanaFlowError(thrown)) {
    return (
      describeFlowRefusal(thrown) ?? {
        code: thrown.reason,
        message,
        tone: "stopped",
      }
    );
  }
  const name = thrown instanceof Error ? thrown.name : "unexpected";
  return { code: name, message, tone: "stopped" };
}
