/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // The prover's WASM shares memory between threads, which browsers allow only on a page that is
  // cross-origin isolated.
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      ],
    },
  ],
};

export default config;
