import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { revalidationAuthStatus } from "../lib/revalidation";
import { POST } from "../app/api/revalidate/route";

test("revalidation rejects public secrets, non-admin tokens, malformed JSON and oversized slugs", async () => {
    const originalFetch = globalThis.fetch;
    const oldSecret = process.env.REVALIDATE_SECRET;
    const oldPublicSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET;
    const request = (headers: HeadersInit = {}) => new Request("https://example.test/api/revalidate", { headers });
    try {
        delete process.env.REVALIDATE_SECRET;
        process.env.NEXT_PUBLIC_REVALIDATE_SECRET = "leaked-old-secret";
        expect(await revalidationAuthStatus(request())).toBe(401);
        expect(await revalidationAuthStatus(request({ "x-revalidate-secret": "leaked-old-secret" }))).toBe(401);
        process.env.REVALIDATE_SECRET = "server-only";
        expect(await revalidationAuthStatus(request({ "x-revalidate-secret": "wrong-value" }))).toBe(401);
        expect(await revalidationAuthStatus(request({ "x-revalidate-secret": "server-only" }))).toBe(200);
        for (const status of [200, 401, 403, 500]) {
            globalThis.fetch = async (url, init) => {
                expect(String(url)).toMatch(/\/blog\/admin\/posts$/);
                expect(init).toMatchObject({ cache: "no-store", redirect: "error", headers: { Authorization: "Bearer token" } });
                return new Response("[]", { status });
            };
            expect(await revalidationAuthStatus(request({ Authorization: "Bearer token" }))).toBe(status === 500 ? 503 : status);
        }
        globalThis.fetch = async () => { throw new Error("offline"); };
        expect(await revalidationAuthStatus(request({ Authorization: "Bearer token" }))).toBe(503);
        for (const body of ["{", "null", "[]", JSON.stringify({ slug: "../admin" }), JSON.stringify({ slug: "a".repeat(201) })]) {
            const response = await POST(new NextRequest("https://example.test/api/revalidate", {
                method: "POST", headers: { "x-revalidate-secret": "server-only" }, body,
            }));
            expect(response.status).toBe(400);
        }
    } finally {
        globalThis.fetch = originalFetch;
        if (oldSecret === undefined) delete process.env.REVALIDATE_SECRET;
        else process.env.REVALIDATE_SECRET = oldSecret;
        if (oldPublicSecret === undefined) delete process.env.NEXT_PUBLIC_REVALIDATE_SECRET;
        else process.env.NEXT_PUBLIC_REVALIDATE_SECRET = oldPublicSecret;
    }
});
