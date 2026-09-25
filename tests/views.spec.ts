import { test, expect } from "@playwright/test";
import { incrementView } from "../lib/api/views";
import type { ApiPostSummary } from "../lib/api/types";
import { toBlogSummary } from "../utils/blogData";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

for (const { slug, raw } of [
    { slug: "coding-guide", raw: 42 },
    { slug: "en-coding-guide", raw: 8 },
]) {
    test(`a visit to ${slug} displays the API total with a single POST`, async () => {
        const requests: { path: string; method: string }[] = [];
        globalThis.fetch = async (input, init) => {
            requests.push({ path: new URL(String(input), "https://example.test").pathname, method: init?.method ?? "GET" });
            return Response.json(init?.method === "POST" ? { view_count: raw, total_view_count: 49 } : []);
        };

        expect(await incrementView(slug)).toBe(49);
        expect(requests).toEqual([{ path: `/blog/posts/${slug}/view`, method: "POST" }]);
    });
}

for (const { counts, expected, name } of [
    { counts: { view_count: 7 }, expected: 7, name: "legacy response" },
    { counts: { view_count: 7, total_view_count: 0 }, expected: 0, name: "zero total" },
]) {
    test(`view updates honor ${name} without another request`, async () => {
        let requests = 0;
        globalThis.fetch = async (_input, init) => {
            requests++;
            return Response.json(init?.method === "POST" ? counts : []);
        };
        expect(await incrementView("coding-guide")).toBe(expected);
        expect(requests).toBe(1);
    });
}

test("initial blog summaries display the API total and support older cached responses", () => {
    const post: ApiPostSummary = {
        id: "guide", slug: "guide", title: "A guide", description: "A post", author: "funqdev",
        cover_image_url: null, tags: ["AI"], reading_time_minutes: 2, view_count: 100,
        published_at: "2026-09-01T09:00:00+09:00", updated_at: "2026-09-01T09:00:00+09:00",
    };
    expect(toBlogSummary({ ...post, total_view_count: 120 }).viewCount).toBe(120);
    expect(toBlogSummary({ ...post, total_view_count: 0 }).viewCount).toBe(0);
    expect(toBlogSummary(post).viewCount).toBe(100);
});

test("a failed increment is reported without reading or incrementing the translation", async () => {
    const requests: string[] = [];
    globalThis.fetch = async (input) => {
        requests.push(new URL(String(input), "https://example.test").pathname);
        return new Response(null, { status: 404 });
    };

    await expect(incrementView("missing-post")).rejects.toThrow("404");
    expect(requests).toEqual(["/blog/posts/missing-post/view"]);
});
