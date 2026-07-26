import { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/api/posts";
import siteMetaData from "@/utils/siteMetaData";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = await getPublishedPosts();
    const postEntries = posts.map((post) => ({
        url: `${siteMetaData.siteUrl}/blogs/${post.slug}`,
        lastModified: new Date(post.updated_at),
    }));
    return [
        { url: siteMetaData.siteUrl, lastModified: new Date() },
        { url: `${siteMetaData.siteUrl}/about`, lastModified: new Date() },
        { url: `${siteMetaData.siteUrl}/contact`, lastModified: new Date() },
        { url: `${siteMetaData.siteUrl}/categories/all`, lastModified: new Date() },
        ...postEntries,
    ];
}
