"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import { useApp } from "./app-provider";
import type { OpenedAccount } from "./app-provider";
import { ResultView } from "./result-view";

/** The theme choices, as the appearance control offers them. */
const THEME_CHOICES = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

/** Says where the sign-in signature is kept, for the user. */
const MEMORY_TEXT = {
  browser: "This browser",
  none: "Never: your wallet signs after every reload",
  tab: "This tab",
} as const;

/** Renders one address with a copy button, its middle elided when it does not fit. */
function AddressValue({ value }: { readonly value: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <span className="address-value">
      <span className="address-text" title={value}>
        {value}
      </span>
      <button
        type="button"
        className="chip-button"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 1500);
          });
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

/** Renders the account panel: the wallet, its platform wallet, the sign-in, and sign-out. */
export function AccountPanel({
  opened,
}: {
  readonly opened: OpenedAccount;
}): ReactElement {
  const { signOut, signingOut, signOutFailure, running, theme, setTheme } =
    useApp();
  return (
    <section className="panel" aria-labelledby="account-title">
      <h1 className="panel-title" id="account-title">
        Account
      </h1>
      <dl className="details">
        <div className="detail">
          <dt>Wallet</dt>
          <dd>
            <AddressValue value={opened.session.walletAddress} />
          </dd>
        </div>
        <div className="detail">
          <dt>Platform wallet</dt>
          <dd>
            <AddressValue value={opened.session.platformWallet} />
          </dd>
        </div>
        <div className="detail">
          <dt>Connected with</dt>
          <dd className="detail-inline">
            <img src={opened.connected.wallet.icon} alt="" />
            {opened.connected.wallet.name}
          </dd>
        </div>
        <div className="detail">
          <dt>Sign-in remembered</dt>
          <dd>{MEMORY_TEXT[opened.memory]}</dd>
        </div>
        <div className="detail">
          <dt>Network</dt>
          <dd>Solana mainnet</dd>
        </div>
        <div className="detail">
          <dt id="appearance-label">Appearance</dt>
          <dd>
            <div
              className="segmented"
              role="radiogroup"
              aria-labelledby="appearance-label"
            >
              {THEME_CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === choice.value}
                  className={
                    theme === choice.value ? "segment active" : "segment"
                  }
                  onClick={() => {
                    setTheme(choice.value);
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className="button quiet large"
        disabled={signingOut || running !== undefined}
        onClick={() => void signOut()}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
      {running === undefined ? null : (
        <p className="muted small">
          Sign-out waits until the {running} finishes.
        </p>
      )}
      {signOutFailure === undefined ? null : (
        <ResultView summary={signOutFailure} />
      )}
    </section>
  );
}
