import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : 2,
    reporter: "html",
    use: {
        baseURL: "http://127.0.0.1:23002",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "unit", testIgnore: /\.browser\.spec\.tsx?$/ },
        { name: "chromium", testMatch: /\.browser\.spec\.tsx?$/, use: { ...devices["Desktop Chrome"] } },
    ],
    webServer: process.env.BLOG_E2E ? [
        { command: "node tests/mock-api.mjs", url: "http://127.0.0.1:28001/blog/posts", timeout: 30000 },
        {
            command: "npm run dev -- --hostname 127.0.0.1 --port 23002",
            url: "http://127.0.0.1:23002",
            timeout: 120000,
            env: {
                NEXT_PUBLIC_API_URL: "http://127.0.0.1:28001",
                NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
                NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-blog.firebaseapp.com",
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-blog",
                NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:test",
                REVALIDATE_SECRET: "local-test-webhook",
                NEXT_TELEMETRY_DISABLED: "1",
            },
        },
    ] : undefined,
});
