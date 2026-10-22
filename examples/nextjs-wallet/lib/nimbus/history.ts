/**
 * The account's history, a page at a time, newest first.
 */

import { readHistory } from "@umbra-privacy/nimbus-solana-web";
import type {
  HistoryPage,
  HistoryPosition,
  NimbusSession,
} from "@umbra-privacy/nimbus-solana-web";

/** The transactions one page shows. */
const PAGE_SIZE = 10;

/**
 * Reads one page of history from the session's store, as the last sync left it.
 *
 * @param args - `after`: the position the previous page's `next` named, or `start` for the newest.
 * @throws `NimbusSdkError` with reason `unreadable` or `unsupported-browser` when the store cannot be
 *   read.
 */
export async function readHistoryPage(
  session: NimbusSession,
  args: { readonly after: HistoryPosition | "start" },
): Promise<HistoryPage> {
  return readHistory(
    session,
    {},
    args.after === "start"
      ? { limit: PAGE_SIZE }
      : { after: args.after, limit: PAGE_SIZE },
  );
}
