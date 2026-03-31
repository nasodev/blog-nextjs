import { Blog } from "contentlayer/generated";

export type BlogSummary = {
    title: string;
    description: string;
    image: { filePath: string; blurhashDataUrl: string; width: number; height: number };
    tags: string[];
    url: string;
    publishedAt: string;
    updatedAt: string;
    readingTime: string;
    _id: string;
};

export function toBlogSummary(blog: Blog): BlogSummary {
    return {
        title: blog.title,
        description: blog.description,
        image: {
            filePath: blog.image.filePath,
            blurhashDataUrl: blog.image.blurhashDataUrl,
            width: blog.image.width,
            height: blog.image.height,
        },
        tags: blog.tags ?? [],
        url: blog.url,
        publishedAt: blog.publishedAt,
        updatedAt: blog.updatedAt,
        readingTime: blog.readingTime.text,
        _id: blog._id,
    };
}
