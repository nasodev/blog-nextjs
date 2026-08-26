import { getPublishedPosts } from "@/lib/api/posts";
import siteMetaData from "@/utils/siteMetaData";

// llmstxt.org 형식 — AI 크롤러가 이미 /llms.txt를 요청하고 있어(서버 로그 확인) 제공한다
export async function GET() {
    const posts = await getPublishedPosts();
    const postLines = posts
        .map((post) => `- [${post.title}](${siteMetaData.siteUrl}/blogs/${post.slug}): ${post.description}`)
        .join("\n");

    const body = `# ${siteMetaData.title}

> ${siteMetaData.description}

## Posts

${postLines}

## Feeds

- [RSS](${siteMetaData.siteUrl}/feed.xml): 전체 글 RSS 피드
- [Sitemap](${siteMetaData.siteUrl}/sitemap.xml): 전체 페이지 사이트맵
`;

    return new Response(body, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "s-maxage=3600, stale-while-revalidate",
        },
    });
}
