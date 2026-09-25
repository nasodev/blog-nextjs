import { API_URL } from "./posts";

export interface ApiComment {
    id: string;
    thread_slug: string;
    post_slug: string | null;
    parent_id: string | null;
    author_type: "google" | "guest" | "github";
    author_name: string;
    content: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    can_edit: boolean;
    can_delete: boolean;
    source_url: string | null;
}

export interface CommentPage {
    items: ApiComment[];
    next_cursor: string | null;
    total: number;
}

export interface CommentCreate {
    author_type: "google" | "guest";
    content: string;
    parent_id?: string | null;
    guest_name?: string;
    password?: string;
}

export class CommentApiError extends Error {
    constructor(public status: number, public retryAfter: number | null = null) {
        super(`Comment request failed: ${status}`);
        this.name = "CommentApiError";
    }
}

async function commentFetch<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store", redirect: "error" });
    if (!response.ok) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        throw new CommentApiError(response.status, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
    }
    return response.status === 204 ? undefined as T : response.json();
}

const postComments = (slug: string) => `/blog/posts/${encodeURIComponent(slug)}/comments`;
const jsonBody = (body: unknown): RequestInit => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function pageQuery(cursor?: string | null) {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);
    return params.toString();
}

export function listComments(slug: string, options: { token?: string | null; cursor?: string | null } = {}) {
    return commentFetch<CommentPage>(`${postComments(slug)}?${pageQuery(options.cursor)}`, {}, options.token);
}

export function createComment(slug: string, data: CommentCreate, token?: string | null) {
    return commentFetch<ApiComment>(postComments(slug), { method: "POST", ...jsonBody(data) }, token);
}

export function getComment(slug: string, id: string, token?: string | null) {
    return commentFetch<ApiComment>(`${postComments(slug)}/${encodeURIComponent(id)}`, {}, token);
}

export function updateComment(slug: string, id: string, data: { content: string; password?: string }, token?: string | null) {
    return commentFetch<ApiComment>(`${postComments(slug)}/${encodeURIComponent(id)}`, { method: "PATCH", ...jsonBody(data) }, token);
}

export function deleteComment(slug: string, id: string, data: { password?: string } = {}, token?: string | null) {
    return commentFetch<void>(`${postComments(slug)}/${encodeURIComponent(id)}`, { method: "DELETE", ...jsonBody(data) }, token);
}

export function listAdminComments(token: string, cursor?: string | null) {
    return commentFetch<CommentPage>(`/blog/admin/comments?${pageQuery(cursor)}`, {}, token);
}

export function deleteAdminComment(id: string, token: string) {
    return commentFetch<void>(`/blog/admin/comments/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
}
