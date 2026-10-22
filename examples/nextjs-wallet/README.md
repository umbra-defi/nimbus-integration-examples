# Next.js wallet

A private wallet on Solana mainnet, built with Next.js and
[`@umbra-privacy/nimbus-solana-web`](https://www.npmjs.com/package/@umbra-privacy/nimbus-solana-web).
A user connects the wallet they already have, opens a private account with one signature, and
then deposits, pays other users privately and withdraws.

> Pre-release (0.x): every API, type and behaviour of the SDK is subject to change at any time, as
> and when the Nimbus Privacy team (built by Umbra Privacy) decides or requires.

## What it shows

- **Connect** a Wallet Standard wallet, and choose how long the sign-in is remembered.
- **Register** the account, once, before the first deposit.
- **Deposit** from the wallet into the private balance.
- **Private Send** to another registered user, sent by the relayer.
- **Withdraw** to any Solana address, sent by the relayer.
- **Balances** per token, split into available, pending and reserved.
- **Reserved funds**, with a button that releases a stopped payment's funds.
- **History** of deposits, Private Sends and withdrawals.
- **Recovery** of a deposit Solana had not settled, and refunds.
- **Progress** for every step of a payment, and plain messages for every error.

## What you need

- **Node.js 20.9 or later.**
- **A Solana wallet extension** that supports the Wallet Standard, holding a little SOL for network
  fees and the token you want to deposit.
- **A mainnet gateway token.** To get one, email [dev@umbraprivacy.com](mailto:dev@umbraprivacy.com)
  or reach out to any Umbra team member.
- **A Solana RPC endpoint.** The public `api.mainnet-beta.solana.com` refuses most requests from
  browsers.

## Run it

```sh
cp .env.example .env.local   # set NEXT_PUBLIC_NIMBUS_RPC and NEXT_PUBLIC_NIMBUS_GATEWAY_TOKEN
npm install
npm run dev                  # http://localhost:3000
```

`npm install` also runs `nimbus-solana-web copy-assets public/nimbus`, which copies the SDK's
WebAssembly and prover worker into `public/nimbus/`. Next.js writes `NEXT_PUBLIC_*` values into the
page when it builds, so restart `npm run dev`, or build again, after you change `.env.local`.

For a production build:

```sh
npm run build
npm start
```

> This app runs on Solana mainnet and moves real funds. Start with small amounts.

## How it is put together

| Concern | Where |
| --- | --- |
| The two cross-origin isolation headers the prover needs | [`next.config.mjs`](next.config.mjs) |
| Loading the SDK with `assetsBaseUrl` and your RPC | [`lib/nimbus/load.ts`](lib/nimbus/load.ts) |
| Reading the environment variables | [`lib/nimbus/settings.ts`](lib/nimbus/settings.ts) |
| Connecting a wallet | [`components/connect-card.tsx`](components/connect-card.tsx) |
| Opening and closing the private account | [`lib/nimbus/session.ts`](lib/nimbus/session.ts) |
| Registration | [`lib/nimbus/register.ts`](lib/nimbus/register.ts), [`components/register-card.tsx`](components/register-card.tsx) |
| Deposit | [`lib/nimbus/deposit.ts`](lib/nimbus/deposit.ts) |
| Private Send | [`lib/nimbus/private-send.ts`](lib/nimbus/private-send.ts) |
| Withdraw | [`lib/nimbus/withdraw.ts`](lib/nimbus/withdraw.ts) |
| Results of a Private Send or withdrawal | [`lib/nimbus/spend.ts`](lib/nimbus/spend.ts) |
| Syncing and balances | [`lib/nimbus/account.ts`](lib/nimbus/account.ts), [`components/balances-panel.tsx`](components/balances-panel.tsx) |
| History | [`lib/nimbus/history.ts`](lib/nimbus/history.ts), [`lib/activity.ts`](lib/activity.ts), [`components/activity-list.tsx`](components/activity-list.tsx) |
| Pending deposits and refunds | [`lib/nimbus/recovery.ts`](lib/nimbus/recovery.ts), [`components/recovery-card.tsx`](components/recovery-card.tsx) |
| Progress messages | [`lib/progress.ts`](lib/progress.ts) |
| Error messages | [`lib/format.ts`](lib/format.ts) |
| Token names and logos | [`lib/token-list.json`](lib/token-list.json), [`scripts/fetch-tokens.ts`](scripts/fetch-tokens.ts) |

`npm run tokens` refreshes the token names and logos from Jupiter's token API. Pass a mint address
to add a token: `npm run tokens -- <mint>`.

## Learn more

- SDK documentation: https://sdk.nimbusprivacy.xyz
- What a payment shows on chain: https://docs.nimbusprivacy.xyz/privacy/visibility

## License

[Apache-2.0](../../LICENSE)

---

Nimbus Privacy (built by Umbra Privacy)
