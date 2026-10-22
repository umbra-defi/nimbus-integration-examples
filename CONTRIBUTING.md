# Contributing an example

Every example answers one question: how do I use Nimbus in this kind of app? Keep each one small
enough to read in an afternoon and complete enough to run.

## Layout

```text
examples/
  <stack>-<what-it-shows>/      for example nextjs-wallet, vite-react-checkout, node-indexer
    README.md                   what it shows, how to run it, where each feature lives
    package.json                its own dependencies and scripts
    package-lock.json           committed, so CI and readers install the same versions
    .env.example                every variable it reads, with no values
    ...                         the app's own source
```

## Rules

1. **Self-contained.** An example installs `@umbra-privacy/*` packages from npm at a published
   version. It never links to another folder in this repository or to a local build of the SDK.
   Copying the folder out and running `npm install` must be enough.
2. **No secrets.** `.env.example` lists variable names with comments and no values. `.env.local`,
   `.env` and the SDK's copied files (`public/nimbus/` or your framework's equivalent) are
   gitignored.
3. **Follow the SDK documentation.** Serve the SDK's files with `nimbus-solana-web copy-assets`,
   send the two cross-origin isolation headers, and pass the gateway token as the
   [setup guide](https://sdk.nimbusprivacy.xyz/getting-started/setup) describes. If an example
   needs something the documentation doesn't say, fix the documentation too.
4. **Scripts.** `package.json` defines `typecheck` and `build`. CI runs `npm ci`, then
   `npm run typecheck`, then `npm run build`, for every folder under `examples/`.
5. **README.** Each example's README has: what it shows, what you need, how to run it, how it is
   put together (a short map of files to features), and the pre-release notice.
6. **List it.** Add a row for the new example to the table in the root [README](README.md).

## CI

[`.github/workflows/examples.yml`](.github/workflows/examples.yml) finds every `examples/*/`
folder with a `package.json` and checks it:

- on every pull request and push to `main`, with the versions in its lockfile;
- every Monday, and on demand, with the latest `@umbra-privacy/nimbus-solana-web` release, so an
  SDK release that breaks an example shows up.

Commits follow [Conventional Commits](https://www.conventionalcommits.org), scoped by example, for
example `feat(nextjs-wallet): show reserved funds`.
