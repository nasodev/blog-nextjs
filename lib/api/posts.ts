import { ApiPostSummary, ApiPostDetail } from "./types";
import { getApiSlug, getPostLocale, Locale } from "@/lib/i18n";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** 상대 경로(/blog/images/..)는 API 도메인, 그 외(/blog-cover/.., https://..)는 그대로 */
export function resolveImageUrl(url: string | null): string {
    if (!url) return "/og-image.jpg";
    if (url.startsWith("/blog/images/")) return `${API_URL}${url}`;
    return url;
}

export async function getAllPublishedPosts(tag?: string): Promise<ApiPostSummary[]> {
    const params = new URLSearchParams({ size: "1000" });
    if (tag) params.set("tag", tag);
    const res = await fetch(`${API_URL}/blog/posts?${params}`, {
        next: { tags: ["posts"] },
    });
    if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
    return res.json();
}

export async function getPublishedPosts(tag?: string, locale: Locale = "ko"): Promise<ApiPostSummary[]> {
    const posts = await getAllPublishedPosts(tag);
    return posts.filter((post) => getPostLocale(post.slug) === locale);
}

export async function getPost(slug: string, locale: Locale = "ko"): Promise<ApiPostDetail | null> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || getPostLocale(slug) === "en") return null;
    const apiSlug = getApiSlug(slug, locale);
    const res = await fetch(`${API_URL}/blog/posts/${encodeURIComponent(apiSlug)}`, {
        next: { tags: [`post:${apiSlug}`] },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch post ${slug}: ${res.status}`);
    return res.json();
}
