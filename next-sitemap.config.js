module.exports = {
    siteUrl: "https://blog.funq.kr",
    generateRobotsTxt: true,
    exclude: ["/manifest.webmanifest", "/feed.xml"],
    transform: async (config, path) => {
        // 메인 페이지
        if (path === "/") {
            return { loc: path, changefreq: "daily", priority: 1.0, lastmod: new Date().toISOString() };
        }
        // 블로그 글
        if (path.startsWith("/blogs/")) {
            return { loc: path, changefreq: "weekly", priority: 0.8, lastmod: new Date().toISOString() };
        }
        // 카테고리 (페이지네이션 제외)
        if (path.startsWith("/categories/")) {
            const slug = path.replace("/categories/", "");
            if (/-\d+$/.test(slug)) return null; // claude-code-1, ai-2 등 페이지네이션 제외
            return { loc: path, changefreq: "weekly", priority: 0.5, lastmod: new Date().toISOString() };
        }
        // about, contact 등
        return { loc: path, changefreq: "monthly", priority: 0.6, lastmod: new Date().toISOString() };
    },
};
