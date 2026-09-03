import type { NextConfig } from "next";
import path from "node:path";

/** En Netlify el runtime OpenNext empaqueta el servidor; standalone queda para Docker. */
const isNetlify = process.env.NETLIFY === "true";

const nextConfig: NextConfig = {
  ...(isNetlify
    ? {}
    : {
        output: "standalone" as const,
        outputFileTracingRoot: path.join(__dirname),
      }),
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
