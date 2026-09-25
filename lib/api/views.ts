import { API_URL } from "./posts";
import type { ApiViewCount } from "./types";

export async function incrementView(slug: string): Promise<number> {
    const res = await fetch(`${API_URL}/blog/posts/${slug}/view`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to increment view: ${res.status}`);
    const data = (await res.json()) as ApiViewCount;
    return data.total_view_count ?? data.view_count;
}
