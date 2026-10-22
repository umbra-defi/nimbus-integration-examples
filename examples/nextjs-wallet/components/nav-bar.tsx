"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

import { shortenAddress } from "../lib/format";
import { isDarkNow } from "../lib/theme";

import { useApp } from "./app-provider";

/** The pages the nav links to, in order, each with its tab-bar icon's path. */
const PAGES = [
  {
    href: "/",
    icon: "M2.5 5.5h11v7.5h-11zM2.5 5.5l8-3v3M10.5 9.25h1",
    label: "Wallet",
  },
  {
    href: "/activity",
    icon: "M2.5 8h2.5l1.5-4 3 8 1.5-4h2.5",
    label: "Activity",
  },
  {
    href: "/account",
    icon: "M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 13.5c.6-2.4 2.6-3.75 5-3.75s4.4 1.35 5 3.75",
    label: "Account",
  },
] as const;

/**
 * Renders the top bar: the logo, the pages, the network, and the connected wallet, or a way to
 * connect one; a running payment shows as a pill that leads back to it. On narrow screens the
 * pages move to a tab bar along the bottom, a sibling of the header because the header's backdrop
 * filter would otherwise pin it inside the header.
 */
export function NavBar(): ReactElement {
  const pathname = usePathname();
  const { opened, running, theme, setTheme } = useApp();
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="Umbra, wallet">
            <img src="/umbra-logo.svg" alt="Umbra" />
          </Link>
          <nav className="nav-links" aria-label="Pages">
            {PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className={
                  pathname === page.href ? "nav-link active" : "nav-link"
                }
                aria-current={pathname === page.href ? "page" : undefined}
              >
                {page.label}
              </Link>
            ))}
          </nav>
          <div className="nav-end">
            <button
              type="button"
              className="icon-button"
              aria-label="Switch between light and dark"
              title="Switch between light and dark"
              onClick={() => {
                setTheme(isDarkNow(theme) ? "light" : "dark");
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  className="theme-moon"
                  d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"
                />
                <path
                  className="theme-sun"
                  d="M8 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5zM8 1.5v1.25M8 13.25v1.25M14.5 8h-1.25M2.75 8H1.5M12.6 3.4l-.9.9M4.3 11.7l-.9.9M12.6 12.6l-.9-.9M4.3 4.3l-.9-.9"
                />
              </svg>
            </button>
            {running === undefined ? (
              <span className="network">
                <span className="network-dot" aria-hidden="true" />
                <span className="network-name">Solana</span>
              </span>
            ) : (
              <Link href="/" className="running-pill">
                <span className="spinner" aria-hidden="true" />
                <span className="running-text">
                  {running.charAt(0).toUpperCase() + running.slice(1)} running
                </span>
              </Link>
            )}
            {opened === undefined ? (
              <Link href="/" className="button primary compact">
                Connect
              </Link>
            ) : (
              <Link
                href="/account"
                className="wallet-pill"
                title={opened.session.walletAddress}
              >
                <img src={opened.connected.wallet.icon} alt="" />
                <span>{shortenAddress(opened.session.walletAddress)}</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      <nav className="tab-bar" aria-label="Pages">
        {PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={
              pathname === page.href ? "tab-bar-link active" : "tab-bar-link"
            }
            aria-current={pathname === page.href ? "page" : undefined}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d={page.icon} />
            </svg>
            {page.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
