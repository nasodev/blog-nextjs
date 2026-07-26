// 기존 Contentlayer 파이프라인과 동일한 플러그인 체인으로 MDX 본문을 정적 HTML로 변환.
// 실행: node convert.mjs  (scripts/migration 디렉터리에서)
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";

const CONTENT_DIR = path.resolve("../../content");
const OUT_DIR = path.resolve("./out");

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)               // MDX 내 인라인 HTML 보존
    .use(rehypeSlug)              // 기존과 동일한 heading id 규칙
    .use(rehypePrettyCode, { theme: "github-dark" })
    .use(rehypeStringify);

function toCoverUrl(imagePath) {
    if (!imagePath) return null;
    // "../../public/blog-cover/xxx.jpg" → "/blog-cover/xxx.jpg"
    return imagePath.replace(/^(\.\.\/)+public/, "");
}

function toIso(value) {
    // 따옴표 없는 YAML 타임스탬프는 js-yaml이 UTC Date로 파싱 → toISOString이 원래 벽시계 시각을 보존
    if (value instanceof Date) {
        return value.toISOString().replace(/\.\d{3}Z$/, "");
    }
    // 따옴표 문자열 "2025-12-14 10:00:00" → "2025-12-14T10:00:00"
    // 주의: new Date(문자열).toISOString()은 KST를 UTC로 바꿔 -9시간 시프트됨 — 문자열 치환만 한다
    return String(value).trim().replace(" ", "T");
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const slugs = fs.readdirSync(CONTENT_DIR).filter((d) =>
    fs.existsSync(path.join(CONTENT_DIR, d, "index.mdx"))
);

let failed = [];
for (const slug of slugs) {
    try {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, slug, "index.mdx"), "utf8");
        const { data, content } = matter(raw);
        const html = String(await processor.process(content));

        fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html);
        fs.writeFileSync(
            path.join(OUT_DIR, `${slug}.json`),
            JSON.stringify(
                {
                    slug,
                    title: data.title,
                    description: data.description,
                    author: data.author ?? "fundev",
                    tags: data.tags ?? [],
                    cover_image_url: toCoverUrl(data.image),
                    is_published: data.isPublished !== false,
                    published_at: toIso(data.publishedAt),
                },
                null,
                2
            )
        );
        console.log(`OK  ${slug}`);
    } catch (e) {
        failed.push(slug);
        console.error(`FAIL ${slug}: ${e.message}`);
    }
}

console.log(`\n변환 완료: ${slugs.length - failed.length}/${slugs.length}`);
if (failed.length) {
    console.log(`실패 (blog-html 스킬로 수동 변환 필요): ${failed.join(", ")}`);
    process.exit(1);
}
