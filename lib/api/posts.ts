import { ApiPostSummary, ApiPostDetail } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** 상대 경로(/blog/images/..)는 API 도메인, 그 외(/blog-cover/.., https://..)는 그대로 */
export function resolveImageUrl(url: string | null): string {
    if (!url) return "/og-image.jpg";
    if (url.startsWith("/blog/images/")) return `${API_URL}${url}`;
    return url;
}

export async function getPublishedPosts(tag?: string): Promise<ApiPostSummary[]> {
    const params = new URLSearchParams({ size: "1000" });
    if (tag) params.set("tag", tag);
    const res = await fetch(`${API_URL}/blog/posts?${params}`, {
        next: { tags: ["posts"] },
    });
    if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
    return res.json();
}

export async function getPost(slug: string): Promise<ApiPostDetail | null> {
    const res = await fetch(`${API_URL}/blog/posts/${slug}`, {
        next: { tags: [`post:${slug}`] },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch post ${slug}: ${res.status}`);
    return res.json();
}
