# 블로그 태그 전체 표시 + 인피니티 스크롤 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 모든 블로그 글에서 전체 태그를 표시하고, 카테고리 페이지에서 인피니티 스크롤로 모든 포스팅을 볼 수 있게 한다.

**Architecture:**
1. BlogLayoutThree 컴포넌트를 수정하여 첫 번째 태그만이 아닌 모든 태그를 표시
2. 인피니티 스크롤은 Intersection Observer API를 사용하여 클라이언트 사이드에서 구현
3. 카테고리 페이지를 Client Component로 전환하여 동적 로딩 지원

**Tech Stack:** Next.js 14, React 18 (useInfiniteQuery 대신 useState + Intersection Observer), TypeScript, Tailwind CSS

---

## Task 1: TagList 컴포넌트 생성

**Files:**
- Create: `components/Elements/TagList.tsx`

**Step 1: TagList 컴포넌트 파일 생성**

```tsx
import Link from "next/link";
import { slug } from "github-slugger";

interface TagListProps {
    tags: string[];
    maxDisplay?: number;
}

const TagList = ({ tags, maxDisplay }: TagListProps) => {
    const displayTags = maxDisplay ? tags.slice(0, maxDisplay) : tags;
    const remainingCount = maxDisplay ? tags.length - maxDisplay : 0;

    return (
        <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag, index) => (
                <Link
                    key={index}
                    href={`/categories/${slug(tag)}`}
                    className="inline-block text-xs px-2 py-0.5 rounded-full bg-accent/10 dark:bg-accentDark/10 text-accent dark:text-accentDark hover:bg-accent/20 dark:hover:bg-accentDark/20 transition-colors duration-200"
                >
                    {tag}
                </Link>
            ))}
            {remainingCount > 0 && (
                <span className="inline-block text-xs px-2 py-0.5 text-gray dark:text-light/50">
                    +{remainingCount}
                </span>
            )}
        </div>
    );
};

export default TagList;
```

**Step 2: 개발 서버에서 확인**

Run: `npm run dev`
Expected: 서버가 정상적으로 시작됨

**Step 3: 커밋**

```bash
git add components/Elements/TagList.tsx
git commit -m "feat: add TagList component for displaying multiple tags"
```

---

## Task 2: BlogLayoutThree에 전체 태그 표시

**Files:**
- Modify: `components/Blog/BlogLayoutThree.tsx`

**Step 1: TagList import 및 사용**

`components/Blog/BlogLayoutThree.tsx` 파일을 다음과 같이 수정:

```tsx
import Image from "next/image";
import Link from "next/link";
import { BlogProp } from "@/types/Home";
import { format } from "date-fns";
import TagList from "@/components/Elements/TagList";

const BlogLayoutThree = ({ blog }: BlogProp) => {
    return (
        <div className="group flex flex-col items-center text-dark dark:text-light">
            <Link href={blog.url} className="h-full rounded-xl overflow-hidden">
                <Image
                    src={blog.image.filePath.replace("../public", "")}
                    placeholder="blur"
                    blurDataURL={blog.image.blurhashDataUrl}
                    alt={blog.title}
                    width={blog.image.width}
                    height={blog.image.height}
                    className="aspect-[4/3] w-full h-full object-cover object-center group-hover:scale-105 transition-all ease duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
            </Link>

            <div className="flex flex-col w-full mt-4">
                {blog.tags && blog.tags.length > 0 && (
                    <div className="mb-2">
                        <TagList tags={blog.tags} maxDisplay={3} />
                    </div>
                )}
                <Link href={blog.url} className="inline-block my-1">
                    <h2 className="font-semibold capitalize text-base sm:text-lg">
                        <span className="bg-gradient-to-r from-accent/50 to-accent/50 dark:from-accentDark/50 dark:to-accentDark/50 bg-[length:0px_3px] group-hover:bg-[length:100%_3px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500">
                            {blog.title}
                        </span>
                    </h2>
                </Link>
                <span className="inline-block w-full capitalize text-gray dark:text-light/50 font-semibold text-xs sm:text-base">
                    {format(new Date(blog.publishedAt), "MMMM dd yyyy")}
                </span>
            </div>
        </div>
    );
};

export default BlogLayoutThree;
```

**Step 2: 브라우저에서 확인**

URL: `http://localhost:3000/categories/all`
Expected: 각 블로그 카드에 최대 3개의 태그가 클릭 가능한 형태로 표시됨

**Step 3: 커밋**

```bash
git add components/Blog/BlogLayoutThree.tsx
git commit -m "feat: display all tags in BlogLayoutThree using TagList component"
```

---

## Task 3: useInfiniteScroll 커스텀 훅 생성

**Files:**
- Create: `hooks/useInfiniteScroll.ts`

**Step 1: 훅 파일 생성**

```typescript
import { useState, useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions<T> {
    items: T[];
    itemsPerPage: number;
}

interface UseInfiniteScrollReturn<T> {
    displayedItems: T[];
    hasMore: boolean;
    loadMoreRef: React.RefObject<HTMLDivElement>;
    isLoading: boolean;
}

export function useInfiniteScroll<T>({
    items,
    itemsPerPage,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
    const [displayCount, setDisplayCount] = useState(itemsPerPage);
    const [isLoading, setIsLoading] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const displayedItems = items.slice(0, displayCount);
    const hasMore = displayCount < items.length;

    const loadMore = useCallback(() => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        // 짧은 딜레이로 로딩 상태 표시 (UX 개선)
        setTimeout(() => {
            setDisplayCount((prev) => Math.min(prev + itemsPerPage, items.length));
            setIsLoading(false);
        }, 300);
    }, [isLoading, hasMore, itemsPerPage, items.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [hasMore, isLoading, loadMore]);

    // items가 변경되면 displayCount 리셋
    useEffect(() => {
        setDisplayCount(itemsPerPage);
    }, [items, itemsPerPage]);

    return {
        displayedItems,
        hasMore,
        loadMoreRef,
        isLoading,
    };
}
```

**Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 타입 에러 없음

**Step 3: 커밋**

```bash
git add hooks/useInfiniteScroll.ts
git commit -m "feat: add useInfiniteScroll custom hook with Intersection Observer"
```

---

## Task 4: 인피니티 스크롤용 BlogGrid 클라이언트 컴포넌트 생성

**Files:**
- Create: `components/Blog/BlogGridInfinite.tsx`

**Step 1: BlogGridInfinite 컴포넌트 생성**

```tsx
"use client";

import { Blog } from "contentlayer/generated";
import BlogLayoutThree from "./BlogLayoutThree";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

interface BlogGridInfiniteProps {
    blogs: Blog[];
    itemsPerPage?: number;
}

const BlogGridInfinite = ({ blogs, itemsPerPage = 9 }: BlogGridInfiniteProps) => {
    const { displayedItems, hasMore, loadMoreRef, isLoading } = useInfiniteScroll({
        items: blogs,
        itemsPerPage,
    });

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-16 mt-5 sm:mt-10 md:mt-24 sxl:mt-32 px-5 sm:px-10 md:px-24 sxl:px-32">
                {displayedItems.map((blog, index) => (
                    <article className="col-span-1 relative" key={blog._id || index}>
                        <BlogLayoutThree blog={blog} />
                    </article>
                ))}
            </div>

            {/* 로딩 인디케이터 및 Intersection Observer 타겟 */}
            <div
                ref={loadMoreRef}
                className="w-full flex justify-center py-8"
            >
                {isLoading && (
                    <div className="flex items-center gap-2 text-gray dark:text-light/50">
                        <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        <span>Loading more posts...</span>
                    </div>
                )}
                {!hasMore && displayedItems.length > 0 && (
                    <span className="text-gray dark:text-light/50 text-sm">
                        All {displayedItems.length} posts loaded
                    </span>
                )}
            </div>
        </>
    );
};

export default BlogGridInfinite;
```

**Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 타입 에러 없음

**Step 3: 커밋**

```bash
git add components/Blog/BlogGridInfinite.tsx
git commit -m "feat: add BlogGridInfinite component with infinite scroll support"
```

---

## Task 5: 카테고리 페이지에 인피니티 스크롤 적용

**Files:**
- Modify: `app/categories/[slug]/page.tsx`

**Step 1: BlogGridInfinite 사용하도록 수정**

```tsx
import BlogGridInfinite from "@/components/Blog/BlogGridInfinite";
import Categories from "@/components/Blog/Categories";
import { allBlogs } from "contentlayer/generated";
import GithubSlugger, { slug } from "github-slugger";
import { sortBlogs } from "@/utils";

const slugger = new GithubSlugger();

export async function generateStaticParams() {
    const categories: string[] = [];
    const paths = [{ slug: "all" }];

    allBlogs.forEach((blog) => {
        if (blog.isPublished) {
            blog.tags?.map((tag) => {
                const slugified = slugger.slug(tag);
                if (!categories.includes(slugified)) {
                    categories.push(slugified);
                    paths.push({ slug: slugified });
                }
            });
        }
    });

    return paths;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    return {
        title: `${params.slug} Blogs`,
        description: `${params.slug === "all" ? "AI development" : params.slug} Category`,
    };
}

const CategoryPage = ({ params }: { params: { slug: string } }) => {
    const allCategories = ["all"];

    // 먼저 모든 태그를 수집
    allBlogs.forEach((blog) => {
        if (blog.isPublished) {
            blog.tags?.forEach((tag) => {
                const slugified = slug(tag);
                if (!allCategories.includes(slugified)) {
                    allCategories.push(slugified);
                }
            });
        }
    });

    const blogs = allBlogs.filter((blog) => {
        if (params.slug === "all" && blog.isPublished) {
            return true;
        }
        return blog.tags?.some((tag) => {
            const slugified = slug(tag);
            return slugified === params.slug;
        });
    });

    // 날짜순 정렬
    const sortedBlogs = sortBlogs(blogs);

    return (
        <article className="mt-12 flex flex-col text-dark dark:text-light">
            <div className="px-5 sm:px-10 md:px-24 sxl:px-32 flex flex-col">
                <h1 className="mt-6 font-semibold text-2xl md:text-4xl lg:text-5xl">#{params.slug}</h1>
                <span className="mt-2 inline-block text-gray dark:text-light/70">
                    {sortedBlogs.length} posts found. Discover more categories and expand your knowledge!
                </span>
            </div>
            <Categories categories={allCategories} currentSlug={params.slug} />

            <BlogGridInfinite blogs={sortedBlogs} itemsPerPage={9} />
        </article>
    );
};

export default CategoryPage;
```

**Step 2: 브라우저에서 확인**

URL: `http://localhost:3000/categories/all`
Expected:
- 처음에 9개의 포스트가 표시됨
- 스크롤 시 추가 포스트가 로드됨
- 로딩 스피너가 표시됨
- 모든 포스트 로드 후 "All X posts loaded" 메시지 표시

**Step 3: 커밋**

```bash
git add app/categories/[slug]/page.tsx
git commit -m "feat: apply infinite scroll to category page"
```

---

## Task 6: 빌드 검증 및 최종 확인

**Files:**
- None (검증만)

**Step 1: 린트 실행**

Run: `npm run lint`
Expected: 에러 없음

**Step 2: 빌드 테스트**

Run: `npm run build`
Expected: 빌드 성공

**Step 3: 최종 커밋**

```bash
git add .
git commit -m "feat: complete tags display and infinite scroll implementation"
```

---

## 구현 완료 체크리스트

- [ ] TagList 컴포넌트 생성
- [ ] BlogLayoutThree에 전체 태그 표시
- [ ] useInfiniteScroll 커스텀 훅 생성
- [ ] BlogGridInfinite 컴포넌트 생성
- [ ] 카테고리 페이지에 인피니티 스크롤 적용
- [ ] 빌드 검증 완료

## 추가 개선 사항 (Optional)

1. **홈페이지 RecentPosts에도 적용**: 필요시 RecentPosts 컴포넌트에도 인피니티 스크롤 적용
2. **태그 클릭 시 애니메이션**: 태그 호버/클릭 시 부드러운 애니메이션 추가
3. **스켈레톤 로딩**: 로딩 중 스켈레톤 UI 표시
4. **URL 상태 유지**: 페이지 새로고침 시에도 스크롤 위치 유지
