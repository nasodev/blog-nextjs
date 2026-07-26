// backend-api app/schemas/blog.py 응답 스키마 대응
export interface ApiPostSummary {
    id: string;
    slug: string;
    title: string;
    description: string;
    author: string;
    cover_image_url: string | null;
    tags: string[];
    reading_time_minutes: number;
    view_count: number;
    published_at: string;
    updated_at: string;
}

export interface TocEntry {
    level: "two" | "three";
    text: string;
    slug: string;
}

export interface ApiPostDetail extends ApiPostSummary {
    content_html: string;
    toc: TocEntry[];
    is_published: boolean;
}
