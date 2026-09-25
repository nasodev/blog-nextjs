import { test, expect } from "@playwright/test";
import { createComment, deleteComment, listComments, updateComment } from "../lib/api/comments";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("comment requests use the requested language and preserve guest credentials only in write bodies", async () => {
    const calls: { url: URL; init?: RequestInit }[] = [];
    globalThis.fetch = async (input, init) => {
        calls.push({ url: new URL(String(input), "https://example.test"), init });
        return init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ items: [], next_cursor: null, total: 0 });
    };
    await listComments("en-guide", { cursor: "cursor + value", token: "viewer-token" });
    expect(calls[0].url.pathname).toBe("/blog/posts/en-guide/comments");
    expect(calls[0].url.searchParams.get("cursor")).toBe("cursor + value");
    expect(calls[0].init?.cache).toBe("no-store");
    expect(new Headers(calls[0].init?.headers).get("Authorization")).toBe("Bearer viewer-token");
    await createComment("guide", { author_type: "guest", guest_name: "방문자", password: "private password", content: "Hello" });
    expect(new Headers(calls[1].init?.headers).has("Authorization")).toBe(false);
    expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({ password: "private password", author_type: "guest" });
    expect(calls[1].url.href).not.toContain("password");
    await updateComment("guide", "comment-id", { content: "Edited", password: "private password" });
    expect(calls[2].init?.method).toBe("PATCH");
    await deleteComment("guide", "comment-id", { password: "private password" });
    expect(calls[3].init?.method).toBe("DELETE");
    expect(JSON.parse(String(calls[3].init?.body))).toEqual({ password: "private password" });
});

test("a throttled write reports Retry-After and never retries the mutation", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
        calls++;
        return Response.json({ detail: "Too many requests" }, { status: 429, headers: { "Retry-After": "15" } });
    };
    const error = await createComment("guide", { author_type: "google", content: "Hello" }, "token").catch((error: unknown) => error);
    expect(error).toMatchObject({ status: 429, retryAfter: 15 });
    expect(calls).toBe(1);
});
