/**
 * Loading the SDK for mainnet from its preset, with the WASM files and prover worker the SDK ships,
 * which `npm install` copies to `public/nimbus/` through the `postinstall` script.
 */

import {
  isNimbusSdkError,
  loadNimbusSdk,
} from "@umbra-privacy/nimbus-solana-web";
import type { NimbusSdk } from "@umbra-privacy/nimbus-solana-web";

import { readSettings } from "./settings";

/** Where this app serves the SDK's `assets/` directory. */
const ASSETS_BASE_URL = "/nimbus/";

/** What loading the SDK came to. */
export type SdkLoading =
  | { readonly kind: "loaded"; readonly sdk: NimbusSdk }
  | {
      readonly kind: "failed";
      readonly reason: string;
      readonly message: string;
    };

/**
 * Loads the SDK for mainnet, the only cluster this example runs on.
 *
 * @returns `loaded` with the SDK, or `failed` with the SDK's reason, such as `unsupported-browser`
 *   when the page is not cross-origin isolated, or `service-unavailable` when the WASM cannot be
 *   fetched because `npm install` (or `npm run assets`) has not copied it to `public/nimbus/`.
 */
export async function loadSdk(): Promise<SdkLoading> {
  const { rpc } = readSettings();
  try {
    const sdk = await loadNimbusSdk(
      { cluster: "mainnet" },
      rpc === undefined
        ? { assetsBaseUrl: ASSETS_BASE_URL }
        : { assetsBaseUrl: ASSETS_BASE_URL, endpoints: { rpc } },
    );
    return { kind: "loaded", sdk };
  } catch (thrown) {
    return {
      kind: "failed",
      message: thrown instanceof Error ? thrown.message : String(thrown),
      reason: isNimbusSdkError(thrown) ? thrown.reason : "unexpected",
    };
  }
}
