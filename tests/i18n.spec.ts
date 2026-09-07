import { test, expect } from "@playwright/test";
import { getAllPublishedPosts, getPost, getPublishedPosts } from "../lib/api/posts";
import { ApiPostDetail } from "../lib/api/types";
import { getApiSlug, getPostLocale, getSourceSlug, postAlternates, postPath } from "../lib/i18n";
import { getFeed } from "../lib/feed";
import { toBlogSummary } from "../utils/blogData";
import sitemap from "../app/sitemap";
import siteMetaData from "../utils/siteMetaData";

test("published translations have separate content, URLs, feeds, and reciprocal SEO links", async () => {
    const korean: ApiPostDetail = {
        id: "ko", slug: "coding-guide", title: "한국어 가이드", description: "한국어 설명",
        author: "funqdev", cover_image_url: null, tags: ["AI"], reading_time_minutes: 2,
        view_count: 0, published_at: "2026-09-01T09:00:00", updated_at: "2026-09-02T09:00:00",
        content_html: "<h2 id='intro'>한국어 본문</h2>", toc: [{ level: "two", text: "한국어 본문", slug: "intro" }],
        is_published: true,
    };
    const english: ApiPostDetail = {
        ...korean, id: "en", slug: "en-coding-guide", title: "Coding guide", description: "An English guide",
        content_html: "<h2 id='intro'>English content</h2>", toc: [{ level: "two", text: "English content", slug: "intro" }],
    };
    const untranslated = { ...korean, id: "untranslated", slug: "korean-only", tags: ["한국어"] };
    let posts = [korean, english, untranslated];
    const originalFetch = globalThis.fetch;
    const calls: { url: string; tags?: string[] }[] = [];
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input), "https://example.test");
        calls.push({ url: url.pathname, tags: (init as { next?: { tags: string[] } })?.next?.tags });
        if (url.pathname === "/blog/posts") return Response.json(posts);
        const post = posts.find((item) => url.pathname === `/blog/posts/${item.slug}`);
        return post ? Response.json(post) : new Response(null, { status: 404 });
    };
    try {
        expect(getPostLocale(korean.slug)).toBe("ko");
        expect(getSourceSlug(english.slug)).toBe(korean.slug);
        expect(getApiSlug(korean.slug, "en")).toBe(english.slug);
        expect(postPath(korean.slug)).toBe("/blogs/coding-guide");
        expect(postPath(english.slug)).toBe("/en/blogs/coding-guide");
        expect(toBlogSummary(english)).toMatchObject({ locale: "en", url: "/en/blogs/coding-guide" });
        expect(await getAllPublishedPosts()).toHaveLength(3);
        expect((await getPublishedPosts()).map((post) => post.slug)).toEqual([korean.slug, untranslated.slug]);
        expect((await getPublishedPosts(undefined, "en")).map((post) => post.slug)).toEqual([english.slug]);
        expect((await getPost(korean.slug, "en"))?.content_html).toBe(english.content_html);
        expect(calls.at(-1)?.tags).toEqual([`post:${english.slug}`]);
        expect((await getPost(korean.slug))?.content_html).toBe(korean.content_html);
        expect(await getPost(untranslated.slug, "en")).toBeNull();
        const callCount = calls.length;
        expect(await getPost(english.slug)).toBeNull();
        expect(await getPost(english.slug, "en")).toBeNull();
        expect(await getPost("../admin/posts")).toBeNull();
        expect(calls).toHaveLength(callCount);

        const languages = {
            ko: `${siteMetaData.siteUrl}/blogs/coding-guide`,
            en: `${siteMetaData.siteUrl}/en/blogs/coding-guide`,
            "x-default": `${siteMetaData.siteUrl}/blogs/coding-guide`,
        };
        expect(postAlternates(korean, posts).languages).toEqual(languages);
        expect(postAlternates(english, posts)).toMatchObject({
            canonical: "/en/blogs/coding-guide", languages, types: { "application/rss+xml": "/en/feed.xml" },
        });
        expect(postAlternates(untranslated, posts).languages).not.toHaveProperty("en");
        const entries = await sitemap();
        expect(entries.find((entry) => entry.url === languages.en)?.alternates?.languages).toEqual(languages);
        expect(entries.some((entry) => entry.url.endsWith("/en/blogs/korean-only"))).toBe(false);
        expect(entries.some((entry) => entry.url.endsWith("/blogs/en-coding-guide"))).toBe(false);
        expect(entries.some((entry) => entry.url.endsWith("/en/categories/ai"))).toBe(true);
        expect(entries.some((entry) => entry.url.endsWith("/en/categories/한국어"))).toBe(false);
        expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
        const feed = await (await getFeed("en")).text();
        expect(feed).toContain("<language>en</language>");
        expect(feed).toContain(english.content_html);
        expect(feed).toContain(languages.en);
        expect(feed).not.toContain(korean.title);
        expect(await (await getFeed("ko")).text()).not.toContain(english.content_html);

        // An unpublished/deleted translation disappears from every discovery surface.
        posts = [korean, untranslated];
        expect(await getPost(korean.slug, "en")).toBeNull();
        expect(postAlternates(korean, posts).languages).not.toHaveProperty("en");
        expect(await getPublishedPosts(undefined, "en")).toEqual([]);
        expect((await sitemap()).some((entry) => entry.url.startsWith(`${siteMetaData.siteUrl}/en`))).toBe(false);

        globalThis.fetch = async () => new Response(null, { status: 503 });
        await expect(getPost(korean.slug, "en")).rejects.toThrow("503");
        await expect(getPublishedPosts()).rejects.toThrow("503");
    } finally {
        globalThis.fetch = originalFetch;
    }
});
