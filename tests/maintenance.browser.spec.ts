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

test("Strict Mode increments a post view once and shows the response", async ({ page }) => {
    let increments = 0;
    await page.route("**/blog/posts/test-post-0/view", async (route) => {
        increments++;
        await route.fulfill({ json: { view_count: 42 } });
    });
    await page.goto("/blogs/test-post-0");
    await expect(page.getByText("42 views", { exact: true })).toBeVisible();
    expect(increments).toBe(1);
});
