/**
 * The example's two settings, read from the `NEXT_PUBLIC_NIMBUS_*` environment variables that Next
 * writes into the bundle at build time. The SDK's mainnet preset carries every other endpoint and
 * the proving keys.
 */

/** The example's settings, each absent while its variable is empty. */
export interface Settings {
  /** A Solana RPC endpoint in place of the preset's public one. */
  readonly rpc?: string;
  /** The gateway token every session carries; without one, flows fail `unauthorized`. */
  readonly gatewayToken?: string;
}

/**
 * Reads the settings. Next replaces only a literal `process.env.NEXT_PUBLIC_*` access in a browser
 * bundle, so each name is spelled out.
 */
export function readSettings(): Settings {
  const rpc = process.env.NEXT_PUBLIC_NIMBUS_RPC ?? "";
  const gatewayToken = process.env.NEXT_PUBLIC_NIMBUS_GATEWAY_TOKEN ?? "";
  return {
    ...(rpc === "" ? {} : { rpc }),
    ...(gatewayToken === "" ? {} : { gatewayToken }),
  };
}
