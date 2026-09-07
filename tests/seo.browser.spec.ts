import { test, expect } from "@playwright/test";

test("localized pages expose canonical, reciprocal language links and matching social cards", async ({ page }) => {
    await page.goto("/en/blogs/test-post-0");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://blog.funq.kr/en/blogs/test-post-0");
    await expect(page.locator('link[hreflang="ko"]')).toHaveAttribute("href", "https://blog.funq.kr/blogs/test-post-0");
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(schemas.map((value) => JSON.parse(value))[0]).toMatchObject({ "@type": "BlogPosting", inLanguage: "en" });
    await page.goto("/categories/ai");
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", /AI 관련 글/);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute("href", "https://blog.funq.kr/categories/ai");
});

test("feeds and sitemap are valid XML and manifest icons exist", async ({ page, request }) => {
    await page.goto("/");
    for (const path of ["/feed.xml", "/en/feed.xml", "/sitemap.xml"]) {
        const response = await request.get(path);
        expect(response.ok()).toBe(true);
        const xml = await response.text();
        expect(await page.evaluate((source) => new DOMParser().parseFromString(source, "application/xml").querySelector("parsererror")?.textContent ?? null, xml)).toBeNull();
    }
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
});
