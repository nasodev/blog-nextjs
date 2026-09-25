import { test, expect } from "@playwright/test";
import { signInCommentTestUser, switchCommentTestUser } from "./comment-auth";

test("administrators can moderate guest comments and follow the published English variant", async ({ page }) => {
    const token = await signInCommentTestUser(page, "comment-admin");
    let deleted = false;
    const comment = {
        id: "00000000-0000-4000-8000-000000000002", thread_slug: "test-post-0", post_slug: "en-test-post-0", parent_id: null,
        author_type: "guest", author_name: "방문자", content: "관리할 댓글", created_at: "2026-09-26T00:00:00Z", updated_at: "2026-09-26T00:00:00Z",
        is_deleted: false, can_edit: false, can_delete: true, source_url: null,
    };
    await page.route("**/blog/admin/comments**", (route) => {
        expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
        if (route.request().method() === "DELETE") { deleted = true; return route.fulfill({ status: 204 }); }
        return route.fulfill({ json: { items: deleted ? [] : [comment], next_cursor: null, total: deleted ? 0 : 1 } });
    });
    await page.goto("/admin/comments");
    await expect(page.getByRole("heading", { name: "댓글 관리" })).toBeVisible();
    await expect(page.getByText("관리할 댓글", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "글 보기" })).toHaveAttribute("href", "/en/blogs/test-post-0#comments");
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText("관리할 댓글", { exact: true })).toHaveCount(0);
    expect(deleted).toBe(true);
});

test("changing admin accounts clears the previous account's moderation data", async ({ page }) => {
    const adminToken = await signInCommentTestUser(page, "comment-admin");
    await page.route("**/blog/admin/comments**", (route) => {
        if (route.request().headers().authorization !== `Bearer ${adminToken}`) return route.fulfill({ status: 403, json: { detail: "Admin required" } });
        return route.fulfill({ json: { items: [{
            id: "00000000-0000-4000-8000-000000000017", thread_slug: "private-post", post_slug: null, parent_id: null,
            author_type: "guest", author_name: "방문자", content: "비공개 글의 관리 댓글", created_at: "2026-09-26T00:00:00Z", updated_at: "2026-09-26T00:00:00Z",
            is_deleted: false, can_edit: false, can_delete: true, source_url: null,
        }], next_cursor: null, total: 1 } });
    });
    await page.goto("/admin/comments");
    await expect(page.getByText("비공개 글의 관리 댓글", { exact: true })).toBeVisible();
    await switchCommentTestUser(page, "not-an-admin");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("비공개 글의 관리 댓글", { exact: true })).toHaveCount(0);
});
