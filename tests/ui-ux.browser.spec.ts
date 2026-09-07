import { test, expect } from "@playwright/test";

test("search handles slow loading, focus trapping, Escape and retry", async ({ page }) => {
    let finish: (() => void) | undefined;
    await page.route("**/blog/posts?*", async (route) => {
        await new Promise<void>((resolve) => { finish = resolve; });
        await route.fulfill({ json: [{ id: "test", slug: "test-post-0", title: "테스트 가이드", description: "테스트", tags: [], cover_image_url: null, published_at: "2026-09-01", updated_at: "2026-09-01", reading_time_minutes: 1, view_count: 0 }] });
    });
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "검색", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    const input = dialog.getByRole("combobox");
    await expect(input).toBeFocused();
    await input.fill("테스트");
    await expect(dialog.getByRole("status")).toContainText("불러오는 중");
    await expect.poll(() => !!finish).toBe(true);
    finish!();
    await expect(dialog.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "검색 닫기" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await trigger.focus(); // The modal makes the underlying page inert.
    await expect(input).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.unroute("**/blog/posts?*");
    await page.reload();
    await page.route("**/blog/posts?*", (route) => route.fulfill({ status: 503, json: {} }));
    await trigger.click();
    await expect(dialog.getByRole("status")).toContainText("불러오지 못했습니다");
    await expect(dialog.getByRole("button", { name: "다시 시도" })).toBeVisible();
});

test("mobile navigation closes on selection and long code does not overflow the page", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "홈", exact: true }).click();
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute("aria-expanded", "false");
    await page.goto("/blogs/test-post-0");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.locator("html").evaluate((element) => getComputedStyle(element).scrollBehavior)).toBe("auto");
});
