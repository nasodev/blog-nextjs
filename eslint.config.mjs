import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
    {
        extends: [...nextCoreWebVitals],
    },
    {
        // ESLint 9 flat config has no automatic .eslintignore; eslint-config-next
        // only ignores .next/out/build by default, so build/content artifacts
        // that aren't real source need to be listed here explicitly.
        ignores: [
            ".next/**",
            ".contentlayer/**",
            "node_modules/**",
            "public/**",
        ],
    },
]);
