const { withContentlayer } = require("next-contentlayer");

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === "production",
    },
    experimental: {
        // Vercel 빌드 최적화
        outputFileTracingExcludes: {
            "*": [
                "node_modules/@swc/core-linux-x64-gnu",
                "node_modules/@swc/core-linux-x64-musl",
                "node_modules/@esbuild/linux-x64",
            ],
        },
    },
    // Webpack 메모리 최적화
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
            };
        }
        return config;
    },
};

module.exports = withContentlayer(nextConfig);
