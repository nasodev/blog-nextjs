"use client";

import { getIdToken } from "@/lib/firebase";
import { API_URL } from "./posts";
import { ApiPostSummary, ApiPostDetail } from "./types";

export interface PostPayload {
    slug?: string;
    title?: string;
    description?: string;
    content_html?: string;
    author?: string;
    cover_image_url?: string | null;
    tags?: string[];
    is_published?: boolean;
    published_at?: string;
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getIdToken();
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        const detail = await res.json().then((b) => b.detail).catch(() => res.statusText);
        throw new Error(`${res.status}: ${detail}`);
    }
    return res;
}

const json = (data: unknown): RequestInit => ({
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
});

export const listAllPosts = (): Promise<ApiPostSummary[]> =>
    adminFetch("/blog/admin/posts").then((r) => r.json());

export const getPostForEdit = (slug: string): Promise<ApiPostDetail> =>
    adminFetch(`/blog/admin/posts/${slug}`).then((r) => r.json());  // 비발행 글 포함 (관리자 상세)

export const createPost = (data: PostPayload): Promise<ApiPostDetail> =>
    adminFetch("/blog/posts", { method: "POST", ...json(data) }).then((r) => r.json());

export const updatePost = (slug: string, data: PostPayload): Promise<ApiPostDetail> =>
    adminFetch(`/blog/posts/${slug}`, { method: "PUT", ...json(data) }).then((r) => r.json());

export const deletePost = (slug: string): Promise<void> =>
    adminFetch(`/blog/posts/${slug}`, { method: "DELETE" }).then(() => undefined);

export const uploadImage = async (file: File): Promise<{ url: string; filename: string }> => {
    const form = new FormData();
    form.append("file", file);
    return adminFetch("/blog/images", { method: "POST", body: form }).then((r) => r.json());
};

export const requestRevalidate = async (slug: string): Promise<void> => {
    await fetch("/api/revalidate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": process.env.NEXT_PUBLIC_REVALIDATE_SECRET ?? "",
        },
        body: JSON.stringify({ slug }),
    });
};
