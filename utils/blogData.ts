import { ApiPostSummary } from "@/lib/api/types";
import { resolveImageUrl } from "@/lib/api/posts";
import { getPostLocale, Locale, postPath } from "@/lib/i18n";

export type BlogSummary = {
    title: string;
    description: string;
    image: string;
    tags: string[];
    url: string;
    slug: string;
    locale: Locale;
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
        url: postPath(post.slug),
        slug: post.slug,
        locale: getPostLocale(post.slug),
        publishedAt: post.published_at,
        updatedAt: post.updated_at,
        readingTime: `${post.reading_time_minutes} min read`,
        viewCount: post.view_count,
        _id: post.id,
    };
}
