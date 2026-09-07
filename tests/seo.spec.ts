import { test, expect } from "@playwright/test";
import { getFeed } from "../lib/feed";
import { ApiPostDetail } from "../lib/api/types";

test("RSS safely escapes XML and caps full-text requests to the newest 20 articles", async () => {
    const originalFetch = globalThis.fetch;
    const posts: ApiPostDetail[] = Array.from({ length: 24 }, (_, index) => ({
        id: String(index), slug: `guide-${index}`, title: `A & B ]]> ${index}`, description: "A < B",
        author: "Writer <team> & friends", cover_image_url: 'https://example.test/cover.webp?size=2&title="AI"',
        tags: ["AI & Code ]]>"], reading_time_minutes: 1, view_count: 0, is_published: true,
        published_at: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
        updated_at: "2026-09-01T00:00:00Z", content_html: "<p>Hello ]]> world</p>", toc: [],
    }));
    const details: string[] = [];
    globalThis.fetch = async (input) => {
        const path = new URL(String(input), "https://example.test").pathname;
        if (path === "/blog/posts") return Response.json(posts);
        const post = posts.find((item) => path === `/blog/posts/${item.slug}`);
        details.push(path);
        return post ? Response.json(post) : new Response(null, { status: 404 });
    };
    try {
        const xml = await (await getFeed("ko")).text();
        expect(details).toHaveLength(20);
        expect(details[0]).toBe("/blog/posts/guide-23");
        expect(xml.match(/<item>/g)).toHaveLength(20);
        expect(xml).toContain("Writer &lt;team&gt; &amp; friends");
        expect(xml).toContain("&amp;title=%22AI%22");
        expect(xml).toContain('type="image/webp"');
        expect(xml).toContain("]]]]><![CDATA[>");
        expect(xml).toContain("Tue, 01 Sep 2026 00:00:00 GMT");
        expect(xml).not.toContain('<enclosure');
    } finally { globalThis.fetch = originalFetch; }
});
