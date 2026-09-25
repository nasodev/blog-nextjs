import { createServer } from "node:http";

const posts = Array.from({ length: 12 }, (_, index) => ({
    id: String(index), slug: `test-post-${index}`, title: `테스트 가이드 ${index}`,
    description: "AI와 개발을 위한 테스트 글입니다.", author: "funqdev", cover_image_url: null,
    tags: index === 0 ? ["AI", "Next.js", "리서치", "개발도구"] : ["AI", "Next.js"], reading_time_minutes: 2, view_count: 12,
    published_at: `2026-09-${String(index + 1).padStart(2, "0")}T09:00:00+09:00`,
    updated_at: "2026-09-15T09:00:00+09:00", is_published: true,
    content_html: '<h2 id="intro">테스트 본문</h2><p>AI와 개발에 대한 가이드입니다.</p><pre><code>' + "long-code-line-".repeat(30) + '</code></pre>',
    toc: [{ level: "two", text: "테스트 본문", slug: "intro" }],
}));
posts.push({ ...posts[0], id: "en", slug: "en-test-post-0", title: "English test guide", description: "An English guide to AI.", view_count: 7, content_html: '<h2 id="intro">English content</h2>', toc: [{ level: "two", text: "English content", slug: "intro" }] });
for (const post of posts) {
    const source = post.slug.replace(/^en-/, "");
    post.total_view_count = posts
        .filter((item) => item.slug === source || item.slug === `en-${source}`)
        .reduce((total, item) => total + item.view_count, 0);
}

const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    const send = (status, body) => { response.writeHead(status); response.end(JSON.stringify(body)); };
    if (request.method === "OPTIONS") return send(200, {});
    if (path === "/blog/posts") return send(200, posts);
    if (path.endsWith("/comments")) return send(200, { items: [], next_cursor: null, total: 0 });
    if (path === "/blog/admin/posts") {
        return send(request.headers.authorization === "Bearer test-admin" ? 200 : 403, []);
    }
    const post = posts.find((item) => path === `/blog/posts/${item.slug}` || path === `/blog/posts/${item.slug}/view`);
    if (!post) return send(404, { detail: "Not found" });
    if (path.endsWith("/view")) return send(200, { view_count: post.view_count + 1, total_view_count: post.total_view_count + 1 });
    return send(200, post);
});
server.listen(28001, "127.0.0.1");
