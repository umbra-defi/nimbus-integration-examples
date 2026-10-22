/**
 * Token names and logos for the page. The SDK's preset lists each mint's address and decimals but
 * no name, so `token-list.json`, which `npm run tokens` writes from Jupiter's token API, supplies each
 * mint's symbol, name and logo; a mint it lacks shows its shortened address.
 */

import type { NimbusSdk } from "@umbra-privacy/nimbus-solana-web";

import { shortenAddress } from "./format";
import TOKEN_LIST from "./token-list.json";

/** A mint as the page shows it. */
export interface TokenLabel {
  readonly mint: string;
  readonly symbol: string;
  /** The token's full name; the shortened address when the list has none. */
  readonly name: string;
  /** The logo's path on this origin; empty when the list has none, and initials are drawn. */
  readonly logo: string;
  readonly decimals: number;
}

/** The list's entries, by mint. */
const LISTED: ReadonlyMap<
  string,
  { readonly symbol: string; readonly name: string; readonly logo: string }
> = new Map(TOKEN_LIST.map((entry) => [entry.mint, entry]));

/** The tokens a picker shows first, in this order; the rest follow by symbol. */
const LEADING = [
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
] as const;

/** Names a mint the page shows; a mint the preset does not list keeps 0 decimals. */
export function labelToken(sdk: NimbusSdk, mint: string): TokenLabel {
  const listed = LISTED.get(mint);
  const symbol =
    listed === undefined || listed.symbol === ""
      ? shortenAddress(mint)
      : listed.symbol;
  return {
    decimals: sdk.mints.find((entry) => entry.mint === mint)?.decimals ?? 0,
    logo: listed?.logo ?? "",
    mint,
    name: listed === undefined || listed.name === "" ? symbol : listed.name,
    symbol,
  };
}

/** Lists the preset's mints for a token picker: the leading few, then the rest by symbol. */
export function listTokens(sdk: NimbusSdk): readonly TokenLabel[] {
  return sdk.mints
    .map((entry) => labelToken(sdk, entry.mint))
    .sort((left, right) => {
      const leftRank = LEADING.indexOf(left.mint as (typeof LEADING)[number]);
      const rightRank = LEADING.indexOf(right.mint as (typeof LEADING)[number]);
      if (leftRank !== -1 || rightRank !== -1) {
        return (
          (leftRank === -1 ? LEADING.length : leftRank) -
          (rightRank === -1 ? LEADING.length : rightRank)
        );
      }
      return left.symbol.localeCompare(right.symbol, "en", {
        sensitivity: "base",
      });
    });
}
