import { allBlogs } from "contentlayer/generated";
import siteMetaData from "@/utils/siteMetaData";

export async function GET() {
    const blogs = allBlogs
        .filter((blog) => blog.isPublished)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const feedItems = blogs
        .map((blog) => {
            const pubDate = new Date(blog.publishedAt).toUTCString();
            return `
    <item>
      <title><![CDATA[${blog.title}]]></title>
      <link>${siteMetaData.siteUrl}${blog.url}</link>
      <guid isPermaLink="true">${siteMetaData.siteUrl}${blog.url}</guid>
      <description><![CDATA[${blog.description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${siteMetaData.email} (${blog.author})</author>
    </item>`;
        })
        .join("");

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteMetaData.title}</title>
    <link>${siteMetaData.siteUrl}</link>
    <description>${siteMetaData.description}</description>
    <language>${siteMetaData.language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteMetaData.siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${feedItems}
  </channel>
</rss>`;

    return new Response(feed, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "s-maxage=3600, stale-while-revalidate",
        },
    });
}
