import { getPost, getPublishedPosts, resolveImageUrl } from "@/lib/api/posts";
import siteMetaData from "@/utils/siteMetaData";
import { feedPath, getSourceSlug, Locale, localePath, postPath } from "@/lib/i18n";

const escapeXml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[character]!);

const escapeCdata = (value: string) => value.replace(/]]>/g, "]]]]><![CDATA[>");

const imageType = (url: string) => {
    const extension = new URL(url).pathname.split(".").pop()?.toLowerCase();
    return ({ png: "image/png", webp: "image/webp", avif: "image/avif", gif: "image/gif" } as Record<string, string>)[extension ?? ""] ?? "image/jpeg";
};

export async function getFeed(locale: Locale) {
    // ponytail: latest 20 full articles bound cold-cache fan-out; older posts stay in the sitemap.
    const posts = (await getPublishedPosts(undefined, locale))
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()).slice(0, 20);
    const lastModified = posts.reduce((latest, post) => Math.max(latest, new Date(post.updated_at).getTime()), 0);
    // 전문(content:encoded) 포함을 위해 상세를 병렬 조회 — post:{slug} 태그 캐시를 재사용
    const details = await Promise.all(posts.map((post) => getPost(getSourceSlug(post.slug), locale)));
    const contentBySlug = new Map<string, string>();
    for (const detail of details) {
        if (detail) contentBySlug.set(detail.slug, detail.content_html);
    }

    const feedItems = posts
        .map((post) => {
            const pubDate = new Date(post.published_at).toUTCString();
            const link = siteMetaData.siteUrl + postPath(post.slug);
            const image = resolveImageUrl(post.cover_image_url);
            const absImage = new URL(image, siteMetaData.siteUrl).href;
            const categories = post.tags
                .map((tag) => `<category><![CDATA[${escapeCdata(tag)}]]></category>`)
                .join("");
            const contentHtml = contentBySlug.get(post.slug);
            return `
    <item>
      <title><![CDATA[${escapeCdata(post.title)}]]></title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description><![CDATA[${escapeCdata(post.description)}]]></description>
      ${categories}
      <media:content url="${escapeXml(absImage)}" medium="image" type="${imageType(absImage)}"/>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(`${siteMetaData.email} (${post.author})`)}</author>${
          contentHtml
              ? `
      <content:encoded><![CDATA[${escapeCdata(contentHtml)}]]></content:encoded>`
              : ""
      }
    </item>`;
        })
        .join("");

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(siteMetaData.title)}</title>
    <link>${escapeXml(siteMetaData.siteUrl + localePath("/", locale))}</link>
    <description>${escapeXml(locale === "en" ? siteMetaData.descriptionEn : siteMetaData.description)}</description>
    <language>${locale}</language>
    ${lastModified ? `<lastBuildDate>${new Date(lastModified).toUTCString()}</lastBuildDate>` : ""}
    <atom:link href="${escapeXml(siteMetaData.siteUrl + feedPath(locale))}" rel="self" type="application/rss+xml"/>
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
