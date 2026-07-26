import { MetadataRoute } from "next";
import { slug } from "github-slugger";
import { getPublishedPosts } from "@/lib/api/posts";
import siteMetaData from "@/utils/siteMetaData";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = await getPublishedPosts();
    const postEntries = posts.map((post) => ({
        url: `${siteMetaData.siteUrl}/blogs/${post.slug}`,
        lastModified: new Date(post.updated_at),
    }));

    // 카테고리(태그) 항목: 태그를 slug 기준으로 유일화하고, 해당 태그를 가진
    // 글들의 updated_at 중 최신값을 lastModified로 사용 (app/categories/[slug]와 동일한 slug() 사용)
    const categoryLastModified = new Map<string, Date>();
    posts.forEach((post) => {
        post.tags?.forEach((tag) => {
            const categorySlug = slug(tag);
            const updatedAt = new Date(post.updated_at);
            const current = categoryLastModified.get(categorySlug);
            if (!current || updatedAt > current) {
                categoryLastModified.set(categorySlug, updatedAt);
            }
        });
    });
    const categoryEntries = Array.from(categoryLastModified, ([categorySlug, lastModified]) => ({
        url: `${siteMetaData.siteUrl}/categories/${categorySlug}`,
        lastModified,
    }));

    return [
        { url: siteMetaData.siteUrl, lastModified: new Date() },
        { url: `${siteMetaData.siteUrl}/about`, lastModified: new Date() },
        { url: `${siteMetaData.siteUrl}/contact`, lastModified: new Date() },
        { url: `${siteMetaData.siteUrl}/categories/all`, lastModified: new Date() },
        ...categoryEntries,
        ...postEntries,
    ];
}
