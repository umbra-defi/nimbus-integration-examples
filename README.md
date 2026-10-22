# Nimbus integration examples

Working apps that add private balances and payments to Solana with the Nimbus SDK,
[`@umbra-privacy/nimbus-solana-web`](https://www.npmjs.com/package/@umbra-privacy/nimbus-solana-web).

Each example is a complete project in its own folder. It installs the SDK from npm, so you can copy
one folder out of this repository and run it on its own.

> Pre-release (0.x): every API, type and behaviour of the SDK is subject to change at any time, as
> and when the Nimbus Privacy team (built by Umbra Privacy) decides or requires. The examples track
> the latest release.

## Examples

| Example | Stack | What it shows |
| --- | --- | --- |
| [`nextjs-wallet`](examples/nextjs-wallet) | Next.js, React | A private wallet: connect, register, deposit, Private Send, withdraw, balances, history and reserved funds |

## Run an example

You need:

- **Node.js 20.9 or later.**
- **A Solana wallet extension** that supports the Wallet Standard, such as Phantom, Solflare or
  Backpack.
- **A mainnet gateway token.** It lets your app use Nimbus's services. To get one, email
  [dev@umbraprivacy.com](mailto:dev@umbraprivacy.com) or reach out to any Umbra team member.
- **A Solana RPC endpoint.** The public `api.mainnet-beta.solana.com` refuses most requests from
  browsers, so use a provider's endpoint.

Then:

```sh
cd examples/nextjs-wallet
cp .env.example .env.local   # add your gateway token and RPC endpoint
npm install                  # also copies the SDK's WebAssembly and worker into public/nimbus
npm run dev
```

Each example's README explains what it covers and how it is put together.

> The examples run on Solana mainnet and move real funds. Start with small amounts.

## Documentation

- SDK documentation: https://sdk.nimbusprivacy.xyz
- Protocol documentation: https://docs.nimbusprivacy.xyz

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) explains how examples are laid out and how to add one.

## License

[Apache-2.0](LICENSE)

---

Nimbus Privacy (built by Umbra Privacy)
