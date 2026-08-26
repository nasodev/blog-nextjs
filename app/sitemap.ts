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

    // lastmod는 실제 콘텐츠 변경 시점과 일치해야 구글이 신호로 신뢰한다 —
    // 목록 페이지(홈/전체 카테고리)는 가장 최근 글의 updated_at을 사용하고,
    // 정적 페이지(about/contact)는 부정확한 값 대신 생략한다.
    const latestUpdatedAt = posts.reduce<Date | undefined>((max, post) => {
        const updatedAt = new Date(post.updated_at);
        return !max || updatedAt > max ? updatedAt : max;
    }, undefined);

    return [
        { url: siteMetaData.siteUrl, lastModified: latestUpdatedAt },
        { url: `${siteMetaData.siteUrl}/about` },
        { url: `${siteMetaData.siteUrl}/contact` },
        { url: `${siteMetaData.siteUrl}/categories/all`, lastModified: latestUpdatedAt },
        ...categoryEntries,
        ...postEntries,
    ];
}
