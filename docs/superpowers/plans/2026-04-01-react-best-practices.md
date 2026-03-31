# React Best Practices Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Vercel React best practices to the blog — optimize bundle size, reduce server-to-client serialization, and fix re-render inefficiencies.

**Architecture:** Create a lightweight `BlogSummary` type that strips MDX body/toc from blog data before passing to client components. Convert heavy third-party libraries (Fuse.js, Giscus, DotLottie) to dynamic imports. Convert Footer to server component. Clean up ViewCounter and Header re-render patterns.

**Tech Stack:** Next.js 14, React 18, TypeScript, Contentlayer2, next/dynamic, Fuse.js

**Spec:** `docs/superpowers/specs/2026-04-01-react-best-practices-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `utils/blogData.ts` | BlogSummary type + toBlogSummary converter |
| Modify | `types/Home.ts` | BlogsProp/BlogProp to use BlogSummary |
| Modify | `utils/index.ts` | sortBlogs accepts BlogSummary[] |
| Modify | `app/page.tsx` | Filter + convert before passing to components |
| Modify | `app/categories/[slug]/page.tsx` | Convert after filter before passing to components |
| Modify | `components/Home/AllPostsSection.tsx` | Use BlogSummary, remove isPublished filter |
| Modify | `components/Blog/BlogGridInfinite.tsx` | Use BlogSummary type |
| Modify | `app/blogs/[slug]/page.tsx` | Pass toBlogSummary(blog) to BlogDetails |
| — | `components/Home/HomeCoverSection.tsx` | No change needed (uses BlogsProp transitively) |
| — | `components/Home/FeaturePosts.tsx` | No change needed (uses BlogsProp transitively) |
| — | `components/Blog/BlogLayoutOne.tsx` | No change needed (uses BlogProp transitively) |
| — | `components/Blog/BlogLayoutTwo.tsx` | No change needed (uses BlogProp transitively) |
| — | `components/Blog/BlogLayoutThree.tsx` | No change needed (uses BlogProp transitively) |
| Modify | `components/Blog/BlogDetails.tsx` | BlogSummary type, remove console.log, fix readingTime |
| Modify | `components/icons.tsx` | Remove unused icons |
| Modify | `components/Footer/index.tsx` | Remove "use client" |
| Modify | `components/Comments/index.tsx` | Dynamic import Giscus |
| Modify | `components/Contact/LottieAnimation.tsx` | Dynamic import DotLottie |
| Modify | `components/Search/index.tsx` | Lazy-load Fuse.js, use BlogSummary |
| Modify | `components/Blog/ViewCounter.tsx` | Consolidate useEffects |
| Modify | `components/Header/index.tsx` | Extract inline style constants |

---

### Task 1: Create BlogSummary type and toBlogSummary utility

**Files:**
- Create: `utils/blogData.ts`

- [ ] **Step 1: Create `utils/blogData.ts`**

```typescript
import { Blog } from "contentlayer/generated";

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

export function toBlogSummary(blog: Blog): BlogSummary {
    return {
        title: blog.title,
        description: blog.description,
        image: {
            filePath: blog.image.filePath,
            blurhashDataUrl: blog.image.blurhashDataUrl,
            width: blog.image.width,
            height: blog.image.height,
        },
        tags: blog.tags ?? [],
        url: blog.url,
        publishedAt: blog.publishedAt,
        updatedAt: blog.updatedAt,
        readingTime: blog.readingTime.text,
        _id: blog._id,
    };
}
```

- [ ] **Step 2: Update `types/Home.ts`**

Replace Blog imports with BlogSummary:

```typescript
import { BlogSummary } from "@/utils/blogData";

export interface BlogsProp {
    blogs: BlogSummary[];
}

export interface BlogProp {
    blog: BlogSummary;
}
```

- [ ] **Step 3: Update `utils/index.ts` — make sortBlogs generic**

```typescript
import { compareDesc, parseISO } from "date-fns";

export const cx = (...classNames: (string | undefined)[]) => classNames.filter(Boolean).join(" ");

export const sortBlogs = <T extends { publishedAt: string }>(blogs: T[]): T[] => {
    return blogs.slice().sort((a, b) => compareDesc(parseISO(a.publishedAt), parseISO(b.publishedAt)));
};
```

Remove the `Blog` import and `format` import (unused after this change).

- [ ] **Step 4: Run lint**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add utils/blogData.ts types/Home.ts utils/index.ts
git commit -m "feat: add BlogSummary type and generic sortBlogs"
```

---

### Task 2: Apply BlogSummary to data flow

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/categories/[slug]/page.tsx`
- Modify: `app/blogs/[slug]/page.tsx`
- Modify: `components/Home/AllPostsSection.tsx`
- Modify: `components/Blog/BlogGridInfinite.tsx`
- Modify: `components/Blog/BlogDetails.tsx`
- No change: `HomeCoverSection`, `FeaturePosts`, `BlogLayoutOne/Two/Three` (use BlogsProp/BlogProp transitively)

- [ ] **Step 1: Update `app/page.tsx`**

Filter published blogs and convert to summaries at the server level:

```typescript
import HomeCoverSection from "@/components/Home/HomeCoverSection";
import FeaturePosts from "@/components/Home/FeaturePosts";
import { allBlogs } from "contentlayer/generated";
import AllPostsSection from "@/components/Home/AllPostsSection";
import { toBlogSummary } from "@/utils/blogData";

export default function Home() {
    const blogs = allBlogs.filter((blog) => blog.isPublished).map(toBlogSummary);
    return (
        <main className="flex flex-col items-center justify-center">
            <HomeCoverSection blogs={blogs} />
            <FeaturePosts blogs={blogs} />
            <AllPostsSection blogs={blogs} />
        </main>
    );
}
```

Remove commented-out old code at the bottom of the file (lines 16-42).

- [ ] **Step 2: Update `app/categories/[slug]/page.tsx`**

Add `toBlogSummary` conversion after filtering, before passing to `BlogGridInfinite`:

```typescript
import { toBlogSummary } from "@/utils/blogData";
// ... existing imports ...

const CategoryPage = ({ params }: { params: { slug: string } }) => {
    // ... existing allCategories logic (lines 36-48) stays the same ...

    const blogs = allBlogs.filter((blog) => {
        // ... existing filter logic (lines 50-60) stays the same ...
    });

    const sortedBlogs = sortBlogs(blogs.map(toBlogSummary));

    return (
        // ... same JSX, sortedBlogs is now BlogSummary[] ...
    );
};
```

Note: `generateStaticParams()` and `generateMetadata()` use `allBlogs` directly and don't pass data to client components — no changes needed there.

- [ ] **Step 3: Update `AllPostsSection.tsx`**

Remove `isPublished` filter (now done in `app/page.tsx`), update type:

```typescript
"use client";

import { BlogSummary } from "@/utils/blogData";
import { sortBlogs } from "@/utils";
import BlogGridInfinite from "@/components/Blog/BlogGridInfinite";

interface AllPostsSectionProps {
    blogs: BlogSummary[];
}

const AllPostsSection = ({ blogs }: AllPostsSectionProps) => {
    const sortedBlogs = sortBlogs(blogs);

    return (
        <section className="w-full mt-16 sm:mt-24 md:mt-32 flex flex-col items-center justify-center">
            <div className="w-full px-5 sm:px-10 md:px-24 sxl:px-32 flex justify-between">
                <h2 className="w-fit inline-block font-bold capitalize text-2xl md:text-4xl text-dark dark:text-light">
                    All Posts
                </h2>
                <span className="text-gray dark:text-light/70 text-base sm:text-lg">
                    {sortedBlogs.length} posts
                </span>
            </div>
            <BlogGridInfinite blogs={sortedBlogs} itemsPerPage={9} />
        </section>
    );
};

export default AllPostsSection;
```

- [ ] **Step 4: Update `BlogGridInfinite.tsx`**

Replace `Blog` import with `BlogSummary`:

```typescript
"use client";

import { BlogSummary } from "@/utils/blogData";
import BlogLayoutThree from "./BlogLayoutThree";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

interface BlogGridInfiniteProps {
    blogs: BlogSummary[];
    itemsPerPage?: number;
}

const BlogGridInfinite = ({ blogs, itemsPerPage = 9 }: BlogGridInfiniteProps) => {
    // ... rest unchanged ...
};
```

- [ ] **Step 5: Update BlogLayout components**

**`BlogLayoutOne.tsx`** — No code changes needed. Already uses `BlogProp` from `types/Home.ts` which is now `BlogSummary`. All accessed fields (`image.filePath`, `image.blurhashDataUrl`, `image.width`, `image.height`, `title`, `tags`, `url`) exist on `BlogSummary`.

**`BlogLayoutTwo.tsx`** — Same as above. All accessed fields exist on `BlogSummary`.

**`BlogLayoutThree.tsx`** — Same as above. All accessed fields exist on `BlogSummary`.

No file changes needed for these three — they already use `BlogProp` from `types/Home.ts`.

- [ ] **Step 6: Update `BlogDetails.tsx`**

Replace `any` with `BlogSummary`, remove `console.log`, fix `readingTime` access:

```typescript
import { format, parseISO } from "date-fns";
import Link from "next/link";
import React from "react";
import { slug } from "github-slugger";
import ViewCounter from "./ViewCounter";
import { BlogSummary } from "@/utils/blogData";

const BlogDetails = ({ blog, slug: blogSlug }: { blog: BlogSummary; slug: string }) => {
    return (
        <div className="px-2 md:px-10 bg-accent dark:bg-accentDark text-light dark:text-dark py-2 flex items-center justify-around flex-wrap text-lg sm:text-xl font-medium mx-5 md:mx-10 rounded-lg">
            <time className="m-3">{format(parseISO(blog.publishedAt), "LLLL d, yyyy")}</time>
            <span className="m-3">
                <ViewCounter slug={blogSlug} /> views
            </span>
            <div className="m-3">{blog.readingTime}</div>
            <Link href={`/categories/${blog.tags[0] ? slug(blog.tags[0]) : "uncategorized"}`} className="m-3">
                #{blog.tags[0] ? slug(blog.tags[0]) : "uncategorized"}
            </Link>
        </div>
    );
};

export default BlogDetails;
```

Changes: removed `console.log(blog)`, `blog: any` → `blog: BlogSummary`, `blog.readingTime.text` → `blog.readingTime`.

**Important**: `BlogDetails` is used in `app/blogs/[slug]/page.tsx` which uses the full `Blog` object from Contentlayer. That caller must also pass `toBlogSummary(blog)` instead of `blog` directly. Read `app/blogs/[slug]/page.tsx` to find the BlogDetails usage and update it.

- [ ] **Step 7: Update `app/blogs/[slug]/page.tsx` BlogDetails call**

Find the `<BlogDetails blog={blog} slug={slug} />` line and change to:

```tsx
<BlogDetails blog={toBlogSummary(blog)} slug={slug} />
```

Add import: `import { toBlogSummary } from "@/utils/blogData";`

- [ ] **Step 8: Run lint**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx app/categories/[slug]/page.tsx app/blogs/[slug]/page.tsx components/Home/AllPostsSection.tsx components/Blog/BlogGridInfinite.tsx components/Blog/BlogDetails.tsx
git commit -m "refactor: apply BlogSummary to reduce client serialization"
```

---

### Task 3: Bundle — Remove unused icons

**Files:**
- Modify: `components/icons.tsx`

- [ ] **Step 1: Delete unused icon exports**

Remove these three exported components from `components/icons.tsx`:
- `SunIcon3` (lines 72-83)
- `TwitterIcon` (lines 282-306)
- `DribbbleIcon` (lines 341-368)

Keep all other exports intact.

- [ ] **Step 2: Run lint**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/icons.tsx
git commit -m "refactor: remove unused icon exports (TwitterIcon, DribbbleIcon, SunIcon3)"
```

---

### Task 4: Bundle — Footer server component + Dynamic imports

**Files:**
- Modify: `components/Footer/index.tsx`
- Modify: `components/Comments/index.tsx`
- Modify: `components/Contact/LottieAnimation.tsx`

- [ ] **Step 1: Remove "use client" from Footer**

Delete line 1 (`"use client";`) from `components/Footer/index.tsx`. The component has no hooks, state, or event handlers.

- [ ] **Step 2: Dynamic import Giscus in Comments**

Replace `components/Comments/index.tsx`:

```typescript
"use client";

import dynamic from "next/dynamic";
import useThemeSwitch from "@/components/Hook/useThemeSwitch";

const Giscus = dynamic(() => import("@giscus/react").then((mod) => mod.default), {
    loading: () => <div className="h-48 animate-pulse bg-gray/10 rounded-lg" />,
});

interface CommentsProps {
    slug: string;
}

export default function Comments({ slug }: CommentsProps) {
    const { theme, mounted } = useThemeSwitch();

    if (!mounted) {
        return null;
    }

    const giscusTheme = theme === "dark" ? "dark" : "light";

    return (
        <div className="mt-16 mb-8">
            <div className="border-t border-gray/30 pt-8">
                <h2 className="text-2xl font-bold mb-8 text-dark dark:text-light">댓글</h2>
                <Giscus
                    id="comments"
                    repo="nasodev/blog-nextjs-comments"
                    repoId="R_kgDOQWjVAA"
                    category="Announcements"
                    categoryId="DIC_kwDOQWjVAM4Cx1qT"
                    mapping="pathname"
                    strict="0"
                    reactionsEnabled="1"
                    emitMetadata="0"
                    inputPosition="bottom"
                    theme={giscusTheme}
                    lang="ko"
                    loading="lazy"
                />
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Dynamic import DotLottie in LottieAnimation**

Replace `components/Contact/LottieAnimation.tsx`:

```typescript
"use client";

import dynamic from "next/dynamic";
import "@dotlottie/react-player/dist/index.css";

const DotLottiePlayer = dynamic(
    () => import("@dotlottie/react-player").then((mod) => mod.DotLottiePlayer),
    { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray/10 rounded-lg" /> }
);

const LottieAnimation = () => {
    return <DotLottiePlayer src="/Animation-1736665363457.lottie" autoplay loop />;
};

export default LottieAnimation;
```

Note: CSS import is retained because dynamic JS import does not auto-load CSS side effects.

- [ ] **Step 4: Run lint**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/Footer/index.tsx components/Comments/index.tsx components/Contact/LottieAnimation.tsx
git commit -m "perf: Footer to server component, dynamic import Giscus and DotLottie"
```

---

### Task 5: Bundle — Lazy-load Fuse.js in Search

**Files:**
- Modify: `components/Search/index.tsx`

This is the most complex change. The current code creates a `Fuse` instance at module scope (line 21-24). We need to:
1. Remove static `import Fuse` and module-scope instance
2. Store the Fuse instance in a `useRef`
3. Dynamically import and instantiate on first modal open
4. Update `handleSearch` to use the ref
5. Update types from `Blog` to `BlogSummary`

- [ ] **Step 1: Rewrite Search component**

Replace the top section of `components/Search/index.tsx` (lines 1-58). The component keeps its existing signature (`forwardRef<SearchHandle>`) — no props change, no Header changes needed.

**Approach**: Blog data is converted to `BlogSummary[]` at module scope (runs once). Fuse.js is dynamically imported on first modal open and stored in a `useRef`.

Replace lines 1-58 with:

```typescript
"use client";

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";
import type Fuse from "fuse.js";
import Link from "next/link";
import Image from "next/image";
import { allBlogs } from "contentlayer/generated";
import { BlogSummary, toBlogSummary } from "@/utils/blogData";
import { SearchIcon } from "@/components/icons";

export interface SearchHandle {
    close: () => void;
}

const fuseOptions = {
    keys: ["title", "description", "tags"],
    threshold: 0.3,
    includeScore: true,
};

const searchBlogs = allBlogs.filter((b) => b.isPublished).map(toBlogSummary);

interface SearchResult {
    item: BlogSummary;
    score?: number;
}

const Search = forwardRef<SearchHandle>((_, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const fuseRef = useRef<Fuse<BlogSummary> | null>(null);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setQuery("");
        setResults([]);
        setSelectedIndex(0);
    }, []);

    useImperativeHandle(ref, () => ({
        close: closeModal
    }), [closeModal]);

    const handleSearch = useCallback((searchQuery: string) => {
        setQuery(searchQuery);
        setSelectedIndex(0);
        if (searchQuery.trim() === "") {
            setResults([]);
            return;
        }
        const searchResults = fuseRef.current?.search(searchQuery) ?? [];
        setResults(searchResults.slice(0, 6));
    }, []);

    const openModal = useCallback(async () => {
        setIsOpen(true);
        if (!fuseRef.current) {
            const FuseModule = (await import("fuse.js")).default;
            fuseRef.current = new FuseModule(searchBlogs, fuseOptions);
        }
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);
```

**Keep lines 65-235 unchanged** (the two `useEffect` hooks for keydown/overflow, and the full JSX return). The only type change is that `SearchResult.item` is now `BlogSummary` instead of `Blog` — all accessed fields (`_id`, `url`, `image.filePath`, `title`, `description`) exist on both types, so the JSX compiles without changes.

Key changes summary:
- `import Fuse from "fuse.js"` → `import type Fuse from "fuse.js"` (type-only, zero runtime bundle)
- Module-scope `const fuse = new Fuse(allBlogs.filter(...), ...)` → `const searchBlogs = allBlogs.filter(...).map(toBlogSummary)` (data only, no Fuse)
- Added `fuseRef = useRef<Fuse<BlogSummary> | null>(null)`
- `openModal` is now async — dynamically imports Fuse.js and instantiates on first use
- `handleSearch` uses `fuseRef.current?.search()` instead of module-scope `fuse.search()`
- Header component: **no changes** — Search keeps the same `forwardRef<SearchHandle>` signature

- [ ] **Step 3: Run lint**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/Search/index.tsx
git commit -m "perf: lazy-load Fuse.js on search modal open"
```

---

### Task 6: Re-render — ViewCounter + Header + BlogDetails cleanup

**Files:**
- Modify: `components/Blog/ViewCounter.tsx`
- Modify: `components/Header/index.tsx`

- [ ] **Step 1: Consolidate ViewCounter useEffects**

Replace `components/Blog/ViewCounter.tsx`:

```typescript
"use client";

import React, { useEffect, useState, useRef } from "react";
import { incrementViewCount, getViewCount } from "@/lib/supabase/api/views";

interface ViewCounterProps {
    slug: string;
    noCount?: boolean;
    showCount?: boolean;
}

const ViewCounter: React.FC<ViewCounterProps> = ({ slug, noCount = false, showCount = true }) => {
    const [views, setViews] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const hasIncrementedRef = useRef(false);

    useEffect(() => {
        const handleViews = async () => {
            try {
                if (!noCount && !hasIncrementedRef.current) {
                    await incrementViewCount(slug);
                    hasIncrementedRef.current = true;
                }
                const count = await getViewCount(slug);
                setViews(count);
            } catch (err) {
                setError("조회수를 가져오는 중 오류가 발생했습니다.");
                console.error(err);
            }
        };

        handleViews();
    }, [slug, noCount]);

    if (!showCount) return null;
    if (error) return <div className="text-red-500 text-sm">{error}</div>;

    return <div>{views} views</div>;
};

export default ViewCounter;
```

Changes: Two `useEffect` → one. Increment first (if needed), then fetch count.

- [ ] **Step 2: Extract Header inline style constants**

Add these constants before the `Header` component in `components/Header/index.tsx`:

```typescript
const HAMBURGER_TOP_OPEN = { transform: "rotate(-45deg) translateY(0)" } as const;
const HAMBURGER_TOP_CLOSED = { transform: "rotate(0deg) translateY(6px)" } as const;
const HAMBURGER_MID_OPEN = { opacity: 0 } as const;
const HAMBURGER_MID_CLOSED = { opacity: 1 } as const;
const HAMBURGER_BOT_OPEN = { transform: "rotate(45deg) translateY(0)" } as const;
const HAMBURGER_BOT_CLOSED = { transform: "rotate(0deg) translateY(-6px)" } as const;
```

Then replace the inline `style={{...}}` objects on lines 34-35, 42-44, 50-52:

```tsx
<span ... style={isMenuOpen ? HAMBURGER_TOP_OPEN : HAMBURGER_TOP_CLOSED}>&nbsp;</span>
<span ... style={isMenuOpen ? HAMBURGER_MID_OPEN : HAMBURGER_MID_CLOSED}>&nbsp;</span>
<span ... style={isMenuOpen ? HAMBURGER_BOT_OPEN : HAMBURGER_BOT_CLOSED}>&nbsp;</span>
```

- [ ] **Step 3: Run lint**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/Blog/ViewCounter.tsx components/Header/index.tsx
git commit -m "refactor: consolidate ViewCounter effects, extract Header style constants"
```

---

### Task 7: Verification

- [ ] **Step 1: Run lint**

Run: `npx next lint`
Expected: No errors or warnings

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build completes successfully with all pages statically generated

- [ ] **Step 3: Start dev server and manually verify**

Run: `npm run dev -- -p 23001`

Verify these pages:
- `http://localhost:23001/` — Home: cover section, featured posts, all posts with infinite scroll
- `http://localhost:23001/blogs/<any-slug>` — Blog detail: metadata bar (date, views, reading time, tag), comments section loads
- `http://localhost:23001/categories/all` — Categories: grid loads, infinite scroll works
- `http://localhost:23001/contact` — Contact: Lottie animation loads, form works
- Search: Cmd+K opens modal, search returns results, keyboard navigation works
- Dark mode toggle: theme switches without flash

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during verification"
```
