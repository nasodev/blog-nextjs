import { withContentlayer } from "next-contentlayer2";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    reactStrictMode: true,
    reactCompiler: true,

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
                ],
            },
        ];
    },

    compiler: {
        removeConsole: process.env.NODE_ENV === "production",
    },

    outputFileTracingExcludes: {
        "*": [
            "node_modules/@swc/core-linux-x64-gnu",
            "node_modules/@swc/core-linux-x64-musl",
            "node_modules/@esbuild/linux-x64",
        ],
    },

    turbopack: {
        resolveAlias: {
            // Client-side fs fallback equivalent: handled by Turbopack defaults.
            // If a browser build error appears about Node's "fs", add an alias here.
        },
    },
};

export default withContentlayer(nextConfig);
