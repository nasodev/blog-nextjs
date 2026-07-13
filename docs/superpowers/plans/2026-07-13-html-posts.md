# HTML 포스트 지원 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `content/{slug}/index.html`(frontmatter + HTML 본문) 형식의 글을 기존 MDX 글과 동등하게 빌드·발행·표시한다.

**Architecture:** Contentlayer를 건드리지 않는 별도 빌드타임 스크립트가 HTML 글을 검증·가공(rehype 파이프라인)해 `.generated/html-posts.json`으로 생성하고, `lib/posts.ts` 통합 레이어가 MDX 글과 병합해 모든 소비처(홈/상세/카테고리/RSS/검색)에 공급한다. 상세 페이지는 body kind에 따라 RenderMdx/RenderHtml로 분기한다.

**Tech Stack:** Next.js 14.2.35 (App Router, SSG), contentlayer2 0.5.8 (무변경), unified/rehype (rehype-parse → rehype-slug → rehype-autolink-headings → rehype-pretty-code → rehype-stringify), gray-matter, sharp(imagescript 폴백), node:test, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-13-html-posts-design.md`

## Global Constraints

- Next.js 14.2.35 / React 18 / TypeScript strict. contentlayer2 0.5.8 설정(`contentlayer.config.ts`)은 **절대 수정하지 않는다**.
- 스크립트는 ESM `.mjs`, Node 20 기준 (Docker `node:20-alpine`과 로컬 동일).
- 코드 하이라이팅 테마 `"github-dark"`, autolink behavior `"append"` — `contentlayer.config.ts`의 MDX 설정과 동일한 값을 사용한다.
- 상세 페이지(`/blogs/[slug]`)는 `isPublished`를 필터하지 않는 기존 동작을 유지한다 (리스트/RSS/검색만 필터).
- 기존 MDX 글의 렌더링 결과는 바뀌지 않아야 한다. 소비처 변경은 "데이터 소스를 `lib/posts.ts`로 교체"하는 것뿐이다.
- 들여쓰기 4칸(기존 코드 스타일), 파일 경로 alias `@/*` 사용.
- 커밋 메시지는 기존 컨벤션(`feat:`, `fix:`, `docs:` + 한국어 요약)을 따르고 각 태스크 끝에 커밋한다.
- 신규 npm 패키지는 devDependencies로 추가하며, node_modules에 이미 설치된 버전과 동일한 메이저를 지정한다: gray-matter@^4.0.3, unified@^11.0.5, rehype-parse@^9.0.1, rehype-stringify@^10.0.1, unist-util-visit@^5.0.0, hast-util-to-string@^3.0.1, imagescript@^1.3.1. (rehype-slug/rehype-autolink-headings/rehype-pretty-code/reading-time/github-slugger는 이미 직접 의존성이므로 추가하지 않는다. sharp는 추가하지 않는다 — 동적 import + imagescript 폴백.)

---

### Task 1: HTML 처리 라이브러리 모듈 (`scripts/html-posts-lib.mjs`)

frontmatter 파싱·검증과 HTML 본문 가공(rehype 파이프라인, toc/readingTime 계산)을 담당하는 순수 함수 모듈. TDD로 작성한다.

**Files:**
- Create: `scripts/html-posts-lib.mjs`
- Create: `scripts/html-posts-lib.test.mjs`
- Modify: `package.json` (devDependencies + `test:unit` 스크립트)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces (Task 2가 사용):
  - `parseHtmlPost(fileContent: string) → { frontmatter: object, body: string }`
  - `validateFrontmatter(frontmatter: object, slug: string) → { title, description, image, publishedAt(ISO string), updatedAt(ISO string), author, isPublished(boolean), tags(string[]) }` — 검증 실패 시 throw
  - `processHtmlBody(rawHtml: string, slug: string) → Promise<{ html: string, toc: {level,text,slug}[], readingTime: {text,minutes,time,words} }>` — 빈 본문이면 throw

- [ ] **Step 1: 의존성 설치**

```bash
npm install -D gray-matter@^4.0.3 unified@^11.0.5 rehype-parse@^9.0.1 rehype-stringify@^10.0.1 unist-util-visit@^5.0.0 hast-util-to-string@^3.0.1 imagescript@^1.3.1
```

Expected: package.json devDependencies에 7개 패키지 추가, 버전 충돌 없이 설치 완료 (모두 이미 node_modules에 동일 메이저로 존재하는 간접 의존성이므로 다운로드 거의 없음).

- [ ] **Step 2: 실패하는 테스트 작성**

`scripts/html-posts-lib.test.mjs` 생성:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHtmlPost, validateFrontmatter, processHtmlBody } from "./html-posts-lib.mjs";

const VALID_FM = {
    title: "제목",
    description: "설명",
    image: "../../public/blog-cover/ai-model.jpg",
    publishedAt: "2026-07-13 10:00:00",
    updatedAt: "2026-07-13 10:00:00",
    author: "fundev",
};

test("parseHtmlPost: frontmatter와 본문을 분리한다", () => {
    const file = `---\ntitle: "제목"\nauthor: "fundev"\n---\n<h2>Hello</h2>`;
    const { frontmatter, body } = parseHtmlPost(file);
    assert.equal(frontmatter.title, "제목");
    assert.equal(frontmatter.author, "fundev");
    assert.equal(body.trim(), "<h2>Hello</h2>");
});

test("validateFrontmatter: 필수 필드 누락 시 slug와 필드명을 포함해 throw", () => {
    const fm = { ...VALID_FM };
    delete fm.title;
    assert.throws(() => validateFrontmatter(fm, "my-post"), /my-post.*필수 필드.*title/s);
});

test("validateFrontmatter: 날짜 형식 오류 시 throw", () => {
    const fm = { ...VALID_FM, publishedAt: "not-a-date" };
    assert.throws(() => validateFrontmatter(fm, "my-post"), /my-post.*날짜 형식.*publishedAt/s);
});

test("validateFrontmatter: 기본값과 ISO 날짜 변환", () => {
    const result = validateFrontmatter(VALID_FM, "my-post");
    assert.equal(result.isPublished, true);
    assert.deepEqual(result.tags, []);
    assert.match(result.publishedAt, /^\d{4}-\d{2}-\d{2}T.*Z$/);
    assert.match(result.updatedAt, /^\d{4}-\d{2}-\d{2}T.*Z$/);
});

test("validateFrontmatter: isPublished/tags 명시값 유지", () => {
    const result = validateFrontmatter({ ...VALID_FM, isPublished: false, tags: ["ai", "test"] }, "p");
    assert.equal(result.isPublished, false);
    assert.deepEqual(result.tags, ["ai", "test"]);
});

test("processHtmlBody: 헤딩에 id 부여 + toc 수집 (h2=two, h3=three)", async () => {
    const { html, toc } = await processHtmlBody("<h2>First Section</h2><p>text</p><h3>Sub Part</h3>", "p");
    assert.match(html, /<h2 id="first-section">/);
    assert.equal(toc.length, 2);
    assert.deepEqual(toc[0], { level: "two", text: "First Section", slug: "first-section" });
    assert.equal(toc[1].level, "three");
    assert.equal(toc[1].slug, "sub-part");
});

test("processHtmlBody: script/style 태그 제거", async () => {
    const { html } = await processHtmlBody(
        `<p>keep</p><script>alert(1)</script><style>p{color:red}</style><p>keep2</p>`,
        "p"
    );
    assert.doesNotMatch(html, /<script|<style/);
    assert.match(html, /keep2/);
});

test("processHtmlBody: img에 lazy loading 부여", async () => {
    const { html } = await processHtmlBody(`<img src="/blog-images/p/a.png" alt="a">`, "p");
    assert.match(html, /loading="lazy"/);
    assert.match(html, /decoding="async"/);
});

test("processHtmlBody: 코드블록에 rehype-pretty-code 적용", async () => {
    const { html } = await processHtmlBody(
        `<pre><code class="language-typescript">const x: number = 1;</code></pre>`,
        "p"
    );
    assert.match(html, /data-language="typescript"/);
    assert.match(html, /data-theme="github-dark"/);
});

test("processHtmlBody: 빈 본문이면 throw", async () => {
    await assert.rejects(() => processHtmlBody("   \n  ", "empty-post"), /empty-post.*본문이 비어/s);
});

test("processHtmlBody: readingTime은 태그를 제외한 텍스트 기준", async () => {
    const words = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
    const { readingTime } = await processHtmlBody(`<p>${words}</p>`, "p");
    assert.equal(readingTime.words, 400);
    assert.match(readingTime.text, /min read/);
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `node --test scripts/`
Expected: FAIL — `Cannot find module '.../scripts/html-posts-lib.mjs'`

- [ ] **Step 4: 구현 작성**

`scripts/html-posts-lib.mjs` 생성:

```js
import matter from "gray-matter";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString as hastToString } from "hast-util-to-string";
import readingTime from "reading-time";

const REQUIRED_FIELDS = ["title", "description", "image", "publishedAt", "updatedAt", "author"];
const DATE_FIELDS = ["publishedAt", "updatedAt"];

export function parseHtmlPost(fileContent) {
    const { data, content } = matter(fileContent);
    return { frontmatter: data, body: content };
}

export function validateFrontmatter(frontmatter, slug) {
    const missing = REQUIRED_FIELDS.filter(
        (field) => frontmatter[field] === undefined || frontmatter[field] === ""
    );
    if (missing.length > 0) {
        throw new Error(`[${slug}] frontmatter 필수 필드 누락: ${missing.join(", ")}`);
    }
    for (const field of DATE_FIELDS) {
        if (isNaN(new Date(frontmatter[field]).getTime())) {
            throw new Error(`[${slug}] frontmatter 날짜 형식 오류: ${field}="${frontmatter[field]}"`);
        }
    }
    return {
        title: frontmatter.title,
        description: frontmatter.description,
        image: frontmatter.image,
        publishedAt: new Date(frontmatter.publishedAt).toISOString(),
        updatedAt: new Date(frontmatter.updatedAt).toISOString(),
        author: frontmatter.author,
        isPublished: frontmatter.isPublished ?? true,
        tags: frontmatter.tags ?? [],
    };
}

// <script>/<style> 제거: script는 AI 생성 콘텐츠 안전 기본값, style은 전역 스타일 오염 방지
function rehypeRemoveScriptsAndStyles() {
    return (tree) => {
        visit(tree, "element", (node, index, parent) => {
            if ((node.tagName === "script" || node.tagName === "style") && parent && typeof index === "number") {
                parent.children.splice(index, 1);
                return index; // 제거한 위치부터 재방문
            }
        });
    };
}

// 기존 contentlayer toc와 동일한 레벨 매핑: h1→one, h2→two, h3 이하→three
function rehypeCollectToc(toc) {
    const LEVEL = { h1: "one", h2: "two" };
    return (tree) => {
        visit(tree, "element", (node) => {
            if (/^h[1-6]$/.test(node.tagName)) {
                toc.push({
                    level: LEVEL[node.tagName] ?? "three",
                    text: hastToString(node),
                    slug: String(node.properties?.id ?? ""),
                });
            }
        });
    };
}

// readingTime용 순수 텍스트 수집 (script/style 제거 후, pretty-code 적용 전)
function rehypeCollectText(bucket) {
    return (tree) => {
        bucket.text = hastToString(tree);
    };
}

function rehypeImgLazy() {
    return (tree) => {
        visit(tree, "element", (node) => {
            if (node.tagName === "img") {
                node.properties.loading = "lazy";
                node.properties.decoding = "async";
            }
        });
    };
}

export async function processHtmlBody(rawHtml, slug) {
    if (!rawHtml || rawHtml.trim() === "") {
        throw new Error(`[${slug}] HTML 본문이 비어 있습니다`);
    }
    const toc = [];
    const textBucket = { text: "" };
    const file = await unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeRemoveScriptsAndStyles)
        .use(rehypeCollectText, textBucket)
        .use(rehypeSlug)
        .use(rehypeCollectToc, toc) // 앵커(autolink) 추가 전에 수집해야 텍스트가 깨끗함
        .use(rehypeAutolinkHeadings, { behavior: "append" })
        .use(rehypePrettyCode, { theme: "github-dark" })
        .use(rehypeImgLazy)
        .use(rehypeStringify)
        .process(rawHtml);
    return { html: String(file), toc, readingTime: readingTime(textBucket.text) };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test scripts/`
Expected: 모든 테스트 PASS (11 tests)

- [ ] **Step 6: `test:unit` 스크립트 추가**

`package.json`의 scripts에 추가:

```json
"test:unit": "node --test scripts/"
```

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add scripts/html-posts-lib.mjs scripts/html-posts-lib.test.mjs package.json package-lock.json
git commit -m "feat: HTML 포스트 처리 라이브러리 추가 (frontmatter 검증 + rehype 파이프라인)"
```

---

### Task 2: 빌드 스크립트 + 픽스처 글 + npm 훅 (`scripts/build-html-posts.mjs`)

`content/*/index.html`을 스캔해 `.generated/html-posts.json`을 생성하는 엔트리 스크립트. 커버 이미지의 크기/blurhash 계산 포함(contentlayer2와 동일한 sharp→imagescript 폴백 전략). 검증용 픽스처 글도 여기서 추가한다.

**Files:**
- Create: `scripts/build-html-posts.mjs`
- Create: `content/html-fixture-test-20260713-v01/index.html` (픽스처, `isPublished: false`)
- Create: `public/blog-images/html-fixture-test-20260713-v01/sample.png` (1x1 픽셀)
- Modify: `package.json` (scripts: `posts:html`, `predev`, `prebuild`, `prelint`)
- Modify: `.gitignore` (`.generated/` 추가)

**Interfaces:**
- Consumes: Task 1의 `parseHtmlPost`, `validateFrontmatter`, `processHtmlBody`
- Produces (Task 3이 사용): `.generated/html-posts.json` — 레코드 배열, 각 레코드:
  ```
  { _id: "{slug}/index.html", slug, url: "/blogs/{slug}", title, description,
    publishedAt(ISO), updatedAt(ISO), author, isPublished, tags: string[],
    image: { filePath: "../public/...", relativeFilePath, format, height, width, aspectRatio, blurhashDataUrl },
    readingTime: { text, minutes, time, words },
    toc: [{ level: "one"|"two"|"three", text, slug }],
    html: "<가공된 본문>" }
  ```
  주의: `image.filePath`는 contentlayer와 동일하게 content/ 기준 정규화 상대경로(예: `../public/blog-cover/x.jpg`)여야 한다. 소비처가 `.replace("../public", "")`로 URL을 만든다.

- [ ] **Step 1: 빌드 스크립트 작성**

`scripts/build-html-posts.mjs` 생성:

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseHtmlPost, validateFrontmatter, processHtmlBody } from "./html-posts-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");
const OUT_DIR = path.join(ROOT, ".generated");
const OUT_FILE = path.join(OUT_DIR, "html-posts.json");

// contentlayer2와 동일한 전략: sharp가 있으면 사용, 없으면 imagescript 폴백.
// "blurhash"는 실제로는 8x8로 축소한 이미지의 base64 data URL이다 (contentlayer2 field-image.js와 동일).
async function resizeForBlur(buffer, slug) {
    try {
        const sharp = (await import("sharp")).default;
        const image = sharp(buffer);
        const meta = await image.metadata();
        if (!meta.width || !meta.height || !meta.format) {
            throw new Error("이미지 메타데이터를 읽을 수 없습니다");
        }
        const quality = 70;
        if (meta.format === "jpeg") image.jpeg({ quality });
        else if (meta.format === "webp") image.webp({ quality });
        else if (meta.format === "png") image.png({ quality });
        else if (meta.format === "avif") image.avif({ quality });
        const { data } = await image.resize(8, 8).toBuffer({ resolveWithObject: true });
        return { width: meta.width, height: meta.height, format: meta.format, resized: data };
    } catch {
        const ImageScript = await import("imagescript");
        const format = ImageScript.ImageType.getType(buffer);
        if (!format) throw new Error(`[${slug}] 이미지 형식을 판별할 수 없습니다`);
        const image = await ImageScript.decode(buffer);
        const { width, height } = image;
        image.resize(8, 8);
        const resized = await image.encode(70);
        return { width, height, format, resized };
    }
}

async function buildImageField(imageRef, slug) {
    const absPath = path.resolve(CONTENT_DIR, slug, imageRef);
    if (!fs.existsSync(absPath)) {
        throw new Error(`[${slug}] 커버 이미지 파일이 없습니다: ${imageRef}`);
    }
    const buffer = fs.readFileSync(absPath);
    const { width, height, format, resized } = await resizeForBlur(buffer, slug);
    return {
        // contentlayer와 동일: content/ 기준 경로 → "{slug}/../../public/..." → "../public/..."
        filePath: path.posix.normalize(path.posix.join(slug, imageRef)),
        relativeFilePath: imageRef,
        format,
        height,
        width,
        aspectRatio: width / height,
        blurhashDataUrl: `data:image/${format};base64,${Buffer.from(resized).toString("base64")}`,
    };
}

async function main() {
    const htmlSlugs = fs.existsSync(CONTENT_DIR)
        ? fs.readdirSync(CONTENT_DIR).filter((dir) =>
              fs.existsSync(path.join(CONTENT_DIR, dir, "index.html"))
          )
        : [];

    const posts = [];
    for (const slug of htmlSlugs) {
        if (fs.existsSync(path.join(CONTENT_DIR, slug, "index.mdx"))) {
            throw new Error(
                `[${slug}] index.mdx와 index.html이 같은 폴더에 있습니다 (slug 충돌). 하나만 남기세요.`
            );
        }
        const raw = fs.readFileSync(path.join(CONTENT_DIR, slug, "index.html"), "utf8");
        const { frontmatter, body } = parseHtmlPost(raw);
        const fm = validateFrontmatter(frontmatter, slug);
        const { html, toc, readingTime } = await processHtmlBody(body, slug);
        const image = await buildImageField(fm.image, slug);
        posts.push({
            _id: `${slug}/index.html`,
            slug,
            url: `/blogs/${slug}`,
            ...fm,
            image,
            readingTime,
            toc,
            html,
        });
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2));
    console.log(`html-posts: ${posts.length}개 글 생성 → ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((err) => {
    console.error(`html-posts 빌드 실패: ${err.message}`);
    process.exit(1);
});
```

주의: `...fm` 스프레드의 `image`(문자열)는 그 뒤의 `image`(객체) 프로퍼티가 덮어쓴다 — 순서를 바꾸지 말 것.

- [ ] **Step 2: HTML 글이 없는 상태에서 실행 확인**

Run: `node scripts/build-html-posts.mjs && cat .generated/html-posts.json`
Expected: `html-posts: 0개 글 생성 → .generated/html-posts.json` 출력, 파일 내용 `[]`

- [ ] **Step 3: 픽스처 글 생성**

`content/html-fixture-test-20260713-v01/index.html` 생성 (영문 헤딩은 slug 결정성을 위함):

```html
---
title: "HTML Fixture Post"
description: "HTML 포스트 파이프라인 검증용 픽스처 글"
image: "../../public/blog-cover/ai-model.jpg"
publishedAt: "2026-07-13 10:00:00"
updatedAt: "2026-07-13 10:00:00"
author: "fundev"
isPublished: false
tags:
  - test
---
<h2>First Section</h2>
<p>HTML 파이프라인이 처리하는 본문 문단입니다. 목차, 코드 하이라이팅, 이미지 lazy loading을 검증합니다.</p>
<h3>Sub Section</h3>
<ul>
    <li>목록 항목 하나</li>
    <li>목록 항목 둘</li>
</ul>
<blockquote>인용문 스타일 검증</blockquote>
<pre><code class="language-typescript">const x: number = 1;
console.log(x);</code></pre>
<img src="/blog-images/html-fixture-test-20260713-v01/sample.png" alt="샘플 이미지">
<script>alert("이 스크립트는 빌드에서 제거되어야 합니다")</script>
```

본문 이미지 파일(1x1 투명 PNG) 생성:

```bash
mkdir -p public/blog-images/html-fixture-test-20260713-v01
node -e "require('fs').writeFileSync('public/blog-images/html-fixture-test-20260713-v01/sample.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64'))"
```

- [ ] **Step 4: 픽스처 포함 실행 + 산출물 검증**

Run:

```bash
node scripts/build-html-posts.mjs
node -e "
const posts = require('./.generated/html-posts.json');
const assert = require('assert');
assert.equal(posts.length, 1);
const p = posts[0];
assert.equal(p.slug, 'html-fixture-test-20260713-v01');
assert.equal(p._id, 'html-fixture-test-20260713-v01/index.html');
assert.equal(p.url, '/blogs/html-fixture-test-20260713-v01');
assert.equal(p.isPublished, false);
assert.equal(p.image.filePath, '../public/blog-cover/ai-model.jpg');
assert.ok(p.image.width > 0 && p.image.height > 0);
assert.ok(p.image.blurhashDataUrl.startsWith('data:image/'));
assert.ok(p.html.includes('id=\"first-section\"'));
assert.ok(p.html.includes('data-language=\"typescript\"'));
assert.ok(p.html.includes('loading=\"lazy\"'));
assert.ok(!p.html.includes('<script'));
assert.deepEqual(p.toc[0], { level: 'two', text: 'First Section', slug: 'first-section' });
assert.ok(p.readingTime.text.includes('min read'));
console.log('OK');
"
```

Expected: `html-posts: 1개 글 생성` 후 `OK`

- [ ] **Step 5: npm 훅과 .gitignore 추가**

`package.json` scripts를 다음과 같이 수정 (기존 스크립트 유지, 4개 추가):

```json
"scripts": {
    "dev": "next dev",
    "predev": "npm run posts:html",
    "build": "next build",
    "prebuild": "npm run posts:html",
    "postbuild": "next-sitemap",
    "start": "next start -H 0.0.0.0",
    "lint": "next lint",
    "prelint": "npm run posts:html",
    "posts:html": "node scripts/build-html-posts.mjs",
    "test:unit": "node --test scripts/"
}
```

(`prelint`는 gitignore된 JSON이 없는 클린 체크아웃에서 CI lint의 import 해석이 깨지지 않게 한다.)

`.gitignore`의 `# contentlayer` 섹션 아래에 추가:

```
# html posts (generated)
.generated/
```

- [ ] **Step 6: 훅 동작 확인**

Run: `rm -rf .generated && npm run posts:html && ls .generated/`
Expected: `html-posts.json` 존재

- [ ] **Step 7: Commit**

```bash
git add scripts/build-html-posts.mjs content/html-fixture-test-20260713-v01/ public/blog-images/html-fixture-test-20260713-v01/ package.json .gitignore
git commit -m "feat: HTML 포스트 빌드 스크립트 + 픽스처 글 추가"
```

---

### Task 3: 통합 포스트 레이어 (`lib/posts.ts`)

MDX(contentlayer)와 HTML(생성 JSON) 글을 하나의 `Post` 타입으로 병합하는 레이어. `toBlogSummary`는 구조적 타입(PostLike)을 받도록 완화해 이 태스크 이후에도 기존 호출부(contentlayer `Blog`를 넘기는 곳)가 깨지지 않게 한다.

**Files:**
- Create: `lib/posts.ts`
- Modify: `utils/blogData.ts`

**Interfaces:**
- Consumes: `.generated/html-posts.json` (Task 2 레코드 형식), `contentlayer/generated`의 `allBlogs`
- Produces (Task 4, 5가 사용):
  - `type Post = { _id: string; slug: string; title: string; description: string; image: PostImage; publishedAt: string; updatedAt: string; author: string; isPublished: boolean; tags: string[]; url: string; readingTime: { text: string }; toc: TocEntry[]; body: PostBody }`
  - `type PostBody = { kind: "mdx"; code: string } | { kind: "html"; html: string }`
  - `type PostImage = { filePath: string; blurhashDataUrl: string; width: number; height: number }`
  - `type TocEntry = { level: "one" | "two" | "three"; text: string; slug: string }`
  - `getAllPosts(): Post[]` — 정렬하지 않고 병합만 (소비처가 기존처럼 자체 정렬/필터)
  - `toBlogSummary(post)` — 시그니처가 `PostLike`(Blog와 Post 모두 만족하는 구조적 타입)로 변경, 반환 `BlogSummary`는 무변경

- [ ] **Step 1: `lib/posts.ts` 작성**

```ts
import { allBlogs } from "contentlayer/generated";
import htmlPostsJson from "@/.generated/html-posts.json";

export type PostImage = {
    filePath: string;
    blurhashDataUrl: string;
    width: number;
    height: number;
};

export type TocEntry = { level: "one" | "two" | "three"; text: string; slug: string };

export type PostBody = { kind: "mdx"; code: string } | { kind: "html"; html: string };

export type Post = {
    _id: string;
    slug: string;
    title: string;
    description: string;
    image: PostImage;
    publishedAt: string;
    updatedAt: string;
    author: string;
    isPublished: boolean;
    tags: string[];
    url: string;
    readingTime: { text: string };
    toc: TocEntry[];
    body: PostBody;
};

const mdxPosts: Post[] = allBlogs.map((blog) => ({
    _id: blog._id,
    slug: blog._raw.flattenedPath,
    title: blog.title,
    description: blog.description,
    image: {
        filePath: blog.image.filePath,
        blurhashDataUrl: blog.image.blurhashDataUrl,
        width: blog.image.width,
        height: blog.image.height,
    },
    publishedAt: blog.publishedAt,
    updatedAt: blog.updatedAt,
    author: blog.author,
    isPublished: blog.isPublished ?? true,
    tags: blog.tags ?? [],
    url: blog.url,
    readingTime: { text: blog.readingTime.text },
    toc: ((blog.toc as TocEntry[]) ?? []).filter(Boolean),
    body: { kind: "mdx", code: blog.body.code },
}));

type HtmlPostRecord = Omit<Post, "body" | "readingTime" | "image"> & {
    html: string;
    readingTime: { text: string; minutes: number; time: number; words: number };
    image: PostImage & { relativeFilePath: string; format: string; aspectRatio: number };
};

const htmlPosts: Post[] = (htmlPostsJson as unknown as HtmlPostRecord[]).map((record) => ({
    _id: record._id,
    slug: record.slug,
    title: record.title,
    description: record.description,
    image: {
        filePath: record.image.filePath,
        blurhashDataUrl: record.image.blurhashDataUrl,
        width: record.image.width,
        height: record.image.height,
    },
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    author: record.author,
    isPublished: record.isPublished,
    tags: record.tags,
    url: record.url,
    readingTime: { text: record.readingTime.text },
    toc: record.toc,
    body: { kind: "html", html: record.html },
}));

const allPosts: Post[] = [...mdxPosts, ...htmlPosts];

export function getAllPosts(): Post[] {
    return allPosts;
}
```

- [ ] **Step 2: `utils/blogData.ts`의 `toBlogSummary` 시그니처 완화**

파일 전체를 다음으로 교체:

```ts
export type BlogSummary = {
    title: string;
    description: string;
    image: { filePath: string; blurhashDataUrl: string; width: number; height: number };
    tags: string[];
    url: string;
    publishedAt: string;
    updatedAt: string;
    readingTime: string;
    _id: string;
};

// contentlayer Blog와 lib/posts의 Post를 모두 만족하는 구조적 타입
type PostLike = {
    title: string;
    description: string;
    image: { filePath: string; blurhashDataUrl: string; width: number; height: number };
    tags?: string[];
    url: string;
    publishedAt: string;
    updatedAt: string;
    readingTime: { text: string };
    _id: string;
};

export function toBlogSummary(post: PostLike): BlogSummary {
    return {
        title: post.title,
        description: post.description,
        image: {
            filePath: post.image.filePath,
            blurhashDataUrl: post.image.blurhashDataUrl,
            width: post.image.width,
            height: post.image.height,
        },
        tags: post.tags ?? [],
        url: post.url,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        readingTime: post.readingTime.text,
        _id: post._id,
    };
}
```

(기존과 달리 `contentlayer/generated`의 `Blog` import가 사라진다. contentlayer의 `readingTime`은 `json` 타입(any)이므로 `PostLike` 구조에 그대로 대입된다.)

- [ ] **Step 3: 빌드로 타입/번들 검증**

Run: `npm run build`
Expected: prebuild가 html-posts.json 생성 → contentlayer 빌드 → 컴파일 성공. 기존 페이지 전부 생성 성공. (contentlayer `Blog`의 `image` 필드 타입이 `PostLike.image`와 구조적으로 안 맞아 타입 에러가 나면, `blog.image`를 넘기는 기존 호출부는 이 시점에 아직 그대로이므로 에러 메시지의 필드를 확인해 `PostLike.image` 필드를 contentlayer `ImageFieldData`와 호환되게(예: `width?: number` 등 optional로) 조정하고 `toBlogSummary` 내부에서 `?? 0` / `?? ""` 기본값을 채운다.)

- [ ] **Step 4: Commit**

```bash
git add lib/posts.ts utils/blogData.ts
git commit -m "feat: MDX+HTML 통합 포스트 레이어(lib/posts.ts) 추가"
```

---

### Task 4: RenderHtml 렌더러 + 상세 페이지 분기

prose 스타일을 상수로 추출해 RenderMdx와 공유하고, 상세 페이지가 통합 레이어에서 글을 찾아 kind별로 렌더링하게 한다.

**Files:**
- Create: `components/Blog/proseClasses.ts`
- Create: `components/Blog/RenderHtml.tsx`
- Modify: `components/Blog/RenderMdx.tsx`
- Modify: `app/blogs/[slug]/page.tsx`

**Interfaces:**
- Consumes: Task 3의 `getAllPosts()`, `Post`(필드: `slug`, `body.kind`, `body.code`/`body.html`, `image.filePath`, `image.blurhashDataUrl`, `image.width`, `image.height`, `toc`, `url`, `publishedAt`, `updatedAt`, `author`, `title`, `description`, `tags`), `toBlogSummary`
- Produces: `PROSE_CLASSES: string` (Blog 본문 공용 스타일), `RenderHtml({ html: string })` 컴포넌트

- [ ] **Step 1: prose 클래스 상수 추출**

`components/Blog/proseClasses.ts` 생성 (클래스 문자열은 현재 `RenderMdx.tsx`의 className과 동일해야 한다):

```ts
export const PROSE_CLASSES = [
    "col-span-12 md:col-span-9 font-in prose sm:prose-base md:prose-lg max-w-max",
    "prose-blockquote:bg-accent/20",
    "prose-blockquote:px-6",
    "prose-blockquote:p-2",
    "prose-blockquote:border-accent",
    "prose-blockquote:not-italic",
    "prose-blockquote:rounded-r-lg",
    "prose-li:marker:text-accent",
    "dark:prose-invert",
    "dark:prose-blockquote:border-accentDark",
    "dark:prose-blockquote:bg-accentDark/20",
    "dark:prose-li:marker:text-accentDark",
    "first-letter:text-2xl",
    "sm:first-letter:text-4xl",
].join(" ");
```

`components/Blog/RenderMdx.tsx`의 `<div className="...">`를 상수 사용으로 교체:

```tsx
"use client";
import React from "react";
import { useMDXComponent } from "next-contentlayer2/hooks";
import Image from "next/image";
import { PROSE_CLASSES } from "./proseClasses";

interface BlogProps {
    blog: {
        body: {
            code: string;
        };
    };
}

const mdxComponent = {
    Image,
};

const RenderMdx = ({ blog }: BlogProps) => {
    const MDXContent = useMDXComponent(blog.body.code);
    return (
        <div className={PROSE_CLASSES}>
            <MDXContent components={mdxComponent} />
        </div>
    );
};
export default RenderMdx;
```

- [ ] **Step 2: RenderHtml 작성**

`components/Blog/RenderHtml.tsx` 생성 (서버 컴포넌트 — `"use client"` 없음):

```tsx
import { PROSE_CLASSES } from "./proseClasses";

const RenderHtml = ({ html }: { html: string }) => {
    return <div className={PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default RenderHtml;
```

- [ ] **Step 3: 상세 페이지를 통합 레이어로 전환**

`app/blogs/[slug]/page.tsx` 수정:

1. import 교체:

```tsx
import BlogDetails from "@/components/Blog/BlogDetails";
import RenderMdx from "@/components/Blog/RenderMdx";
import RenderHtml from "@/components/Blog/RenderHtml";
import Tag from "@/components/Elements/tag";
import Comments from "@/components/Comments";
import { getAllPosts } from "@/lib/posts";
import { slug } from "github-slugger";
import Image from "next/image";
import { notFound } from "next/navigation";
import siteMetaData from "@/utils/siteMetaData";
import { toBlogSummary } from "@/utils/blogData";
```

(`import { allBlogs } from "contentlayer/generated";` 제거)

2. 조회 로직 교체 — 세 곳 모두:

```tsx
export async function generateStaticParams() {
    return getAllPosts().map((post) => ({ slug: post.slug }));
}
```

`generateMetadata`와 `BlogPage`의 조회는 각각:

```tsx
const blog = getAllPosts().find((post) => post.slug === params.slug);
```

(이후 코드의 `blog.image.filePath`, `blog.url`, `blog.toc` 등 사용부는 `Post` 타입이 동일 필드를 제공하므로 무변경. `generateMetadata`의 `typeof blog.image.filePath === "string"` 분기도 그대로 둔다.)

3. 본문 렌더링 분기 — `<RenderMdx blog={blog} />` 한 줄을 다음으로 교체:

```tsx
{blog.body.kind === "mdx" ? (
    <RenderMdx blog={{ body: { code: blog.body.code } }} />
) : (
    <RenderHtml html={blog.body.html} />
)}
```

4. `blog.toc.map((heading: any) => ...)`은 무변경 (Post.toc가 동일 shape 제공).

- [ ] **Step 4: 렌더링 검증 (dev 서버 + curl)**

아래 블록 전체를 **한 번의 셸 실행**으로 수행한다. 주의: (1) 백그라운드 잡(`%1`)은 에이전트 셸 세션 간 유지되지 않고 잡 번호도 신뢰할 수 없으므로 서버 종료는 반드시 포트 기준(`lsof`)으로 한다. (2) "없어야 함" 검증에 `grep -c`를 쓰면 매치 0개일 때 exit code 1이 되어 성공 경로가 실패로 보고되므로 `! grep -q` 형태를 쓴다.

```bash
lsof -ti:23001 | xargs kill 2>/dev/null; sleep 1
npm run dev -- -p 23001 > /tmp/dev.log 2>&1 &
sleep 25
curl -s http://localhost:23001/blogs/html-fixture-test-20260713-v01 -o /tmp/fixture.html
curl -s http://localhost:23001/blogs/cicd-setup-20251216-v01 -o /tmp/mdx.html
curl -s http://localhost:23001/ -o /tmp/home.html
lsof -ti:23001 | xargs kill 2>/dev/null
grep -q 'id="first-section"' /tmp/fixture.html && echo OK1-heading-id
grep -q 'data-language="typescript"' /tmp/fixture.html && echo OK2-code-highlight
grep -q 'Table of Contents' /tmp/fixture.html && echo OK3-toc-box
grep -q 'href="#first-section"' /tmp/fixture.html && echo OK4-toc-link
grep -q 'Table of Contents' /tmp/mdx.html && echo OK5-mdx-regression
! grep -q 'html-fixture-test' /tmp/home.html && echo OK6-unpublished-hidden
```

Expected: `OK1`~`OK6` 여섯 줄이 모두 출력된다. (dev 서버 첫 컴파일이 느리면 sleep을 늘려 재시도.)

- [ ] **Step 5: Commit**

```bash
git add components/Blog/proseClasses.ts components/Blog/RenderHtml.tsx components/Blog/RenderMdx.tsx "app/blogs/[slug]/page.tsx"
git commit -m "feat: HTML 글 렌더러 추가 및 상세 페이지 통합 레이어 전환"
```

---

### Task 5: 리스트 소비처 전환 (홈/카테고리/RSS/검색) + sitemap 제외

남은 `allBlogs` 소비처 4곳을 통합 레이어로 교체하고, 픽스처 글을 sitemap에서 제외하고, `toBlogSummary` 시그니처를 `Post`로 좁힌다.

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/categories/[slug]/page.tsx`
- Modify: `app/feed.xml/route.ts`
- Modify: `components/Search/index.tsx`
- Modify: `next-sitemap.config.js`
- Modify: `utils/blogData.ts`

**Interfaces:**
- Consumes: Task 3의 `getAllPosts()`, `Post`, `toBlogSummary`
- Produces: 없음 (최종 소비처)

- [ ] **Step 1: 홈 전환**

`app/page.tsx` — `allBlogs` import를 제거하고 교체:

```tsx
import HomeCoverSection from "@/components/Home/HomeCoverSection";
import FeaturePosts from "@/components/Home/FeaturePosts";
import { getAllPosts } from "@/lib/posts";
import AllPostsSection from "@/components/Home/AllPostsSection";
import { toBlogSummary } from "@/utils/blogData";

export default function Home() {
    const blogs = getAllPosts().filter((post) => post.isPublished).map(toBlogSummary);
    return (
        <main className="flex flex-col items-center justify-center">
            <HomeCoverSection blogs={blogs} />
            <FeaturePosts blogs={blogs} />
            <AllPostsSection blogs={blogs} />
        </main>
    );
}
```

- [ ] **Step 2: 카테고리 전환**

`app/categories/[slug]/page.tsx` — import 한 줄 교체 + `allBlogs` 사용 3곳을 `getAllPosts()`로 치환. 정확한 변경:

```tsx
// 변경 전
import { allBlogs } from "contentlayer/generated";
// 변경 후
import { getAllPosts } from "@/lib/posts";
```

`generateStaticParams` 내부 (15행):

```tsx
// 변경 전
    allBlogs.forEach((blog) => {
// 변경 후
    getAllPosts().forEach((blog) => {
```

`CategoryPage` 내부의 태그 수집 (55행):

```tsx
// 변경 전
    allBlogs.forEach((blog) => {
// 변경 후
    getAllPosts().forEach((blog) => {
```

`CategoryPage` 내부의 글 필터 (66행):

```tsx
// 변경 전
    const blogs = allBlogs.filter((blog) => {
// 변경 후
    const blogs = getAllPosts().filter((blog) => {
```

나머지 로직(태그 slug화, `?.` 옵셔널 체이닝, `toBlogSummary`, `sortBlogs`)은 무변경.

- [ ] **Step 3: RSS 전환**

`app/feed.xml/route.ts` — `import { allBlogs } from "contentlayer/generated";`를 `import { getAllPosts } from "@/lib/posts";`로 교체하고 `const blogs = allBlogs`를 `const blogs = getAllPosts()`로 치환. 나머지 무변경.

- [ ] **Step 4: 검색 전환**

`components/Search/index.tsx` — `import { allBlogs } from "contentlayer/generated";`를 `import { getAllPosts } from "@/lib/posts";`로 교체하고:

```tsx
const searchBlogs = getAllPosts().filter((post) => post.isPublished).map(toBlogSummary);
```

(참고: 오늘도 `allBlogs` import로 전체 글 본문이 클라이언트 번들에 포함되고 있었다 — HTML 글도 같은 방식으로 포함되므로 기존 대비 동작 회귀는 없다. 번들 슬리밍은 별도 과제.)

- [ ] **Step 5: sitemap에서 픽스처 제외**

`next-sitemap.config.js`의 exclude 수정:

```js
exclude: ["/manifest.webmanifest", "/feed.xml", "/blogs/html-fixture-test-20260713-v01"],
```

- [ ] **Step 6: `toBlogSummary` 시그니처를 Post로 좁히기**

모든 호출부가 `Post`를 넘기게 되었으므로 `utils/blogData.ts`의 `PostLike`를 제거하고 정식 타입으로 교체:

```ts
import type { Post } from "@/lib/posts";

export type BlogSummary = {
    title: string;
    description: string;
    image: { filePath: string; blurhashDataUrl: string; width: number; height: number };
    tags: string[];
    url: string;
    publishedAt: string;
    updatedAt: string;
    readingTime: string;
    _id: string;
};

export function toBlogSummary(post: Post): BlogSummary {
    return {
        title: post.title,
        description: post.description,
        image: {
            filePath: post.image.filePath,
            blurhashDataUrl: post.image.blurhashDataUrl,
            width: post.image.width,
            height: post.image.height,
        },
        tags: post.tags,
        url: post.url,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        readingTime: post.readingTime.text,
        _id: post._id,
    };
}
```

- [ ] **Step 7: 전체 빌드 + 노출 검증 (미발행 숨김 + 발행 노출 양방향)**

스펙의 회귀 확인 (1)은 **발행된 HTML 글이 홈/카테고리/RSS에 실제로 노출되는 것**을 요구한다. 픽스처는 평소 `isPublished: false`이므로, 검증 중에만 임시로 발행 상태로 전환했다가 원복한다. 아래 블록을 순서대로 실행한다 (Task 4 Step 4와 동일한 이유로 포트 기준 kill과 `! grep -q`를 사용).

```bash
npm run build   # prebuild(JSON 생성) + next build + postbuild(sitemap) — 경고 없이 통과해야 함

# --- (a) 미발행 상태: 숨김 확인 ---
lsof -ti:23001 | xargs kill 2>/dev/null; sleep 1
npm run dev -- -p 23001 > /tmp/dev.log 2>&1 &
sleep 25
curl -s http://localhost:23001/feed.xml -o /tmp/feed.xml
curl -s http://localhost:23001/categories/all -o /tmp/cat.html
grep -q '<item>' /tmp/feed.xml && echo OK1-rss-has-mdx-items
! grep -q 'html-fixture-test' /tmp/feed.xml && echo OK2-unpublished-not-in-rss
! grep -q 'html-fixture' /tmp/cat.html && echo OK3-unpublished-not-in-category

# --- (b) 발행 상태로 임시 전환: 노출 확인 (스펙 회귀 확인 (1)) ---
node -e "const fs=require('fs'),f='content/html-fixture-test-20260713-v01/index.html';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('isPublished: false','isPublished: true'))"
npm run posts:html
lsof -ti:23001 | xargs kill 2>/dev/null; sleep 1
npm run dev -- -p 23001 > /tmp/dev.log 2>&1 &
sleep 25
curl -s http://localhost:23001/ | grep -q 'html-fixture-test' && echo OK4-published-on-home
curl -s http://localhost:23001/feed.xml | grep -q 'html-fixture-test' && echo OK5-published-in-rss
curl -s http://localhost:23001/categories/all | grep -q 'html-fixture-test' && echo OK6-published-in-category
lsof -ti:23001 | xargs kill 2>/dev/null

# --- (c) 원복 + sitemap 확인 ---
node -e "const fs=require('fs'),f='content/html-fixture-test-20260713-v01/index.html';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('isPublished: true','isPublished: false'))"
npm run posts:html
git diff --exit-code content/html-fixture-test-20260713-v01/index.html && echo OK7-fixture-reverted
! grep -q 'html-fixture' public/sitemap-0.xml && echo OK8-fixture-excluded-from-sitemap
grep -q '/blogs/' public/sitemap-0.xml && echo OK9-sitemap-has-posts
```

Expected: `OK1`~`OK9` 아홉 줄이 모두 출력된다.

참고 (스펙 커버리지 근거):
- **검색 노출**: `components/Search`는 홈과 동일한 `getAllPosts().filter(isPublished).map(toBlogSummary)` 스냅샷을 쓰므로 OK4(홈 노출)가 검색 데이터 포함을 함께 보증한다.
- **sitemap의 HTML 글 자동 포함**: sitemap은 `generateStaticParams`가 내보낸 경로에서 생성되는데, HTML 글의 상세 페이지가 렌더링된다는 것(Task 4 OK1) 자체가 generateStaticParams 포함의 증거다. 픽스처는 테스트 글이므로 exclude로 의도적으로 프로덕션 sitemap에서 제외한다.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx "app/categories/[slug]/page.tsx" app/feed.xml/route.ts components/Search/index.tsx next-sitemap.config.js utils/blogData.ts public/sitemap-0.xml public/sitemap.xml
git commit -m "feat: 홈/카테고리/RSS/검색을 통합 포스트 레이어로 전환"
```

---

### Task 6: Playwright 스모크 테스트 + 문서화 + 최종 검증

브라우저 레벨 회귀 스모크를 추가하고 CLAUDE.md에 HTML 글 규격을 문서화한다.

**Files:**
- Modify: `playwright.config.ts` (baseURL + webServer)
- Create: `tests/html-posts.spec.ts`
- Delete: `tests/example.spec.ts` (playwright.dev 데모 — 우리 앱과 무관한 보일러플레이트)
- Modify: `CLAUDE.md` (HTML 글 규격 추가)

**Interfaces:**
- Consumes: Task 2의 픽스처 글, Task 4/5의 렌더링 경로
- Produces: 없음

- [ ] **Step 1: Playwright 설정에 webServer 추가**

`playwright.config.ts`의 `use`와 그 아래를 수정:

```ts
use: {
    baseURL: "http://localhost:23001",
    trace: "on-first-retry",
},
webServer: {
    command: "npm run dev -- -p 23001",
    url: "http://localhost:23001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
},
```

(projects 배열 등 나머지는 무변경. 주석 처리된 기존 webServer 블록은 삭제.)

- [ ] **Step 2: 스모크 테스트 작성**

`tests/example.spec.ts` 삭제 후 `tests/html-posts.spec.ts` 생성:

```ts
import { test, expect } from "@playwright/test";

const FIXTURE_URL = "/blogs/html-fixture-test-20260713-v01";

test("HTML 글 상세 페이지가 렌더링된다", async ({ page }) => {
    await page.goto(FIXTURE_URL);
    await expect(page.getByRole("heading", { name: "HTML Fixture Post" })).toBeVisible();
    await expect(page.locator("h2#first-section")).toBeVisible();
    await expect(page.locator('pre[data-language="typescript"]').first()).toBeVisible();
    // 앵커는 2개 존재(닫힌 <details> 안의 TOC 링크 + 헤딩에 append된 autolink 앵커).
    // strict mode 위반과 hidden 상태를 피하려면 각각 범위를 좁혀 attached/count로 검증한다.
    await expect(page.locator('h2#first-section a[href="#first-section"]')).toBeAttached();
    await expect(page.locator('details a[href="#first-section"]')).toHaveCount(1);
});

test("HTML 글 본문의 script 태그가 제거되었다", async ({ page }) => {
    await page.goto(FIXTURE_URL);
    const scriptsInArticle = await page
        .locator('article script:not([type="application/ld+json"])')
        .count();
    expect(scriptsInArticle).toBe(0);
});

test("기존 MDX 글이 여전히 렌더링된다", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href^="/blogs/"]').first().click();
    await expect(page.locator("article")).toBeVisible();
    await expect(page.getByText("Table of Contents")).toBeVisible();
});

test("미발행 HTML 픽스처는 홈에 노출되지 않는다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href*="html-fixture-test"]')).toHaveCount(0);
});
```

- [ ] **Step 3: 스모크 실행**

Run: `npx playwright test tests/html-posts.spec.ts --project=chromium`
Expected: 4 passed (webServer가 dev 서버를 자동 기동; 최초 컴파일 때문에 1~2분 걸릴 수 있음)

- [ ] **Step 4: CLAUDE.md 문서화**

`CLAUDE.md`의 "Blog Post Format" 섹션 안 "### 새 글 생성" 을 다음으로 교체:

```markdown
### 새 글 생성

경로: `content/{topic}-{YYYYMMDD}-v01/index.mdx` (MDX) 또는 `content/{topic}-{YYYYMMDD}-v01/index.html` (HTML)

**HTML 글**: frontmatter는 MDX와 동일, 본문은 시맨틱 HTML 조각(`<h2>`, `<p>`, `<pre><code class="language-x">`, `<img>` 등).
- 본문 이미지: `public/blog-images/{slug}/`에 두고 `/blog-images/{slug}/xxx.png`로 참조
- `<script>`/`<style>`은 빌드 시 제거됨
- 빌드: `npm run posts:html` (predev/prebuild/prelint 훅으로 **프로세스 시작 시** 자동 실행) → `.generated/html-posts.json`
- ⚠️ MDX와 달리 핫리로드 안 됨: dev 서버 실행 중 HTML 글을 추가/수정하면 재시작 필요 (npm: `npm run dev` 재실행, Docker: `./run-local.sh restart`)
- 파이프라인: `scripts/build-html-posts.mjs` → `lib/posts.ts` 통합 레이어 (MDX+HTML 병합)
```

- [ ] **Step 5: 최종 전체 검증**

Run:

```bash
npm run test:unit && npm run lint && npm run build && npx playwright test tests/html-posts.spec.ts --project=chromium
```

Expected: 전부 PASS. (lint는 prelint 훅으로 JSON을 재생성한 뒤 실행된다.)

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/html-posts.spec.ts CLAUDE.md
git rm tests/example.spec.ts
git commit -m "test: HTML 포스트 Playwright 스모크 + CLAUDE.md 문서화"
```
