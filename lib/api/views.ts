import { API_URL } from "./posts";

export async function incrementView(slug: string): Promise<number> {
    const res = await fetch(`${API_URL}/blog/posts/${slug}/view`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to increment view: ${res.status}`);
    const data = (await res.json()) as { view_count: number };
    return data.view_count;
}
