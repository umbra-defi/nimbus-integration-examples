"use client";

import type { NimbusSdk } from "@umbra-privacy/nimbus-solana-web";
import { useRef, useState } from "react";
import type { ReactElement } from "react";

import { formatAmount, shortenAddress } from "../lib/format";
import type { TokenBalance } from "../lib/nimbus/account";
import { labelToken, listTokens } from "../lib/tokens";

import { TokenAvatar } from "./token-avatar";

/**
 * Renders the token button of an amount field, which opens a searchable list of every token the
 * preset offers, those the account holds first with their available balance.
 */
export function TokenPicker({
  sdk,
  value,
  balances,
  disabled,
  onChange,
}: {
  readonly sdk: NimbusSdk;
  readonly value: string;
  readonly balances: readonly TokenBalance[];
  readonly disabled: boolean;
  readonly onChange: (mint: string) => void;
}): ReactElement {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const token = labelToken(sdk, value);
  const held = new Map(balances.map((entry) => [entry.mint, entry.available]));
  const needle = query.trim().toLowerCase();
  const tokens = listTokens(sdk)
    .filter(
      (entry) =>
        needle === "" ||
        entry.symbol.toLowerCase().includes(needle) ||
        entry.name.toLowerCase().includes(needle) ||
        entry.mint.toLowerCase().includes(needle),
    )
    .sort(
      (left, right) =>
        Number((held.get(right.mint) ?? 0n) > 0n) -
        Number((held.get(left.mint) ?? 0n) > 0n),
    );

  /** Closes the list, clearing the search. */
  function close(): void {
    dialog.current?.close();
    setQuery("");
  }

  return (
    <>
      <button
        type="button"
        className="token-button"
        disabled={disabled}
        title={value}
        onClick={() => dialog.current?.showModal()}
      >
        <TokenAvatar token={token} />
        <span className="token-button-symbol">{token.symbol}</span>
        <svg className="chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        className="sheet"
        aria-label="Select a token"
        onClick={(event) => {
          if (event.target === dialog.current) {
            close();
          }
        }}
        onClose={() => {
          setQuery("");
        }}
      >
        <div className="sheet-head">
          <h2 className="sheet-title">Select a token</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={close}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search name, ticker or address"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <ul className="token-list">
          {tokens.length === 0 ? (
            <li className="muted small token-list-empty">No token matches.</li>
          ) : (
            tokens.map((entry) => {
              const available = held.get(entry.mint) ?? 0n;
              return (
                <li key={entry.mint}>
                  <button
                    type="button"
                    className={
                      entry.mint === value ? "token-row selected" : "token-row"
                    }
                    onClick={() => {
                      onChange(entry.mint);
                      close();
                    }}
                  >
                    <TokenAvatar token={entry} />
                    <span className="token-row-text">
                      <span className="token-row-symbol">{entry.symbol}</span>
                      <span className="token-row-mint">
                        {entry.name} · {shortenAddress(entry.mint)}
                      </span>
                    </span>
                    {available > 0n ? (
                      <span className="token-row-amount">
                        {formatAmount(available, entry.decimals)}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </dialog>
    </>
  );
}
