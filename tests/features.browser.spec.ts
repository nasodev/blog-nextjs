import { test, expect } from "@playwright/test";

test("article links can be copied with a usable fallback when clipboard access fails", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/blogs/test-post-0");
    await page.getByRole("button", { name: "글 링크 복사" }).click();
    await expect(page.getByRole("status")).toContainText("링크를 복사했습니다");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://blog.funq.kr/blogs/test-post-0");
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("denied"); }; });
    await page.getByRole("button", { name: "글 링크 복사" }).click();
    await expect(page.getByRole("textbox", { name: "글 주소" })).toHaveValue("https://blog.funq.kr/blogs/test-post-0");
});

test("contact has native validation, an honest compose action and visible RSS subscriptions", async ({ page }, testInfo) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "이메일 앱에서 작성" }).click();
    await expect(page.getByRole("textbox", { name: "이름", exact: false })).toBeFocused();
    await expect(page.getByRole("link", { name: "funqdev@gmail.com" })).toHaveAttribute("href", "mailto:funqdev@gmail.com");
    await expect(page.getByRole("link", { name: "한국어 RSS" })).toHaveAttribute("href", "/feed.xml");
    await expect(page.getByRole("link", { name: "English RSS" })).toHaveAttribute("href", "/en/feed.xml");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("contact-mobile.png"), fullPage: true });
});
