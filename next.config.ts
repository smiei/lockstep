import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // src/lib/data.ts reads the game data from disk at request time, with paths
  // built per game (data/games/<gameId>/...), which file tracing cannot follow.
  // The Docker image copies data/ by hand; a host that bundles each route from
  // its trace (Vercel) would ship every page without it.
  outputFileTracingIncludes: {
    "/*": ["./data/**/*"],
  },
  // Since Next 16.4 Turbopack warns about every runtime path it cannot trace.
  // These two files build theirs on purpose at runtime: imported game packs in
  // custom-games/ beside the database, and the sprite folder an import checks.
  // Neither belongs in a trace (Docker and the Windows app ship whole folders).
  turbopack: {
    ignoreIssue: [
      { path: "**/src/lib/customGames.ts", title: /file pattern|Dynamic filesystem access/ },
      { path: "**/src/lib/actions.ts", title: /file pattern|Dynamic filesystem access/ },
    ],
  },
  async headers() {
    return [
      {
        // Taken verbatim from Next's own PWA guide
        // (node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md).
        // The no-store part is not cosmetic here: /sw.js needs a Cloudflare
        // Access Bypass policy so the worker's own update check isn't answered
        // with a login redirect - and the moment Access stops marking it
        // `private`, .js is on Cloudflare's default cacheable-extension list,
        // so the edge could otherwise pin every device to a stale worker.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        // Next serves public/ with `Cache-Control: public, max-age=0`, i.e. a
        // 304 round-trip per sprite through the tunnel. This complements the
        // service worker for clients it does not control yet. Deliberately not
        // `immutable`: download-sprites.mjs may legitimately replace a file.
        source: "/pokemon-sprites/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      {
        source: "/ball-sprites/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ];
  },
};

export default nextConfig;
