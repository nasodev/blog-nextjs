import { ApiPostSummary } from "@/lib/api/types";
import { resolveImageUrl } from "@/lib/api/posts";

export type BlogSummary = {
    title: string;
    description: string;
    image: string;
    tags: string[];
    url: string;
    slug: string;
    publishedAt: string;
    updatedAt: string;
    readingTime: string;
    viewCount: number;
    _id: string;
};

export function toBlogSummary(post: ApiPostSummary): BlogSummary {
    return {
        title: post.title,
        description: post.description,
        image: resolveImageUrl(post.cover_image_url),
        tags: post.tags,
        url: `/blogs/${post.slug}`,
        slug: post.slug,
        publishedAt: post.published_at,
        updatedAt: post.updated_at,
        readingTime: `${post.reading_time_minutes} min read`,
        viewCount: post.view_count,
        _id: post.id,
    };
}
