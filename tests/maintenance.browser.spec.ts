import { test, expect } from "@playwright/test";

test("all post links exist before JavaScript and missing posts return 404", async ({ request }) => {
    const response = await request.get("/");
    expect(response.ok()).toBe(true);
    const html = await response.text();
    for (let index = 0; index < 12; index++) expect(html).toContain(`href="/blogs/test-post-${index}"`);
    expect((await request.get("/blogs/missing-post")).status()).toBe(404);
});

test("theme follows the system until explicitly selected and remains usable with blocked storage", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.getByRole("button", { name: "테마 전환" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new DOMException("blocked", "SecurityError"); };
        Storage.prototype.setItem = () => { throw new DOMException("blocked", "SecurityError"); };
    });
    await page.reload();
    await page.getByRole("button", { name: "테마 전환" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
});

for (const { prefix, slug, total } of [
    { prefix: "", slug: "test-post-0", total: 49 },
    { prefix: "/en", slug: "en-test-post-0", total: 54 },
]) {
    test(`Strict Mode counts one visit and displays both languages' views (${slug})`, async ({ page }) => {
        const increments: string[] = [];
        const extraReads: string[] = [];
        await page.route("**/blog/posts?**", async (route) => {
            extraReads.push(route.request().url());
            await route.continue();
        });
        await page.route("**/blog/posts/*/view", async (route) => {
            increments.push(new URL(route.request().url()).pathname);
            await route.fulfill({ json: { view_count: 42, total_view_count: total } });
        });
        await page.goto(`${prefix}/blogs/test-post-0`);
        await expect(page.getByText(`${total} views`, { exact: true })).toBeVisible();
        expect(increments).toEqual([`/blog/posts/${slug}/view`]);
        expect(extraReads).toEqual([]);
    });
}

test.describe("server-rendered views", () => {
    test.use({ javaScriptEnabled: false });

    test("both languages show the same total before JavaScript runs", async ({ page }) => {
        for (const prefix of ["", "/en"]) {
            await page.goto(`${prefix}/blogs/test-post-0`);
            await expect(page.getByText("19 views", { exact: true })).toBeVisible();
        }
        await page.goto("/blogs/test-post-1");
        await expect(page.getByText("12 views", { exact: true })).toBeVisible();
    });
});

test("a failed view increment preserves the server-rendered combined total", async ({ page }) => {
    await page.route("**/blog/posts/*/view", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
    const refresh = page.waitForResponse((response) => response.url().endsWith("/view") && response.status() === 503);
    await page.goto("/blogs/test-post-0");
    await refresh;
    await expect(page.getByText("19 views", { exact: true })).toBeVisible();
});
