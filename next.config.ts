import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    reactStrictMode: true,
    reactCompiler: true,
    poweredByHeader: false,
    agentRules: false,

    experimental: {
        // (ko)/(en) 두 루트 레이아웃 구조에서는 그룹 위쪽에 사이트 셸을 둘 수 없어,
        // 매칭되지 않는 URL 의 전역 404 가 Next 기본 셸로 렌더된다.
        // app/global-not-found.tsx 를 활성화해 헤더·푸터·lang 을 되살린다.
        globalNotFound: true,
    },

    images: {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [
            { protocol: "https", hostname: "api.funq.kr", pathname: "/blog/images/**" },
            { protocol: "http", hostname: "localhost", port: "28000", pathname: "/blog/images/**" },
        ],
    },

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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

export default nextConfig;
