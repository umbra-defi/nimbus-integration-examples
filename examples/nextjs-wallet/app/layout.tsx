import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import type { ReactElement, ReactNode } from "react";

import { AppProvider } from "../components/app-provider";
import { NavBar } from "../components/nav-bar";
import { THEME_BOOT_SCRIPT } from "../lib/theme";

import "./globals.css";

// The brand typeface, FT Aktual, is licensed for trial use only and may not be shipped, so the
// page uses Inter Tight, the free face closest to it.
const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Umbra wallet example",
  description:
    "Register, deposit, withdraw and send privately on Solana mainnet with @umbra-privacy/nimbus-solana-web.",
};

export const viewport: Viewport = {
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#0b0b0c", media: "(prefers-color-scheme: dark)" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Renders the shell every page shares: the shared state, the nav, and the page's column. */
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <AppProvider>
          <NavBar />
          <main className="page">{children}</main>
          <footer className="footer">
            An example of @umbra-privacy/nimbus-solana-web on Solana mainnet,
            with real funds.
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
