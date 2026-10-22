/**
 * Opening and closing a session for the connected wallet, with the sign-in kept where the user
 * chose.
 */

import {
  closeNimbusSession,
  createMemorySignatureSecretStore,
  createPersistentSignatureSecretStore,
  createTabSignatureSecretStore,
  openNimbusSession,
} from "@umbra-privacy/nimbus-solana-web";
import type {
  NimbusSdk,
  NimbusSession,
  OpenNimbusSessionResult,
  SignatureSecretStore,
  WalletStandardSigner,
} from "@umbra-privacy/nimbus-solana-web";

import { readSettings } from "./settings";

/**
 * Where the wallet's sign-in signature is remembered: for this tab (`sessionStorage`), for this
 * browser (`localStorage`), or nowhere, so the wallet signs again after every reload.
 */
export type SignInMemory = "tab" | "browser" | "none";

/** Creates the SDK's signature store for a choice of memory. */
function createSignatureStore(memory: SignInMemory): SignatureSecretStore {
  if (memory === "browser") {
    return createPersistentSignatureSecretStore();
  }
  return memory === "tab"
    ? createTabSignatureSecretStore()
    : createMemorySignatureSecretStore();
}

/**
 * Opens a session: the wallet signs one message unless the chosen memory already holds its
 * signature for mainnet. The session carries the build's gateway token; without one it opens and
 * reads, and every flow fails `unauthorized`.
 *
 * @returns `opened` with the session, or `declined` when the user refused to sign.
 * @throws `NimbusSdkError` as `openNimbusSession` throws it, such as `wallet-unsupported` or
 *   `service-unavailable` when the context API cannot be reached.
 */
export async function openSession(
  sdk: NimbusSdk,
  args: {
    readonly signer: WalletStandardSigner;
    readonly memory: SignInMemory;
  },
): Promise<OpenNimbusSessionResult> {
  const { gatewayToken } = readSettings();
  const signatureSecretStore = createSignatureStore(args.memory);
  return openNimbusSession(
    sdk,
    { connectedWallet: args.signer },
    gatewayToken === undefined
      ? { signatureSecretStore }
      : { gatewayToken, signatureSecretStore },
  );
}

/**
 * Signs out: closes the session, which zeroes its keys, and forgets the remembered signature, so the
 * next session asks the wallet to sign again.
 */
export async function closeSession(
  session: NimbusSession,
  args: { readonly memory: SignInMemory },
): Promise<void> {
  closeNimbusSession(session);
  await createSignatureStore(args.memory).wipeSignatureSecret({
    chain: session.sdk.deployment.chain,
    cluster: session.sdk.cluster,
    walletAddress: session.walletAddress,
  });
}
