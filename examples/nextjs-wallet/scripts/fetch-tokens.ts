/**
 * Writes the example's token list: each mint in `lib/token-list.json`, plus any mint addresses
 * passed as arguments, with its symbol, name and logo from Jupiter's token API, with the logo resized to a 96-pixel WebP by the wsrv.nl image proxy and saved
 * under `public/tokens/` so the page serves it itself.
 *
 * Run it with `npm run tokens [mint ...]` when the SDK's mainnet mints change, and commit what it
 * writes. The page is
 * cross-origin isolated for the prover, so it shows an image from another origin only when that
 * host sends CORS headers; serving every logo from the page's own origin sidesteps which ones do.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const example = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoDirectory = join(example, "public", "tokens");
const listPath = join(example, "lib", "token-list.json");

/** Jupiter's token search, which takes up to 100 comma-separated mints. */
const SEARCH_URL = "https://lite-api.jup.ag/tokens/v2/search?query=";

/** The image proxy that fetches, crops and resizes each logo, at twice the largest size drawn. */
const RESIZE_URL = "https://wsrv.nl/?w=96&h=96&fit=cover&output=webp&url=";

/** The largest logo kept; a bigger file is left out and the page draws the token's initials. */
const MAX_LOGO_BYTES = 64 * 1024;

/** How many times a logo is asked for while its host answers 429, and the wait before each retry. */
const LOGO_ATTEMPTS = 4;
const RETRY_DELAY_MS = 2_000;

/** One token as Jupiter's search answers it, the fields read here. */
interface JupiterToken {
  readonly id: string;
  readonly symbol?: string;
  readonly name?: string;
  readonly icon?: string;
  readonly decimals?: number;
}

/** One entry of the list the page reads. */
interface TokenListEntry {
  readonly mint: string;
  readonly symbol: string;
  readonly name: string;
  /** The logo's path on the page's own origin, or empty when none was saved. */
  readonly logo: string;
}

/** Fetches Jupiter's metadata for every mint, by mint. */
async function fetchMetadata(
  mints: readonly string[],
): Promise<ReadonlyMap<string, JupiterToken>> {
  const response = await fetch(SEARCH_URL + mints.join(","));
  if (!response.ok) {
    throw new Error(
      `Jupiter's token search answered ${String(response.status)}`,
    );
  }
  const tokens = (await response.json()) as readonly JupiterToken[];
  return new Map(tokens.map((token) => [token.id, token]));
}

/** The extension a directly downloaded logo is saved under, by content type. */
const LOGO_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

/**
 * Downloads a logo as its host serves it, for one the proxy could not fetch, keeping it only when
 * it is a small image; returns its page path, or empty.
 */
async function saveOriginalLogo(mint: string, url: string): Promise<string> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const type =
      (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    const extension = LOGO_EXTENSIONS[type];
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      !response.ok ||
      extension === undefined ||
      bytes.byteLength > MAX_LOGO_BYTES
    ) {
      console.warn(
        `${mint}: logo skipped (${String(response.status)} ${type}, ${String(bytes.byteLength)} bytes)`,
      );
      return "";
    }
    writeFileSync(join(logoDirectory, `${mint}.${extension}`), bytes);
    return `/tokens/${mint}.${extension}`;
  } catch (thrown) {
    console.warn(
      `${mint}: logo skipped (${thrown instanceof Error ? thrown.message : String(thrown)})`,
    );
    return "";
  }
}

/** Waits `milliseconds`. */
async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Downloads a logo, resized, into `public/tokens/`, returning its page path, or empty when it cannot
 * be kept.
 */
async function saveLogo(
  mint: string,
  url: string | undefined,
): Promise<string> {
  if (!url?.startsWith("https://")) {
    return "";
  }
  for (let attempt = 1; attempt <= LOGO_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(RESIZE_URL + encodeURIComponent(url), {
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 429 && attempt < LOGO_ATTEMPTS) {
        await wait(RETRY_DELAY_MS * attempt);
        continue;
      }
      const type = response.headers.get("content-type") ?? "";
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (
        !response.ok ||
        !type.startsWith("image/webp") ||
        bytes.byteLength > MAX_LOGO_BYTES
      ) {
        return await saveOriginalLogo(mint, url);
      }
      writeFileSync(join(logoDirectory, `${mint}.webp`), bytes);
      return `/tokens/${mint}.webp`;
    } catch {
      if (attempt === LOGO_ATTEMPTS) {
        return await saveOriginalLogo(mint, url);
      }
    }
  }
  return "";
}

/** The mints the list covers: those it already holds, then any passed as arguments. */
const mints = [
  ...new Set([
    ...(JSON.parse(readFileSync(listPath, "utf8")) as readonly TokenListEntry[]).map(
      (entry) => entry.mint,
    ),
    ...process.argv.slice(2),
  ]),
];
const metadata = await fetchMetadata(mints);
rmSync(logoDirectory, { force: true, recursive: true });
mkdirSync(logoDirectory, { recursive: true });
const list: TokenListEntry[] = [];
for (const mint of mints) {
  const token = metadata.get(mint);
  list.push({
    logo: await saveLogo(mint, token?.icon),
    mint,
    name: token?.name ?? "",
    symbol: token?.symbol ?? "",
  });
}
writeFileSync(listPath, `${JSON.stringify(list, null, 2)}\n`);
console.log(
  `${String(list.length)} tokens, ${String(list.filter((entry) => entry.symbol !== "").length)} named, ${String(list.filter((entry) => entry.logo !== "").length)} with a logo`,
);
