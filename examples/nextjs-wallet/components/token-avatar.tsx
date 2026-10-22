"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import type { TokenLabel } from "../lib/tokens";

/**
 * Renders a token's round logo, or its symbol's first letters when it has none or the logo fails
 * to load.
 */
export function TokenAvatar({
  token,
  size = "regular",
}: {
  readonly token: Pick<TokenLabel, "symbol" | "logo">;
  readonly size?: "regular" | "large";
}): ReactElement {
  const [failed, setFailed] = useState(false);
  const className = size === "large" ? "token-avatar large" : "token-avatar";
  if (token.logo !== "" && !failed) {
    return (
      <img
        className={className}
        src={token.logo}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => {
          setFailed(true);
        }}
      />
    );
  }
  const letters = token.symbol.replace(/[^A-Za-z0-9]/gu, "").slice(0, 2) || "?";
  return (
    <span className={`${className} initials`} aria-hidden="true">
      {letters}
    </span>
  );
}
