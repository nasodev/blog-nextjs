# Blog Frontend Pipeline Implementation Plan (API 연동 + /admin 에디터)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** blog-nextjs를 Contentlayer 정적 콘텐츠에서 backend-api 기반 동적 콘텐츠(ISR + 온디맨드 재검증)로 전환하고, `/admin` 에디터(CodeMirror + iframe 프리뷰 + 이미지 업로드)를 추가한다.

**Architecture:** 데이터 소스만 교체하고 페이지/컴포넌트 구조는 유지. `lib/api/`가 유일한 API 접점, `BlogSummary` 타입을 API 응답 기반으로 재정의해 목록 컴포넌트 변경 최소화. 에디터는 클라이언트 컴포넌트, 권한 검증은 전적으로 API(403) 담당.

**Tech Stack:** Next.js 16(마이그레이션 완료 전제), React 19, Firebase Web SDK, @uiw/react-codemirror, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-07-25-content-pipeline-design.md` (§3 프론트엔드, §4 HTML 규약)

## Global Constraints

- **선행 조건**: Next.js 16 마이그레이션 머지 완료, backend-api `/blog` 도메인 배포 완료 (플랜 `2026-07-25-blog-api-domain.md`)
- 글 fetch 캐시 태그: 상세 `post:{slug}`, 목록성 `posts`. 시간 기반 revalidate 금지 (온디맨드만)
- 글 URL `/blogs/{slug}` 불변 (SEO/Giscus 보존)
- `/admin`은 noindex. 프론트 로그인 체크는 UX용, 권한은 API가 판정
- 본문 크기 2MB, 이미지 10MB (API가 검증 — 프론트는 에러 표시만)
- 환경변수: `NEXT_PUBLIC_API_URL`(예: https://api.funq.kr), `REVALIDATE_SECRET`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
- 검증 게이트: 각 태스크 끝에 `npm run lint` && `npm run build` 통과 (이 저장소에는 unit test 프레임워크가 없음 — 빌드 + 명시된 수동 확인이 게이트)
- 개발 중 API: 로컬 backend-api(`http://localhost:8000`)를 `.env.local`의 `NEXT_PUBLIC_API_URL`로 지정, 글 1~2개를 curl로 시드해 확인 (Task 1 Step 4 참조)

---

## Pre-flight

- [ ] `git checkout main && git pull` — Next 16 마이그레이션이 머지된 상태인지 `package.json`의 `next` 버전으로 확인 (16.x). 아니면 STOP
- [ ] `git checkout -b feat/content-pipeline`
- [ ] backend-api 로컬 기동: `cd C:\dev\funq\backend-api && docker compose up -d` → `curl http://localhost:8000/blog/posts` 가 `[]` 응답
- [ ] `.env.local`에 `NEXT_PUBLIC_API_URL=http://localhost:8000` 추가

---

## File Structure

| Path | Action | Task |
|---|---|---|
| `lib/api/types.ts` | create (API 응답 타입) | 1 |
| `lib/api/posts.ts` | create (공개 fetch 함수) | 1 |
| `lib/api/views.ts` | create (조회수) | 1 |
| `utils/blogData.ts` | rewrite (BlogSummary 재정의) | 2 |
| `next.config.ts` | modify (+images.remotePatterns) | 2 |
| `components/Blog/BlogLayoutOne/Two/Three.tsx` | modify (이미지 필드) | 2 |
| `components/Home/HomeCoverSection.tsx` | modify (이미지 필드) | 2 |
| `app/page.tsx` | modify (API fetch) | 2 |
| `app/categories/[slug]/page.tsx` | modify (API fetch) | 2 |
| `components/Blog/PostBody.tsx` | create | 3 |
| `app/blogs/[slug]/page.tsx` | rewrite (API fetch + PostBody) | 3 |
| `components/Blog/ViewCounter.tsx` | modify (import 경로만) | 3 |
| `components/Search/index.tsx` | modify (API 인덱스) | 4 |
| `app/feed.xml/route.ts` | modify (API fetch) | 4 |
| `app/sitemap.ts` | create | 4 |
| `app/robots.ts` | create | 4 |
| `next-sitemap.config.js` | delete | 4 |
| `app/api/revalidate/route.ts` | create | 5 |
| `lib/firebase.ts` | create | 6 |
| `lib/api/admin.ts` | create (인증 fetch) | 6 |
| `components/Admin/AuthGate.tsx` | create | 6 |
| `app/admin/layout.tsx` | create | 6 |
| `app/admin/page.tsx` | create (글 목록) | 7 |
| `components/Admin/PostEditor.tsx` | create | 8 |
| `app/admin/posts/new/page.tsx` | create | 8 |
| `app/admin/posts/[slug]/page.tsx` | create | 8 |
| `app/admin/preview/page.tsx` | create (iframe 대상) | 9 |
| `components/Admin/EditorPreview.tsx` | create | 9 |
| `lib/supabase/**`, `contentlayer.config.ts`, `components/Blog/RenderMdx.tsx` | delete | 10 |
| `package.json` | modify (의존성 정리/추가) | 1, 6, 8, 10 |

---

### Task 1: API 클라이언트 (타입 + 공개 fetch + 조회수)

**Files:**
- Create: `lib/api/types.ts`, `lib/api/posts.ts`, `lib/api/views.ts`

**Interfaces:**
- Produces (이후 모든 태스크가 사용):
  - `ApiPostSummary`, `ApiPostDetail` — backend 스키마 `BlogPostSummary`/`BlogPostDetail` 대응
  - `getPublishedPosts(tag?: string): Promise<ApiPostSummary[]>` — 태그 `posts`, size=1000
  - `getPost(slug: string): Promise<ApiPostDetail | null>` — 태그 `post:{slug}`, 404 → null
  - `incrementView(slug: string): Promise<number>`, `resolveImageUrl(url: string | null): string`

- [ ] **Step 1: 타입 정의** — `lib/api/types.ts`:

```ts
// backend-api app/schemas/blog.py 응답 스키마 대응
export interface ApiPostSummary {
    id: string;
    slug: string;
    title: string;
    description: string;
    author: string;
    cover_image_url: string | null;
    tags: string[];
    reading_time_minutes: number;
    view_count: number;
    published_at: string;
    updated_at: string;
}

export interface TocEntry {
    level: "two" | "three";
    text: string;
    slug: string;
}

export interface ApiPostDetail extends ApiPostSummary {
    content_html: string;
    toc: TocEntry[];
    is_published: boolean;
}
```

- [ ] **Step 2: 공개 fetch 함수** — `lib/api/posts.ts`:

```ts
import { ApiPostSummary, ApiPostDetail } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** 상대 경로(/blog/images/..)는 API 도메인, 그 외(/blog-cover/.., https://..)는 그대로 */
export function resolveImageUrl(url: string | null): string {
    if (!url) return "/social-banner.png";
    if (url.startsWith("/blog/images/")) return `${API_URL}${url}`;
    return url;
}

export async function getPublishedPosts(tag?: string): Promise<ApiPostSummary[]> {
    const params = new URLSearchParams({ size: "1000" });
    if (tag) params.set("tag", tag);
    const res = await fetch(`${API_URL}/blog/posts?${params}`, {
        next: { tags: ["posts"] },
    });
    if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
    return res.json();
}

export async function getPost(slug: string): Promise<ApiPostDetail | null> {
    const res = await fetch(`${API_URL}/blog/posts/${slug}`, {
        next: { tags: [`post:${slug}`] },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch post ${slug}: ${res.status}`);
    return res.json();
}
```

주의: `social-banner.png`가 `public/`에 실제로 있는지 확인 (`ls public/`). 없으면 실제 존재하는 기본 이미지 파일명으로 교체.

- [ ] **Step 3: 조회수** — `lib/api/views.ts` (클라이언트에서 호출되므로 캐시 미적용):

```ts
import { API_URL } from "./posts";

export async function incrementView(slug: string): Promise<number> {
    const res = await fetch(`${API_URL}/blog/posts/${slug}/view`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to increment view: ${res.status}`);
    const data = (await res.json()) as { view_count: number };
    return data.view_count;
}
```

- [ ] **Step 4: 로컬 API에 시드 글 등록** (이후 태스크의 수동 확인용)

backend-api 테스트 우회 시드 — 로컬 DB에 직접 삽입:

```bash
docker exec backend-api-dev python -c "
from app.external.database import SessionLocal
from app.models.blog import BlogPost
from app.services.blog.content import process_content
from datetime import datetime
db = SessionLocal()
html = '<style>.post-body .demo{color:#7B00D3}</style><h2>첫 섹션</h2><p class=\"demo\">시드 본문</p>'
p = process_content(html)
db.add(BlogPost(slug='seed-post-20260725-v01', title='시드 글', description='로컬 개발용',
    content_html=p.content_html, toc=p.toc, reading_time_minutes=p.reading_time_minutes,
    tags=['test'], published_at=datetime.utcnow()))
db.commit(); print('seeded')
"
curl -s http://localhost:8000/blog/posts/seed-post-20260725-v01
```

Expected: JSON 응답에 `content_html`, `toc` 포함.

- [ ] **Step 5: 검증 + 커밋**

```bash
npm run lint && npm run build
git add lib/api/
git commit -m "feat: add blog API client (posts, views)"
```

(이 시점 빌드는 아직 Contentlayer 경로로 돔 — API 코드는 컴파일만 검증됨)

---

### Task 2: 목록 데이터 전환 (BlogSummary 재정의 + 홈/카테고리)

**Files:**
- Rewrite: `utils/blogData.ts`
- Modify: `next.config.ts` (remotePatterns), `components/Blog/BlogLayoutOne.tsx`, `BlogLayoutTwo.tsx`, `BlogLayoutThree.tsx`, `components/Home/HomeCoverSection.tsx`, `app/page.tsx`, `app/categories/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPublishedPosts`, `resolveImageUrl`(Task 1)
- Produces: 재정의된 `BlogSummary` — **이미지가 단일 URL 문자열이 되고 blurhash/width/height 제거**:

```ts
export type BlogSummary = {
    title: string;
    description: string;
    image: string;          // 해석 완료된 절대/루트상대 URL
    tags: string[];
    url: string;            // /blogs/{slug}
    slug: string;
    publishedAt: string;
    updatedAt: string;
    readingTime: string;    // "N min read"
    viewCount: number;
    _id: string;
};

export function toBlogSummary(post: ApiPostSummary): BlogSummary
```

- [ ] **Step 1: `utils/blogData.ts` 재작성**

```ts
import { ApiPostSummary } from "@/lib/api/types";
import { resolveImageUrl } from "@/lib/api/posts";

export type BlogSummary = {
    title: string;
    description: string;
    image: string;
    tags: string[];
    url: string;
    slug: string;
    publishedAt: string;
    updatedAt: string;
    readingTime: string;
    viewCount: number;
    _id: string;
};

export function toBlogSummary(post: ApiPostSummary): BlogSummary {
    return {
        title: post.title,
        description: post.description,
        image: resolveImageUrl(post.cover_image_url),
        tags: post.tags,
        url: `/blogs/${post.slug}`,
        slug: post.slug,
        publishedAt: post.published_at,
        updatedAt: post.updated_at,
        readingTime: `${post.reading_time_minutes} min read`,
        viewCount: post.view_count,
        _id: post.id,
    };
}
```

- [ ] **Step 2: `next.config.ts`에 이미지 원격 패턴 추가** (마이그레이션으로 생긴 TS config에):

```ts
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "api.funq.kr", pathname: "/blog/images/**" },
            { protocol: "http", hostname: "localhost", port: "8000", pathname: "/blog/images/**" },
        ],
    },
```

- [ ] **Step 3: 이미지 사용 컴포넌트 수정**

`BlogLayoutOne.tsx`, `BlogLayoutTwo.tsx`, `BlogLayoutThree.tsx`, `HomeCoverSection.tsx`에서 다음 패턴을 일괄 치환:

```tsx
// 변경 전
<Image
    src={blog.image.filePath.replace("../public", "")}
    placeholder="blur"
    blurDataURL={blog.image.blurhashDataUrl}
    alt={blog.title}
    width={blog.image.width}
    height={blog.image.height}
    ...
/>

// 변경 후 (blur placeholder 제거, 커버 표준 크기 1200×630 고정 — object-cover라 실제 비율 무관)
<Image
    src={blog.image}
    alt={blog.title}
    width={1200}
    height={630}
    ...
/>
```

`className`/`sizes`/`priority` 등 나머지 props는 그대로 유지. `grep -rn "blurhashDataUrl\|filePath" components/ app/`로 잔여 사용처 0건 확인.

- [ ] **Step 4: 홈 페이지 전환** — `app/page.tsx`:

```tsx
import HomeCoverSection from "@/components/Home/HomeCoverSection";
import FeaturePosts from "@/components/Home/FeaturePosts";
import AllPostsSection from "@/components/Home/AllPostsSection";
import { getPublishedPosts } from "@/lib/api/posts";
import { toBlogSummary } from "@/utils/blogData";

export default async function Home() {
    const posts = await getPublishedPosts();
    const blogs = posts.map(toBlogSummary);
    return (
        <main className="flex flex-col items-center justify-center">
            <HomeCoverSection blogs={blogs} />
            <FeaturePosts blogs={blogs} />
            <AllPostsSection blogs={blogs} />
        </main>
    );
}
```

- [ ] **Step 5: 카테고리 페이지 전환** — `app/categories/[slug]/page.tsx`:

기존 구조(카테고리 목록 + BlogGridInfinite)를 유지하되 데이터 소스 교체:
- `generateStaticParams`: `getPublishedPosts()`의 전체 태그를 github-slugger로 slug화 + `"all"` 포함 (기존 로직의 allBlogs 순회를 posts 순회로 치환)
- 본문: `slug === "all"`이면 전체, 아니면 태그 slug 매칭 필터 (기존 필터 로직에서 `blog.tags` 접근 방식 동일 — BlogSummary.tags 사용)
- `generateMetadata`: 기존 문자열 조립 유지 (params는 마이그레이션 후 async — `await params` 패턴 그대로)

- [ ] **Step 6: 수동 확인**

```bash
npm run dev
```

- `http://localhost:23001/` → 시드 글이 홈 목록/커버에 표시 (이미지는 기본 배너)
- `http://localhost:23001/categories/all` → 시드 글 표시, `/categories/test` → 표시

주의: 이 시점에 글 상세는 아직 Contentlayer 경로(404 예상) — Task 3에서 전환.

- [ ] **Step 7: 검증 + 커밋**

```bash
npm run lint && npm run build
git add utils/ next.config.ts components/ app/
git commit -m "feat: switch post lists to blog API (home, categories)"
```

---

### Task 3: 글 상세 페이지 전환 (PostBody + ViewCounter)

**Files:**
- Create: `components/Blog/PostBody.tsx`
- Rewrite: `app/blogs/[slug]/page.tsx`
- Modify: `components/Blog/ViewCounter.tsx`, `components/Blog/BlogDetails.tsx`(readingTime/viewCount 필드 확인)

**Interfaces:**
- Consumes: `getPost`, `getPublishedPosts`, `resolveImageUrl`(Task 1), `toBlogSummary`(Task 2), `incrementView`(Task 1)
- Produces: `PostBody({ html }: { html: string })` 컴포넌트

- [ ] **Step 1: PostBody 작성** — `components/Blog/PostBody.tsx` (기존 RenderMdx의 prose 클래스를 그대로 승계 + `.post-body` 훅 추가):

```tsx
const PostBody = ({ html }: { html: string }) => {
    return (
        <div
            className="post-body col-span-12 md:col-span-9 font-in prose sm:prose-base md:prose-lg max-w-max
        prose-blockquote:bg-accent/20
        prose-blockquote:px-6
        prose-blockquote:p-2
        prose-blockquote:border-accent
        prose-blockquote:not-italic
        prose-blockquote:rounded-r-lg

        prose-li:marker:text-accent

        dark:prose-invert
        dark:prose-blockquote:border-accentDark
        dark:prose-blockquote:bg-accentDark/20
        dark:prose-li:marker:text-accentDark

        first-letter:text-2xl
        sm:first-letter:text-4xl
        "
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default PostBody;
```

서버 컴포넌트 (`"use client"` 없음 — RenderMdx와 달리 훅 불필요).

- [ ] **Step 2: `app/blogs/[slug]/page.tsx` 재작성**

기존 파일 구조를 유지하며 데이터 소스와 본문 렌더만 교체:

```tsx
import BlogDetails from "@/components/Blog/BlogDetails";
import PostBody from "@/components/Blog/PostBody";
import Tag from "@/components/Elements/tag";
import Comments from "@/components/Comments";
import { slug as slugify } from "github-slugger";
import Image from "next/image";
import { notFound } from "next/navigation";
import siteMetaData from "@/utils/siteMetaData";
import { getPost, getPublishedPosts, resolveImageUrl } from "@/lib/api/posts";
import { toBlogSummary } from "@/utils/blogData";

export async function generateStaticParams() {
    const posts = await getPublishedPosts();
    return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) {
        return { title: "Blog Not Found", description: "Blog not found" };
    }

    const imageUrl = resolveImageUrl(post.cover_image_url);
    const ogImage = [{
        url: imageUrl.startsWith("http") ? imageUrl : siteMetaData.siteUrl + imageUrl,
        width: 1200,
        height: 630,
    }];

    return {
        title: post.title,
        description: post.description,
        alternates: { canonical: `/blogs/${post.slug}` },
        openGraph: {
            title: post.title,
            description: post.description,
            url: `${siteMetaData.siteUrl}/blogs/${post.slug}`,
            siteName: siteMetaData.title,
            locale: siteMetaData.locale,
            type: "article",
            publishedTime: new Date(post.published_at).toISOString(),
            modifiedTime: new Date(post.updated_at).toISOString(),
            images: ogImage,
            authors: [post.author],
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.description,
            images: ogImage,
        },
    };
}

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) notFound();

    const imageUrl = resolveImageUrl(post.cover_image_url);
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: post.title,
        description: post.description,
        image: [imageUrl.startsWith("http") ? imageUrl : siteMetaData.siteUrl + imageUrl],
        datePublished: new Date(post.published_at).toISOString(),
        dateModified: new Date(post.updated_at).toISOString(),
        author: [{ "@type": "Person", name: [post.author], url: `${siteMetaData.siteUrl}/blogs/${post.slug}` }],
    };

    return (
        <section>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <article>
                <div className="mb-8 text-center relative w-full h-[70vh] bg-dark">
                    <div className="w-full z-10 flex flex-col items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Tag
                            name={post.tags[0] ? slugify(post.tags[0]) : "uncategorized"}
                            link={`/categories/${post.tags[0] ? slugify(post.tags[0]) : "uncategorized"}`}
                            className="px-6 text-sm py-2"
                        />
                        <h1 className="inline-block mt-6 font-semibold capitalize text-light text-2xl md:text-3xl lg:text-5xl leading-normal relative w-5/6">
                            {post.title}
                        </h1>
                    </div>
                    <div className="absolute top-0 left-0 right-0 bottom-0 h-full bg-dark/60 dark:bg-dark/40" />
                    <Image
                        src={imageUrl}
                        alt={post.title}
                        width={1200}
                        height={630}
                        className="aspect-square w-full h-full object-cover object-center"
                        priority
                        sizes="100vw"
                    />
                </div>
                <BlogDetails blog={toBlogSummary(post)} slug={slug} />
                <div className="grid grid-cols-12 gap-y-8 lg:gap-8 sxl:gap-16 mt-8 px-5 md:px-10">
                    <div className="col-span-12 md:col-span-3">
                        <details className="border-[1px] border-solid border-dark dark:border-light text-dark dark:text-light rounded-lg p-4 sticky top-6 max-h-[80vh] overflow-hidden overflow-y-auto">
                            <summary className="text-lg font-semibold capitalize cursor-pointer">
                                Table of Contents
                            </summary>
                            <ul className="mt-4 font-in text-base">
                                {post.toc.map((heading) => (
                                    <li key={heading.slug} className="py-1">
                                        <a
                                            href={`#${heading.slug}`}
                                            data-level={heading.level}
                                            className="data-[level=two]:pl-0 data-[level=two]:pt-2 data-[level=two]:border-t border-solid border-dark/40
                                        data-[level=three]:pl-4 sm:data-[level=three]:pl-6
                                        flex items-center justify-start"
                                        >
                                            {heading.level == "three" ? (
                                                <span className="flex w-1 h-1 rouned-full bg-dark mr-2">&nbsp;</span>
                                            ) : null}
                                            <span className="hover:underline">{heading.text}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    </div>
                    <PostBody html={post.content_html} />
                </div>
                <div className="px-5 md:px-10">
                    <Comments slug={slug} />
                </div>
            </article>
        </section>
    );
}
```

- [ ] **Step 3: ViewCounter 전환** — `components/Blog/ViewCounter.tsx`의 import와 호출만 교체:

```tsx
// 변경 전
import { incrementViewCount, getViewCount } from "@/lib/supabase/api/views";
// ...
await incrementViewCount(slug);
const count = await getViewCount(slug);
setViews(count);

// 변경 후
import { incrementView } from "@/lib/api/views";
// ...
const count = await incrementView(slug);   // 증가 + 현재값을 한 번에 반환
setViews(count);
```

`noCount === true`인 경우(증가 없이 조회만)가 사용되는지 확인: `grep -rn "noCount" components/ app/`. 사용처가 있으면 `GET /blog/posts/{slug}` summary의 `view_count`를 쓰도록 해당 사용처에서 `BlogSummary.viewCount`를 prop으로 내려 표시 (API에 조회 전용 엔드포인트를 새로 만들지 않는다).

- [ ] **Step 4: BlogDetails 확인** — `components/Blog/BlogDetails.tsx`가 사용하는 BlogSummary 필드(`readingTime`, `publishedAt` 등)가 Task 2의 새 타입과 일치하는지 확인, `blog.readingTime` 문자열 사용이면 변경 불필요.

- [ ] **Step 5: 수동 확인**

`npm run dev` → `http://localhost:23001/blogs/seed-post-20260725-v01`:
- 본문 렌더 + 커스텀 스타일(`.demo` 보라색) 적용
- TOC에 "첫 섹션" 표시, 클릭 시 앵커 이동
- ViewCounter 숫자 표시, 새로고침 시 +1
- 다크모드 토글 정상

- [ ] **Step 6: 검증 + 커밋**

```bash
npm run lint && npm run build
git add components/ app/ lib/
git commit -m "feat: render blog posts from API with PostBody"
```

---

### Task 4: 검색·RSS·sitemap 전환

**Files:**
- Modify: `components/Search/index.tsx`, `app/feed.xml/route.ts`
- Create: `app/sitemap.ts`, `app/robots.ts`
- Delete: `next-sitemap.config.js`
- Modify: `package.json` (postbuild 제거, next-sitemap 제거)

**Interfaces:**
- Consumes: `getPublishedPosts`(서버), 공개 API(클라이언트 검색)

- [ ] **Step 1: 검색 인덱스 전환** — `components/Search/index.tsx`:

모듈 상단의 정적 인덱스 구성을 제거하고 모달 오픈 시 fetch로 교체:

```tsx
// 삭제:
import { allBlogs } from "contentlayer/generated";
const searchBlogs = allBlogs.filter((b) => b.isPublished).map(toBlogSummary);

// openModal 내부 (기존 Fuse lazy-load 패턴에 합류):
const blogsRef = useRef<BlogSummary[] | null>(null);

const openModal = useCallback(async () => {
    setIsOpen(true);
    if (!fuseRef.current) {
        const [{ default: Fuse }, res] = await Promise.all([
            import("fuse.js"),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/blog/posts?size=1000`),
        ]);
        const posts = (await res.json()) as ApiPostSummary[];
        blogsRef.current = posts.map(toBlogSummary);
        fuseRef.current = new Fuse(blogsRef.current, fuseOptions);
    }
    // ...기존 포커스 로직 유지
}, []);
```

검색 결과 항목이 `item.image`(문자열)를 쓰도록 결과 렌더의 이미지 부분도 Task 2 패턴으로 수정. fetch 실패 시 결과 없음 상태 유지 (에러 토스트 불필요 — 검색만 영향).

- [ ] **Step 2: RSS 전환** — `app/feed.xml/route.ts`:

```ts
// 변경 전
import { allBlogs } from "contentlayer/generated";
const blogs = allBlogs.filter((blog) => blog.isPublished).sort(...);

// 변경 후
import { getPublishedPosts } from "@/lib/api/posts";
// GET() 내부:
const blogs = (await getPublishedPosts()).map((p) => ({
    title: p.title,
    description: p.description,
    author: p.author,
    publishedAt: p.published_at,
    url: `/blogs/${p.slug}`,
}));
```

XML 조립 로직은 그대로. Next 16 마이그레이션에서 추가된 `export const dynamic = 'force-static'`이 있으면 **제거** (fetch 태그 재검증이 동작해야 함 — 라우트는 동적이지만 내부 fetch가 `posts` 태그로 캐시되므로 비용 없음). `Cache-Control` 헤더는 유지.

- [ ] **Step 3: sitemap/robots 전환**

`app/sitemap.ts` 신규:

```ts
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
```

`app/robots.ts` 신규:

```ts
import { MetadataRoute } from "next";
import siteMetaData from "@/utils/siteMetaData";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/", disallow: "/admin" },
        sitemap: `${siteMetaData.siteUrl}/sitemap.xml`,
    };
}
```

정리:

```bash
npm uninstall next-sitemap
rm next-sitemap.config.js
```

`package.json`에서 `"postbuild": "next-sitemap"` 라인 삭제. `public/sitemap*.xml`, `public/robots.txt`가 next-sitemap 산출물로 존재하면 삭제 (app 라우트와 충돌 방지).

- [ ] **Step 4: 수동 확인**

`npm run dev` 후:
- Cmd/Ctrl+K → 검색 → "시드" 입력 → 결과 표시
- `curl http://localhost:23001/feed.xml` → 시드 글 item 포함 XML
- `curl http://localhost:23001/sitemap.xml` → 시드 글 URL 포함
- `curl http://localhost:23001/robots.txt` → `Disallow: /admin` 포함

- [ ] **Step 5: 검증 + 커밋**

```bash
npm run lint && npm run build
git add -A
git commit -m "feat: switch search, RSS, sitemap to blog API"
```

---

### Task 5: 온디맨드 재검증 라우트

**Files:**
- Create: `app/api/revalidate/route.ts`

**Interfaces:**
- Produces: `POST /api/revalidate` — 헤더 `x-revalidate-secret`, body `{ slug?: string }`. slug 있으면 `post:{slug}`+`posts`, 없으면 `posts`만 재검증. Task 8의 에디터 저장 흐름이 호출

- [ ] **Step 1: 라우트 작성**

```ts
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-revalidate-secret");
    if (!secret || secret !== process.env.REVALIDATE_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { slug?: string };
    if (body.slug) {
        revalidateTag(`post:${body.slug}`);
    }
    revalidateTag("posts");

    return NextResponse.json({ revalidated: true, slug: body.slug ?? null });
}
```

- [ ] **Step 2: 수동 확인** — `.env.local`에 `REVALIDATE_SECRET=dev-secret` 추가 후:

```bash
npm run build && npm run start
curl -s -X POST http://localhost:3000/api/revalidate -H "x-revalidate-secret: wrong" | findstr Unauthorized
curl -s -X POST http://localhost:3000/api/revalidate -H "x-revalidate-secret: dev-secret" -H "Content-Type: application/json" -d "{\"slug\":\"seed-post-20260725-v01\"}"
```

Expected: 첫 요청 401, 둘째 `{"revalidated":true,...}`. 이후 시드 글을 DB에서 직접 수정(`docker exec ... python -c "...title 변경..."`) → revalidate 호출 → 페이지 새로고침 시 반영 확인.

- [ ] **Step 3: 검증 + 커밋**

```bash
npm run lint && npm run build
git add app/api/
git commit -m "feat: add on-demand revalidation route"
```

---

### Task 6: Firebase 로그인 + 관리자 API 클라이언트 + AuthGate

**Files:**
- Create: `lib/firebase.ts`, `lib/api/admin.ts`, `components/Admin/AuthGate.tsx`, `app/admin/layout.tsx`
- Modify: `package.json` (+`firebase`)

**Interfaces:**
- Produces:
  - `signInWithGoogle(): Promise<void>`, `signOutUser(): Promise<void>`, `onAuthChange(cb)`, `getIdToken(): Promise<string | null>`
  - `adminFetch(path: string, init?: RequestInit): Promise<Response>` — ID 토큰 자동 첨부
  - `listAllPosts(): Promise<ApiPostSummary[]>`, `getPostForEdit(slug): Promise<ApiPostDetail>`, `createPost(data)`, `updatePost(slug, data)`, `deletePost(slug)`, `uploadImage(file): Promise<{url: string; filename: string}>`
  - `AuthGate` — 로그인 안 됐으면 Google 로그인 버튼, 됐으면 children 렌더

- [ ] **Step 1: 의존성 설치**

```bash
npm install firebase @uiw/react-codemirror @codemirror/lang-html
```

(CodeMirror는 Task 8에서 사용 — 설치를 묶어 lockfile 변경 1회로)

- [ ] **Step 2: Firebase 초기화** — `lib/firebase.ts`:

```ts
"use client";

import { initializeApp, getApps } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function signInWithGoogle(): Promise<void> {
    await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
    await signOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void) {
    return onAuthStateChanged(auth, cb);
}

export async function getIdToken(): Promise<string | null> {
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
}
```

Firebase 콘솔 사전 작업 (backend-api가 쓰는 기존 Firebase 프로젝트): Authentication > Sign-in method에서 Google 활성화, Authorized domains에 `blog.funq.kr`와 `localhost` 등록. 웹 앱 구성값을 `.env.local`의 `NEXT_PUBLIC_FIREBASE_*`로 설정.

- [ ] **Step 3: 관리자 API 클라이언트** — `lib/api/admin.ts`:

```ts
"use client";

import { getIdToken } from "@/lib/firebase";
import { API_URL } from "./posts";
import { ApiPostSummary, ApiPostDetail } from "./types";

export interface PostPayload {
    slug?: string;
    title?: string;
    description?: string;
    content_html?: string;
    author?: string;
    cover_image_url?: string | null;
    tags?: string[];
    is_published?: boolean;
    published_at?: string;
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getIdToken();
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        const detail = await res.json().then((b) => b.detail).catch(() => res.statusText);
        throw new Error(`${res.status}: ${detail}`);
    }
    return res;
}

const json = (data: unknown): RequestInit => ({
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
});

export const listAllPosts = (): Promise<ApiPostSummary[]> =>
    adminFetch("/blog/admin/posts").then((r) => r.json());

export const getPostForEdit = (slug: string): Promise<ApiPostDetail> =>
    adminFetch(`/blog/admin/posts/${slug}`).then((r) => r.json());  // 비발행 글 포함 (관리자 상세)

export const createPost = (data: PostPayload): Promise<ApiPostDetail> =>
    adminFetch("/blog/posts", { method: "POST", ...json(data) }).then((r) => r.json());

export const updatePost = (slug: string, data: PostPayload): Promise<ApiPostDetail> =>
    adminFetch(`/blog/posts/${slug}`, { method: "PUT", ...json(data) }).then((r) => r.json());

export const deletePost = (slug: string): Promise<void> =>
    adminFetch(`/blog/posts/${slug}`, { method: "DELETE" }).then(() => undefined);

export const uploadImage = async (file: File): Promise<{ url: string; filename: string }> => {
    const form = new FormData();
    form.append("file", file);
    return adminFetch("/blog/images", { method: "POST", body: form }).then((r) => r.json());
};

export const requestRevalidate = async (slug: string): Promise<void> => {
    await fetch("/api/revalidate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": process.env.NEXT_PUBLIC_REVALIDATE_SECRET ?? "",
        },
        body: JSON.stringify({ slug }),
    });
};
```

**주의 — 시크릿 노출 판단**: revalidate 시크릿이 클라이언트 번들에 들어가는 것을 피하려면 `requestRevalidate`를 서버로 옮겨야 하나, revalidate는 파괴적 작업이 아니고(캐시 갱신뿐) 관리자만 쓰는 UI라 수용 가능한 트레이드오프. 단순하게 `NEXT_PUBLIC_REVALIDATE_SECRET` 하나로 통일한다 (`REVALIDATE_SECRET`와 같은 값 설정). `app/api/revalidate/route.ts`는 `process.env.REVALIDATE_SECRET ?? process.env.NEXT_PUBLIC_REVALIDATE_SECRET` 순으로 조회하도록 Task 5 코드에서 한 줄 수정.

- [ ] **Step 4: AuthGate + 레이아웃**

`components/Admin/AuthGate.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { signInWithGoogle, signOutUser, onAuthChange } from "@/lib/firebase";
import type { User } from "firebase/auth";

const AuthGate = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return onAuthChange((u) => {
            setUser(u);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <h1 className="text-2xl font-semibold">Blog Admin</h1>
                <button
                    onClick={() => signInWithGoogle()}
                    className="px-6 py-2 rounded-lg bg-dark text-light dark:bg-light dark:text-dark"
                >
                    Google로 로그인
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end px-5 py-2 text-sm gap-4">
                <span>{user.email}</span>
                <button onClick={() => signOutUser()} className="underline">로그아웃</button>
            </div>
            {children}
        </div>
    );
};

export default AuthGate;
```

`app/admin/layout.tsx`:

```tsx
import AuthGate from "@/components/Admin/AuthGate";

export const metadata = {
    title: "Blog Admin",
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AuthGate>{children}</AuthGate>;
}
```

- [ ] **Step 5: 수동 확인** — `npm run dev` → `http://localhost:23001/admin`(아직 page 없음 → Task 7에서 확인 가능하도록 임시로 `app/admin/page.tsx`에 `export default function AdminPage() { return <div>admin</div>; }` 생성) → Google 로그인 팝업 → 로그인 후 이메일 표시. 페이지 소스에 `noindex` 메타 확인.

- [ ] **Step 6: 검증 + 커밋**

```bash
npm run lint && npm run build
git add package.json package-lock.json lib/ components/Admin/ app/admin/
git commit -m "feat: add Firebase admin auth and admin API client"
```

---

### Task 7: /admin 글 목록 화면

**Files:**
- Rewrite: `app/admin/page.tsx` (Task 6의 임시 파일 대체)

**Interfaces:**
- Consumes: `listAllPosts`, `deletePost`, `requestRevalidate`(Task 6)

- [ ] **Step 1: 목록 페이지 작성** — `app/admin/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listAllPosts, deletePost, requestRevalidate } from "@/lib/api/admin";
import { ApiPostSummary } from "@/lib/api/types";

export default function AdminPostsPage() {
    const [posts, setPosts] = useState<ApiPostSummary[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        listAllPosts().then(setPosts).catch((e) => setError(String(e)));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleDelete = async (slug: string) => {
        if (!window.confirm(`"${slug}" 글을 삭제할까요?`)) return;
        try {
            await deletePost(slug);
            await requestRevalidate(slug);
            load();
        } catch (e) {
            setError(String(e));
        }
    };

    return (
        <main className="max-w-4xl mx-auto px-5 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">글 관리</h1>
                <Link href="/admin/posts/new" className="px-4 py-2 rounded-lg bg-accent text-light">
                    새 글
                </Link>
            </div>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <ul className="divide-y divide-dark/10 dark:divide-light/10">
                {posts.map((post) => (
                    <li key={post.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <Link href={`/admin/posts/${post.slug}`} className="font-semibold hover:underline">
                                {post.title}
                            </Link>
                            <p className="text-sm opacity-60 truncate">
                                {post.slug} · {new Date(post.published_at).toLocaleDateString()} · {post.view_count} views
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <Link href={`/blogs/${post.slug}`} className="text-sm underline" target="_blank">
                                보기
                            </Link>
                            <button onClick={() => handleDelete(post.slug)} className="text-sm text-red-500 underline">
                                삭제
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </main>
    );
}
```

- [ ] **Step 2: 수동 확인** — `/admin` 로그인 후 시드 글이 목록에 표시. **주의**: 로컬 backend의 `BLOG_ADMIN_UIDS`에 본인 Firebase UID를 넣어야 403이 안 남 — `.env`(backend) 수정 후 `docker compose restart`. UID는 로그인 후 브라우저 콘솔 `await firebase.auth().currentUser.uid` 대신, backend 로그 또는 Firebase Console > Authentication 사용자 목록에서 확인.

- [ ] **Step 3: 검증 + 커밋**

```bash
npm run lint && npm run build
git add app/admin/
git commit -m "feat: add admin posts list page"
```

---

### Task 8: 에디터 화면 (CodeMirror + 메타 폼 + 저장 + 초안 백업)

**Files:**
- Create: `components/Admin/PostEditor.tsx`
- Create: `app/admin/posts/new/page.tsx`, `app/admin/posts/[slug]/page.tsx`

**Interfaces:**
- Consumes: `createPost`/`updatePost`/`uploadImage`/`getPostForEdit`/`requestRevalidate`(Task 6)
- Produces: `PostEditor({ initial }: { initial: ApiPostDetail | null })` — null이면 새 글 모드
- 프리뷰 iframe은 Task 9에서 연결 (이 태스크에서는 자리만 — `<EditorPreview>` 없이 좌측 에디터/메타 폼 + 저장 동작까지)

- [ ] **Step 1: PostEditor 작성** — `components/Admin/PostEditor.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeMirror from "@uiw/react-codemirror";
import { html as htmlLang } from "@codemirror/lang-html";
import { createPost, updatePost, uploadImage, requestRevalidate, PostPayload } from "@/lib/api/admin";
import { ApiPostDetail } from "@/lib/api/types";
import { API_URL } from "@/lib/api/posts";

const DRAFT_KEY = (slug: string) => `blog-draft:${slug}`;

interface Meta {
    slug: string;
    title: string;
    description: string;
    tags: string;          // 콤마 구분 입력
    cover_image_url: string;
    is_published: boolean;
}

const PostEditor = ({ initial }: { initial: ApiPostDetail | null }) => {
    const router = useRouter();
    const isNew = initial === null;
    const [meta, setMeta] = useState<Meta>({
        slug: initial?.slug ?? "",
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        tags: initial?.tags.join(", ") ?? "",
        cover_image_url: initial?.cover_image_url ?? "",
        is_published: initial?.is_published ?? true,
    });
    const [content, setContent] = useState(initial?.content_html ?? "");
    const [status, setStatus] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [revalidateFailed, setRevalidateFailed] = useState<string | null>(null);  // 실패한 slug
    const editorRef = useRef<{ view?: { dispatch: Function; state: any } }>(null);

    // 초안 자동 백업 (5초 간격)
    useEffect(() => {
        const key = DRAFT_KEY(meta.slug || "new");
        const timer = setInterval(() => {
            localStorage.setItem(key, JSON.stringify({ meta, content, at: Date.now() }));
        }, 5000);
        return () => clearInterval(timer);
    }, [meta, content]);

    // 초안 복구 제안 (마운트 시 1회)
    useEffect(() => {
        const key = DRAFT_KEY(initial?.slug ?? "new");
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
            const draft = JSON.parse(raw);
            if (draft.content && draft.content !== (initial?.content_html ?? "")) {
                if (window.confirm("저장되지 않은 초안이 있습니다. 복구할까요?")) {
                    setMeta(draft.meta);
                    setContent(draft.content);
                }
            }
        } catch {
            /* 손상된 초안 무시 */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const insertAtCursor = useCallback((text: string) => {
        setContent((prev) => prev + "\n" + text);  // 단순화: 끝에 추가 (커서 삽입은 CodeMirror view API로 개선 가능)
    }, []);

    const handleImageFiles = useCallback(
        async (files: FileList | File[]) => {
            for (const file of Array.from(files)) {
                if (!file.type.startsWith("image/")) continue;
                setStatus(`업로드 중: ${file.name}...`);
                try {
                    const { url } = await uploadImage(file);
                    insertAtCursor(`<img src="${API_URL}${url}" alt="" loading="lazy" />`);
                    setStatus(`업로드 완료: ${file.name}`);
                } catch (e) {
                    setStatus(`업로드 실패: ${String(e)}`);
                }
            }
        },
        [insertAtCursor]
    );

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);
        const payload: PostPayload = {
            title: meta.title,
            description: meta.description,
            content_html: content,
            cover_image_url: meta.cover_image_url || null,
            tags: meta.tags.split(",").map((t) => t.trim()).filter(Boolean),
            is_published: meta.is_published,
        };
        try {
            const saved = isNew
                ? await createPost({ ...payload, slug: meta.slug })
                : await updatePost(initial!.slug, payload);
            try {
                await requestRevalidate(saved.slug);
                setStatus("저장 + 반영 완료");
                setRevalidateFailed(null);
            } catch {
                setStatus("저장됨 — 캐시 반영 실패");
                setRevalidateFailed(saved.slug);
            }
            localStorage.removeItem(DRAFT_KEY(initial?.slug ?? "new"));
            if (isNew) router.replace(`/admin/posts/${saved.slug}`);
        } catch (e) {
            setStatus(`저장 실패: ${String(e)}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="px-5 py-6">
            {/* 메타데이터 폼 */}
            <div className="grid grid-cols-2 gap-3 mb-4 max-w-4xl">
                <input
                    className="border rounded px-3 py-2 bg-transparent"
                    placeholder="slug (kebab-case)"
                    value={meta.slug}
                    disabled={!isNew}
                    onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2 bg-transparent"
                    placeholder="제목"
                    value={meta.title}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2 bg-transparent col-span-2"
                    placeholder="설명"
                    value={meta.description}
                    onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2 bg-transparent"
                    placeholder="태그 (콤마 구분)"
                    value={meta.tags}
                    onChange={(e) => setMeta({ ...meta, tags: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2 bg-transparent"
                    placeholder="커버 이미지 URL"
                    value={meta.cover_image_url}
                    onChange={(e) => setMeta({ ...meta, cover_image_url: e.target.value })}
                />
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={meta.is_published}
                        onChange={(e) => setMeta({ ...meta, is_published: e.target.checked })}
                    />
                    발행
                </label>
                <div className="flex items-center gap-3 justify-end">
                    {status && <span className="text-sm opacity-70">{status}</span>}
                    {revalidateFailed && (
                        <button
                            onClick={async () => {
                                try {
                                    await requestRevalidate(revalidateFailed);
                                    setStatus("반영 완료");
                                    setRevalidateFailed(null);
                                } catch {
                                    setStatus("반영 재시도 실패");
                                }
                            }}
                            className="px-4 py-2 rounded-lg border border-red-500 text-red-500"
                        >
                            반영 재시도
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg bg-accent text-light disabled:opacity-50"
                    >
                        {saving ? "저장 중..." : "저장"}
                    </button>
                </div>
            </div>

            {/* 에디터 + 프리뷰 분할 뷰 */}
            <div
                className="grid grid-cols-2 gap-4 h-[calc(100vh-260px)]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    handleImageFiles(e.dataTransfer.files);
                }}
                onPaste={(e) => {
                    const files = Array.from(e.clipboardData.files);
                    if (files.length) {
                        e.preventDefault();
                        handleImageFiles(files);
                    }
                }}
            >
                <div className="overflow-auto border rounded">
                    <CodeMirror
                        value={content}
                        height="100%"
                        extensions={[htmlLang()]}
                        onChange={setContent}
                    />
                </div>
                <div className="border rounded overflow-hidden">
                    {/* Task 9: <EditorPreview html={content} /> */}
                    <div className="p-4 text-sm opacity-50">프리뷰 (다음 태스크)</div>
                </div>
            </div>
        </main>
    );
};

export default PostEditor;
```

- [ ] **Step 2: 페이지 라우트 작성**

`app/admin/posts/new/page.tsx`:

```tsx
"use client";

import PostEditor from "@/components/Admin/PostEditor";

export default function NewPostPage() {
    return <PostEditor initial={null} />;
}
```

`app/admin/posts/[slug]/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import PostEditor from "@/components/Admin/PostEditor";
import { getPostForEdit } from "@/lib/api/admin";
import { ApiPostDetail } from "@/lib/api/types";

export default function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [post, setPost] = useState<ApiPostDetail | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getPostForEdit(slug).then(setPost).catch((e) => setError(String(e)));
    }, [slug]);

    if (error) return <div className="p-10 text-red-500">{error}</div>;
    if (!post) return <div className="p-10">Loading...</div>;
    return <PostEditor initial={post} />;
}
```

- [ ] **Step 3: 수동 확인**

- `/admin/posts/new` → 메타 입력 + HTML 입력 → 저장 → `/admin/posts/{slug}`로 이동, `/blogs/{slug}` 새 탭에서 확인 (revalidate 반영)
- 기존 시드 글 편집 → 제목 수정 → 저장 → 공개 페이지 반영
- 이미지 파일을 에디터 영역에 드래그 → `<img>` 태그 삽입 + 이미지 표시 확인
- 새로고침(저장 안 하고) → "초안 복구" 확인 창 동작
- slug 중복으로 새 글 저장 → "409: Slug already exists" 표시

- [ ] **Step 4: 검증 + 커밋**

```bash
npm run lint && npm run build
git add components/Admin/ app/admin/
git commit -m "feat: add post editor with CodeMirror, image upload, draft backup"
```

---

### Task 9: 실시간 프리뷰 (iframe)

**Files:**
- Create: `app/admin/preview/page.tsx`, `components/Admin/EditorPreview.tsx`
- Modify: `components/Admin/PostEditor.tsx` (프리뷰 자리 교체)

**Interfaces:**
- Produces: `EditorPreview({ html }: { html: string })` — iframe으로 `/admin/preview` 로드, postMessage로 HTML 전달
- `/admin/preview` 페이지 — 실제 사이트 Tailwind CSS 파이프라인으로 빌드된 페이지에서 postMessage 수신 → `.post-body`(PostBody와 동일 클래스) div에 주입. 다크모드는 부모 창의 `html.dark` 상태를 함께 전달

- [ ] **Step 1: 프리뷰 수신 페이지** — `app/admin/preview/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import PostBody from "@/components/Blog/PostBody";

export default function PreviewPage() {
    const [html, setHtml] = useState("");

    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (typeof e.data?.html === "string") setHtml(e.data.html);
            if (typeof e.data?.dark === "boolean") {
                document.documentElement.classList.toggle("dark", e.data.dark);
            }
        };
        window.addEventListener("message", onMessage);
        window.parent.postMessage({ previewReady: true }, window.location.origin);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    return (
        <div className="grid grid-cols-12 px-5 py-6 bg-light dark:bg-dark min-h-screen">
            <PostBody html={html} />
        </div>
    );
}
```

주의: 이 페이지는 `app/admin/layout.tsx`(AuthGate) 하위 — iframe 내부에서도 로그인 상태는 공유되므로(같은 origin, Firebase persistence) 문제없다. 단 AuthGate의 로그아웃 헤더가 프리뷰에 보이면 거슬리므로, AuthGate에서 `usePathname()`으로 `/admin/preview`일 때 헤더를 숨긴다:

```tsx
// AuthGate 내부에 추가
import { usePathname } from "next/navigation";
// ...
const pathname = usePathname();
const isPreview = pathname === "/admin/preview";
// 로그인 후 렌더 부분:
return (
    <div>
        {!isPreview && (
            <div className="flex justify-end px-5 py-2 text-sm gap-4">...</div>
        )}
        {children}
    </div>
);
```

- [ ] **Step 2: EditorPreview 작성** — `components/Admin/EditorPreview.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const EditorPreview = ({ html }: { html: string }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [ready, setReady] = useState(false);
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (e.data?.previewReady) setReady(true);
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    // 300ms 디바운스로 HTML 전송
    useEffect(() => {
        if (!ready) return;
        const timer = setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage({ html, dark }, window.location.origin);
        }, 300);
        return () => clearTimeout(timer);
    }, [html, dark, ready]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-end px-3 py-1 border-b">
                <button onClick={() => setDark((d) => !d)} className="text-sm underline">
                    {dark ? "라이트 모드" : "다크 모드"}
                </button>
            </div>
            <iframe ref={iframeRef} src="/admin/preview" className="flex-1 w-full" title="preview" />
        </div>
    );
};

export default EditorPreview;
```

- [ ] **Step 3: PostEditor에 연결** — Task 8의 자리표시 div를 교체:

```tsx
import EditorPreview from "@/components/Admin/EditorPreview";
// ...
<div className="border rounded overflow-hidden">
    <EditorPreview html={content} />
</div>
```

- [ ] **Step 4: 수동 확인**

- 에디터에서 HTML 타이핑 → 0.3초 내 우측 프리뷰 갱신
- `<style>.post-body .x{color:red}</style><p class="x">test</p>` 입력 → 프리뷰에 빨간 텍스트, **에디터 페이지 자체 스타일은 오염 없음** (iframe 격리 확인)
- 프리뷰 다크 모드 토글 → 프리뷰만 다크 전환
- prose 스타일(h2 크기, 인용구 스타일)이 실제 글 페이지와 동일한지 시드 글로 비교

- [ ] **Step 5: 검증 + 커밋**

```bash
npm run lint && npm run build
git add components/Admin/ app/admin/
git commit -m "feat: add live iframe preview with dark mode toggle"
```

---

### Task 10: Contentlayer·Supabase 제거

**Files:**
- Delete: `lib/supabase/` 전체, `contentlayer.config.ts`, `components/Blog/RenderMdx.tsx`
- Modify: `package.json`, `next.config.ts`(withContentlayer 제거), `tsconfig.json`(contentlayer paths 제거), `.gitignore`(.contentlayer 항목 정리 선택)

- [ ] **Step 1: 잔여 참조 0건 확인**

```bash
grep -rn "contentlayer\|allBlogs\|supabase" app/ components/ lib/ utils/ --include="*.ts" --include="*.tsx"
```

Expected: 결과 없음 (있으면 해당 파일 먼저 전환 — 앞 태스크 누락).

- [ ] **Step 2: 파일 삭제 + config 정리**

```bash
rm -r lib/supabase
rm contentlayer.config.ts
rm components/Blog/RenderMdx.tsx
```

`next.config.ts`: `withContentlayer` import와 래핑 제거 → `export default nextConfig;`
`tsconfig.json`: `paths`의 `"contentlayer/generated"` 항목과 `include`의 `.contentlayer` 항목 제거.

- [ ] **Step 3: 의존성 제거**

```bash
npm uninstall contentlayer2 next-contentlayer2 @supabase/ssr @supabase/supabase-js reading-time rehype-autolink-headings rehype-pretty-code rehype-slug remark remark-gfm shiki
```

주의: `@supabase/*` 패키지명은 Next 16 마이그레이션 결과 기준 (`@supabase/ssr` + `@supabase/supabase-js`). `github-slugger`는 카테고리 slug화에 여전히 사용 — **제거 금지**. `fuse.js`, `date-fns` 유지.

- [ ] **Step 4: 환경변수 정리** — `.env.local`에서 `NEXT_PUBLIC_SUPABASE_*` 제거 (프로덕션 `.env`는 배포 시).

- [ ] **Step 5: 최종 검증**

```bash
npm run lint && npm run build
```

- 빌드 로그에 Contentlayer 관련 출력이 없는지 확인
- 빌드 시간/메모리 개선 기록 (PR 본문용)
- `npm run dev` → 홈/글/카테고리/검색/어드민 스모크

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "chore: remove Contentlayer and Supabase dependencies"
```

---

### Task 11: 배포 준비 (환경변수 + Dockerfile 확인)

**Files:**
- Modify: `.env.example`(있으면), `docs/ARCHITECTURE.md`(데이터 흐름 갱신), `CLAUDE.md`

- [ ] **Step 1: 프로덕션 환경변수 목록 정리** — 서버 `.env` / GitHub Actions secrets에 추가 필요:

```
NEXT_PUBLIC_API_URL=https://api.funq.kr
REVALIDATE_SECRET=<랜덤 시크릿>
NEXT_PUBLIC_REVALIDATE_SECRET=<같은 값>
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

`NEXT_PUBLIC_*`는 빌드 타임 인라인 → **GitHub Actions Docker build args에 추가 필요** (`.github/workflows/deploy.yml`의 build-args와 Dockerfile `ARG`/`ENV` 확인 — 기존 SUPABASE 변수가 어떻게 주입되는지 보고 동일 패턴 적용, SUPABASE 변수 제거).

- [ ] **Step 2: 빌드 타임 API 의존 확인** — Dockerfile 빌드 중 `generateStaticParams`가 `NEXT_PUBLIC_API_URL`(프로덕션 = https://api.funq.kr)에 접근한다. GitHub Actions 러너에서 api.funq.kr 접근 가능 (공인 도메인) — 문제없음. 로컬 Docker 빌드 검증 시에도 프로덕션 API를 바라봄에 유의.

- [ ] **Step 3: CLAUDE.md / ARCHITECTURE.md 갱신** — Content Pipeline 섹션을 API 기반 구조로 교체 (Contentlayer/Supabase 서술 제거, `/admin` 에디터·revalidate 흐름 추가).

- [ ] **Step 4: 커밋**

```bash
npm run lint && npm run build
git add -A
git commit -m "chore: deployment config and docs for API-driven content"
```

**머지는 마이그레이션 플랜(2026-07-25-content-migration.md) 완료 후** — 프로덕션 DB에 전체 글이 적재된 뒤 브랜치 최종 검증 → PR → 머지 → 자동 배포.

---

## Stopping Conditions

1. Next 16 미마이그레이션 상태로 시작하려는 경우 → STOP (선행 조건)
2. backend-api `/blog`가 미배포/미기동 → STOP
3. `generateStaticParams` fetch가 빌드에서 실패 → API 상태 확인 후 재시도, 지속 시 STOP
4. Firebase Google 로그인 팝업이 도메인 문제로 실패 → Firebase Console Authorized domains 확인, 해결 안 되면 STOP
5. iframe 프리뷰에서 사이트 CSS가 적용되지 않음 → Tailwind content 경로에 `components/Admin` 포함 여부 확인, 해결 안 되면 STOP
