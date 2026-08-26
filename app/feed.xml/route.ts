import { getPost, getPublishedPosts, resolveImageUrl } from "@/lib/api/posts";
import siteMetaData from "@/utils/siteMetaData";

const escapeCdata = (value: string) => value.replace(/]]>/g, "]]]]><![CDATA[>");

const enclosureType = (url: string) =>
    url.endsWith(".png") ? "image/png" : url.endsWith(".webp") ? "image/webp" : "image/jpeg";

export async function GET() {
    const posts = await getPublishedPosts();
    // 전문(content:encoded) 포함을 위해 상세를 병렬 조회 — post:{slug} 태그 캐시를 재사용
    const details = await Promise.all(posts.map((post) => getPost(post.slug)));
    const contentBySlug = new Map<string, string>();
    for (const detail of details) {
        if (detail) contentBySlug.set(detail.slug, detail.content_html);
    }

    const feedItems = posts
        .map((post) => {
            const pubDate = new Date(post.published_at).toUTCString();
            const link = `${siteMetaData.siteUrl}/blogs/${post.slug}`;
            const image = resolveImageUrl(post.cover_image_url);
            const absImage = (image.startsWith("http") ? image : siteMetaData.siteUrl + image).replace(/&/g, "&amp;");
            const categories = post.tags
                .map((tag) => `<category><![CDATA[${escapeCdata(tag)}]]></category>`)
                .join("");
            const contentHtml = contentBySlug.get(post.slug);
            return `
    <item>
      <title><![CDATA[${escapeCdata(post.title)}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${escapeCdata(post.description)}]]></description>
      ${categories}
      <enclosure url="${absImage}" length="0" type="${enclosureType(absImage)}"/>
      <pubDate>${pubDate}</pubDate>
      <author>${siteMetaData.email} (${post.author})</author>${
          contentHtml
              ? `
      <content:encoded><![CDATA[${escapeCdata(contentHtml)}]]></content:encoded>`
              : ""
      }
    </item>`;
        })
        .join("");

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
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
