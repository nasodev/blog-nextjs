import { test, expect } from "@playwright/test";
import type { ApiComment } from "../lib/api/comments";
import { signInCommentTestUser, switchCommentTestUser } from "./comment-auth";

function comment(overrides: Partial<ApiComment> = {}): ApiComment {
    return {
        id: "00000000-0000-4000-8000-000000000010", thread_slug: "test-post-0", post_slug: "test-post-0", parent_id: null,
        author_type: "guest", author_name: "이전 방문자", content: "기존 댓글입니다.",
        created_at: "2026-09-25T00:00:00Z", updated_at: "2026-09-25T00:00:00Z",
        is_deleted: false, can_edit: false, can_delete: false, source_url: null, ...overrides,
    };
}

test("visitors can write a guest comment without GitHub or Google login", async ({ page }) => {
    const comments: Record<string, unknown>[] = [];
    await page.route("**/blog/posts/test-post-0/comments**", async (route) => {
        if (route.request().method() === "POST") {
            const body = route.request().postDataJSON();
            expect(body).toMatchObject({ author_type: "guest", guest_name: "방문자", password: "comment-secret" });
            const comment = {
                id: "00000000-0000-4000-8000-000000000001", thread_slug: "test-post-0", post_slug: "test-post-0", parent_id: null,
                author_type: "guest", author_name: body.guest_name, content: body.content,
                created_at: "2026-09-26T00:00:00Z", updated_at: "2026-09-26T00:00:00Z",
                is_deleted: false, can_edit: false, can_delete: false, source_url: null,
            };
            comments.push(comment);
            return route.fulfill({ status: 201, json: comment });
        }
        return route.fulfill({ json: { items: comments, next_cursor: null, total: comments.length } });
    });
    await page.goto("/blogs/test-post-0");
    const form = page.getByRole("form", { name: "댓글 작성", exact: true });
    await form.getByRole("button", { name: "비회원", exact: true }).click();
    await form.getByLabel("닉네임", { exact: true }).fill("방문자");
    await form.getByLabel("비밀번호", { exact: true }).fill("comment-secret");
    await form.getByLabel("댓글 내용", { exact: true }).fill('<img src=x onerror="alert(1)">\n반갑습니다.');
    await form.getByRole("button", { name: "댓글 등록", exact: true }).click();
    await expect(page.getByText("반갑습니다.", { exact: false })).toBeVisible();
    await expect(page.locator(".native-comment-body img")).toHaveCount(0);
    await expect(page.locator('iframe[src*="giscus"], .giscus')).toHaveCount(0);
    await expect(form.getByLabel("댓글 내용", { exact: true })).toHaveValue("");
});

test("guest edits require a password and deleting a parent keeps its replies", async ({ page }) => {
    let root = comment();
    const reply = comment({ id: "00000000-0000-4000-8000-000000000012", parent_id: root.id, content: "남겨 둘 답글", created_at: "2026-09-26T00:00:00Z" });
    await page.route("**/blog/posts/test-post-0/comments**", async (route) => {
        const request = route.request();
        if (request.method() === "GET") return route.fulfill({ json: { items: [root, reply], next_cursor: null, total: root.is_deleted ? 1 : 2 } });
        const body = request.postDataJSON();
        if (body.password !== "correct-password") return route.fulfill({ status: 403, json: { detail: "Incorrect comment password" } });
        if (request.method() === "PATCH") {
            root = { ...root, content: body.content, updated_at: "2026-09-26T01:00:00Z" };
            return route.fulfill({ json: root });
        }
        expect(request.method()).toBe("DELETE");
        root = { ...root, content: "", author_name: "", is_deleted: true };
        return route.fulfill({ status: 204 });
    });
    await page.goto("/blogs/test-post-0");
    const article = page.locator(`#comment-${root.id}`);
    await article.getByRole("button", { name: "수정", exact: true }).click();
    const edit = article.getByRole("form", { name: "댓글 수정", exact: true });
    await edit.getByLabel("댓글 내용", { exact: true }).fill("수정된 의견");
    await edit.getByLabel("비밀번호", { exact: true }).fill("wrong-password");
    await edit.getByRole("button", { name: "수정 저장", exact: true }).click();
    await expect(edit.getByRole("alert")).toContainText("비밀번호");
    await expect(edit.getByLabel("댓글 내용", { exact: true })).toHaveValue("수정된 의견");
    await edit.getByLabel("비밀번호", { exact: true }).fill("correct-password");
    await edit.getByRole("button", { name: "수정 저장", exact: true }).click();
    await expect(article.locator(".native-comment-body")).toHaveText("수정된 의견");
    await article.getByRole("button", { name: "삭제", exact: true }).click();
    const remove = article.getByRole("form", { name: "댓글 삭제", exact: true });
    await remove.getByLabel("비밀번호", { exact: true }).fill("correct-password");
    await remove.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(article.getByText("삭제된 댓글입니다.", { exact: true })).toBeVisible();
    await expect(page.getByText("남겨 둘 답글", { exact: true })).toBeVisible();
    await expect(article.getByText("이전 방문자", { exact: true })).toHaveCount(0);
});

test("Google commenters send their token and only receive their own edit controls", async ({ page }) => {
    const token = await signInCommentTestUser(page);
    const items = [comment({ author_type: "google", author_name: "다른 사용자" })];
    await page.route("**/blog/posts/test-post-0/comments**", async (route) => {
        if (route.request().method() === "GET") return route.fulfill({ json: { items, next_cursor: null, total: items.length } });
        expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
        const body = route.request().postDataJSON();
        if (route.request().method() === "PATCH") {
            expect(body).toEqual({ content: "Google 댓글 수정" });
            items[1] = { ...items[1], content: body.content, updated_at: "2026-09-26T01:00:00Z" };
            return route.fulfill({ json: items[1] });
        }
        expect(body).toMatchObject({ author_type: "google", content: "Google로 남긴 의견" });
        expect(body).not.toHaveProperty("password");
        expect(body).not.toHaveProperty("guest_name");
        const own = comment({ id: "00000000-0000-4000-8000-000000000013", author_type: "google", author_name: "로그인 사용자", content: body.content, can_edit: true, can_delete: true });
        items.push(own);
        return route.fulfill({ status: 201, json: own });
    });
    await page.goto("/blogs/test-post-0");
    await expect(page.getByRole("button", { name: "로그아웃", exact: true })).toBeVisible();
    const form = page.getByRole("form", { name: "댓글 작성", exact: true });
    await expect(form.getByLabel("닉네임", { exact: true })).toHaveCount(0);
    await form.getByLabel("댓글 내용", { exact: true }).fill("Google로 남긴 의견");
    await form.getByRole("button", { name: "댓글 등록", exact: true }).click();
    await expect(page.locator("#comment-00000000-0000-4000-8000-000000000013").getByRole("button", { name: "수정", exact: true })).toBeVisible();
    await expect(page.locator(`#comment-${items[0].id}`).getByRole("button", { name: "수정", exact: true })).toHaveCount(0);
    const own = page.locator("#comment-00000000-0000-4000-8000-000000000013");
    await own.getByRole("button", { name: "수정", exact: true }).click();
    const edit = own.getByRole("form", { name: "댓글 수정", exact: true });
    await expect(edit.getByLabel("비밀번호", { exact: true })).toHaveCount(0);
    await edit.getByLabel("댓글 내용", { exact: true }).fill("Google 댓글 수정");
    await edit.getByRole("button", { name: "수정 저장", exact: true }).click();
    await expect(own.locator(".native-comment-body")).toHaveText("Google 댓글 수정");
});

test("reply submissions keep their parent and offer only one reply level", async ({ page }) => {
    const root = comment();
    const items = [root];
    await page.route("**/blog/posts/test-post-0/comments**", (route) => {
        if (route.request().method() === "GET") return route.fulfill({ json: { items, next_cursor: null, total: items.length } });
        const body = route.request().postDataJSON();
        expect(body).toMatchObject({ parent_id: root.id, author_type: "guest", guest_name: "답글 작성자" });
        const reply = comment({ id: "00000000-0000-4000-8000-000000000015", parent_id: root.id, author_name: body.guest_name, content: body.content, created_at: "2026-09-26T00:00:00Z" });
        items.push(reply);
        return route.fulfill({ status: 201, json: reply });
    });
    await page.goto("/blogs/test-post-0");
    await page.locator(`#comment-${root.id}`).getByRole("button", { name: "답글", exact: true }).click();
    const form = page.getByRole("form", { name: "답글 작성", exact: true });
    await form.getByLabel("닉네임", { exact: true }).fill("답글 작성자");
    await form.getByLabel("비밀번호", { exact: true }).fill("comment-secret");
    await form.getByLabel("댓글 내용", { exact: true }).fill("질문에 답합니다.");
    await form.getByRole("button", { name: "답글 등록", exact: true }).click();
    const reply = page.locator("#comment-00000000-0000-4000-8000-000000000015");
    await expect(reply.locator(".native-comment-body")).toHaveText("질문에 답합니다.");
    await expect(reply.getByRole("button", { name: "답글", exact: true })).toHaveCount(0);
});

test("a locally posted comment beyond the first page refreshes permissions after sign-in", async ({ page }) => {
    const firstPage = Array.from({ length: 20 }, (_, index) => comment({
        id: `00000000-0000-4000-8000-${String(100 + index).padStart(12, "0")}`, content: `기존 의견 ${index}`,
    }));
    let pinned: ApiComment | null = null;
    await page.route("**/blog/posts/test-post-0/comments**", (route) => {
        const request = route.request();
        if (request.method() === "POST") {
            const body = request.postDataJSON();
            pinned = comment({ id: "00000000-0000-4000-8000-000000000020", author_name: body.guest_name, content: body.content, created_at: "2026-09-26T00:00:00Z" });
            return route.fulfill({ status: 201, json: pinned });
        }
        if (pinned && new URL(request.url()).pathname.endsWith(pinned.id)) {
            return route.fulfill({ json: { ...pinned, can_delete: !!request.headers().authorization } });
        }
        return route.fulfill({ json: { items: firstPage, next_cursor: pinned ? "last-page" : null, total: pinned ? 21 : 20 } });
    });
    await page.goto("/blogs/test-post-0");
    const form = page.getByRole("form", { name: "댓글 작성", exact: true });
    await form.getByLabel("닉네임", { exact: true }).fill("방문자");
    await form.getByLabel("비밀번호", { exact: true }).fill("comment-secret");
    await form.getByLabel("댓글 내용", { exact: true }).fill("목록 뒤에 등록한 댓글");
    await form.getByRole("button", { name: "댓글 등록", exact: true }).click();
    const article = page.locator("#comment-00000000-0000-4000-8000-000000000020");
    await expect(article.locator(".native-comment-body")).toHaveText("목록 뒤에 등록한 댓글");
    await switchCommentTestUser(page, "comment-admin");
    await expect(page.getByRole("button", { name: "로그아웃", exact: true })).toBeVisible();
    await article.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(article.getByRole("form", { name: "댓글 삭제", exact: true }).getByLabel("비밀번호", { exact: true })).toHaveCount(0);
});

test("failed submissions retain the draft and suppress duplicate in-flight writes", async ({ page }) => {
    let writes = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/blog/posts/test-post-0/comments**", async (route) => {
        if (route.request().method() === "GET") return route.fulfill({ json: { items: [], next_cursor: null, total: 0 } });
        writes++;
        await pending;
        return route.fulfill({ status: 503, json: { detail: "Unavailable" } });
    });
    try {
        await page.goto("/blogs/test-post-0");
        const form = page.getByRole("form", { name: "댓글 작성", exact: true });
        await form.getByLabel("닉네임", { exact: true }).fill("방문자");
        await form.getByLabel("비밀번호", { exact: true }).fill("comment-secret");
        await form.getByLabel("댓글 내용", { exact: true }).fill("사라지면 안 되는 초안");
        await form.getByRole("button", { name: "댓글 등록", exact: true }).click();
        await expect(form.getByRole("button", { name: "처리 중…", exact: true })).toBeDisabled();
        release();
        await expect(form.getByRole("alert")).toBeVisible();
        await expect(form.getByLabel("댓글 내용", { exact: true })).toHaveValue("사라지면 안 되는 초안");
        expect(writes).toBe(1);
    } finally { release(); }
});

test("English comments paginate and remain readable on a narrow dark screen", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    const root = comment({ author_name: "n".repeat(40), content: "unbroken".repeat(100), post_slug: "en-test-post-0" });
    const reply = comment({ id: "00000000-0000-4000-8000-000000000014", parent_id: root.id, content: "A shared reply", post_slug: "en-test-post-0" });
    await page.route("**/blog/posts/en-test-post-0/comments**", (route) => {
        const more = new URL(route.request().url()).searchParams.has("cursor");
        return route.fulfill({ json: { items: more ? [reply] : [root], next_cursor: more ? null : "next-page", total: 2 } });
    });
    await page.goto("/en/blogs/test-post-0");
    await expect(page.getByText("Korean and English pages share this conversation.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Load more comments", exact: true }).click();
    await expect(page.getByText("A shared reply", { exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        overflowing: [...document.querySelectorAll("#comments *")].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).map((element) => ({ tag: element.tagName, text: element.textContent?.slice(0, 50), right: element.getBoundingClientRect().right })) }));
    expect(dimensions.scroll, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width);
    await page.locator("#comments").screenshot({ path: testInfo.outputPath("comments-mobile-dark.png") });
});

test("posting while the initial list is slow does not hide the existing conversation", async ({ page }) => {
    const comments = [comment()];
    let releaseInitial!: () => void;
    const pendingInitial = new Promise<void>((resolve) => { releaseInitial = resolve; });
    let posted = false;
    await page.route("**/blog/posts/test-post-0/comments**", async (route) => {
        if (route.request().method() === "POST") {
            const body = route.request().postDataJSON();
            const added = comment({ id: "00000000-0000-4000-8000-000000000011", author_name: body.guest_name, content: body.content, created_at: "2026-09-26T00:00:00Z" });
            comments.push(added);
            posted = true;
            return route.fulfill({ status: 201, json: added });
        }
        if (!posted) await pendingInitial;
        return route.fulfill({ json: { items: comments, next_cursor: null, total: comments.length } });
    });
    try {
        await page.goto("/blogs/test-post-0");
        const form = page.getByRole("form", { name: "댓글 작성", exact: true });
        await form.getByLabel("닉네임", { exact: true }).fill("방문자");
        await form.getByLabel("비밀번호", { exact: true }).fill("comment-secret");
        await form.getByLabel("댓글 내용", { exact: true }).fill("새 의견입니다.");
        await form.getByRole("button", { name: "댓글 등록", exact: true }).click();
        await expect(page.locator(".native-comment-body").getByText("새 의견입니다.", { exact: true })).toBeVisible();
        releaseInitial();
        await expect(page.getByText("기존 댓글입니다.", { exact: true })).toBeVisible();
    } finally { releaseInitial(); }
});

test("Google sign-in preserves an in-progress reply and its parent", async ({ page }) => {
    const root = comment();
    await page.route("**/blog/posts/test-post-0/comments**", (route) => route.fulfill({ json: { items: [root], next_cursor: null, total: 1 } }));
    await page.goto("/blogs/test-post-0");
    await page.locator(`#comment-${root.id}`).getByRole("button", { name: "답글", exact: true }).click();
    const form = page.getByRole("form", { name: "답글 작성", exact: true });
    await form.getByRole("button", { name: "Google 계정", exact: true }).click();
    await form.getByLabel("댓글 내용", { exact: true }).fill("로그인해도 남아야 할 답글");
    await switchCommentTestUser(page, "reply-reader");
    await expect(page.getByRole("button", { name: "로그아웃", exact: true })).toBeVisible();
    await expect(form).toBeVisible();
    await expect(form.getByLabel("댓글 내용", { exact: true })).toHaveValue("로그인해도 남아야 할 답글");
    await expect(page.locator(`#comment-${root.id}`).getByRole("form", { name: "답글 작성", exact: true })).toBeVisible();
});

test("a delayed previous-account mutation cannot grant the next viewer edit permissions", async ({ page }) => {
    const tokenA = await signInCommentTestUser(page, "viewer-a");
    const added = comment({ id: "00000000-0000-4000-8000-000000000016", author_type: "google", author_name: "이전 계정", content: "늦게 도착한 댓글" });
    let committed = false;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let tokenB = "";
    let readsByB = 0;
    await page.route("**/blog/posts/test-post-0/comments**", async (route) => {
        const request = route.request();
        if (request.method() === "GET") {
            if (request.headers().authorization === `Bearer ${tokenB}`) readsByB++;
            return route.fulfill({ json: { items: committed ? [added] : [], next_cursor: null, total: committed ? 1 : 0 } });
        }
        expect(request.headers().authorization).toBe(`Bearer ${tokenA}`);
        committed = true;
        await pending;
        return route.fulfill({ status: 201, json: { ...added, can_edit: true, can_delete: true } });
    });
    try {
        await page.goto("/blogs/test-post-0");
        await expect(page.getByRole("button", { name: "로그아웃", exact: true })).toBeVisible();
        const form = page.getByRole("form", { name: "댓글 작성", exact: true });
        await form.getByLabel("댓글 내용", { exact: true }).fill(added.content);
        await form.getByRole("button", { name: "댓글 등록", exact: true }).click();
        await expect.poll(() => committed).toBe(true);
        tokenB = await switchCommentTestUser(page, "viewer-b");
        await expect.poll(() => readsByB).toBeGreaterThan(0);
        const article = page.locator(`#comment-${added.id}`);
        await expect(article.locator(".native-comment-body")).toHaveText(added.content);
        release();
        await expect(form.getByLabel("댓글 내용", { exact: true })).toHaveValue("");
        await expect(article.getByRole("button", { name: "수정", exact: true })).toHaveCount(0);
        await expect(article.getByRole("button", { name: "삭제", exact: true })).toHaveCount(0);
    } finally { release(); }
});
