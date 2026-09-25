import BlogGrid from "@/components/Blog/BlogGrid";
import Categories from "@/components/Blog/Categories";
import { getPublishedPosts, getAllPublishedPosts } from "@/lib/api/posts";
import { slug } from "github-slugger";
import { sortBlogs } from "@/utils";
import { toBlogSummary } from "@/utils/blogData";
import siteMetaData from "@/utils/siteMetaData";
import { feedPath, getPostLocale, Locale, localePath } from "@/lib/i18n";
import { notFound } from "next/navigation";

function decodeCategorySlug(categorySlug: string): string {
    try {
        return decodeURIComponent(categorySlug);
    } catch {
        notFound();
    }
}

export async function categoryStaticParams(locale: Locale) {
    const posts = await getPublishedPosts(undefined, locale);
    const categories: string[] = [];
    const paths = [{ slug: "all" }];

    posts.forEach((post) => {
        post.tags?.forEach((tag) => {
            const slugified = slug(tag);
            if (!categories.includes(slugified)) {
                categories.push(slugified);
                paths.push({ slug: slugified });
            }
        });
    });

    return paths;
}

export async function categoryMetadata(rawCategorySlug: string, locale: Locale) {
    const categorySlug = decodeCategorySlug(rawCategorySlug);
    const posts = await getAllPublishedPosts();
    const matchingPosts = posts.filter((post) => categorySlug === "all" || post.tags.some((tag) => slug(tag) === categorySlug));
    const hasPosts = matchingPosts.some((post) => getPostLocale(post.slug) === locale);
    if (!hasPosts && categorySlug !== "all") notFound();
    const path = `/categories/${categorySlug}`;
    const languages: Record<string, string> = {};
    for (const language of ["ko", "en"] as const) {
        if (matchingPosts.some((post) => getPostLocale(post.slug) === language)) {
            languages[language] = siteMetaData.siteUrl + localePath(path, language);
        }
    }
    if (languages.ko || languages.en) languages["x-default"] = languages.ko ?? languages.en;
    const categoryName = matchingPosts.flatMap((post) => post.tags).find((tag) => slug(tag) === categorySlug) ?? categorySlug;
    const title = categorySlug === "all"
        ? locale === "en" ? "All posts" : "전체 글"
        : locale === "en" ? `${categoryName} posts` : `${categoryName} 관련 글`;
    const description =
        locale === "en"
            ? categorySlug === "all" ? "All posts about AI and coding" : `Posts about ${categoryName}`
            : categorySlug === "all"
            ? "AI와 코딩에 관한 모든 블로그 글 목록"
            : `${categoryName} 관련 블로그 글 목록`;

    return {
        title,
        description,
        ...(!hasPosts ? { robots: { index: false, follow: true } } : {}),
        alternates: {
            canonical: localePath(path, locale),
            languages,
            types: { "application/rss+xml": feedPath(locale) },
        },
        twitter: {
            card: "summary_large_image" as const,
            title, description,
            images: [siteMetaData.siteUrl + siteMetaData.socialBanner],
        },
        // openGraph도 layout 값을 통째로 대체하므로 images/siteName/locale/type까지 채운다
        openGraph: {
            title: `${title} | ${siteMetaData.title}`,
            description,
            url: siteMetaData.siteUrl + localePath(path, locale),
            siteName: siteMetaData.title,
            locale: locale === "en" ? "en_US" : "ko_KR",
            type: "website",
            images: [{ url: siteMetaData.siteUrl + siteMetaData.socialBanner, width: 1200, height: 630 }],
        },
    };
}

const CategoryPage = async ({ slug: rawCategorySlug, locale }: { slug: string; locale: Locale }) => {
    const categorySlug = decodeCategorySlug(rawCategorySlug);
    const posts = await getPublishedPosts(undefined, locale);
    const allCategories = ["all"];

    // 먼저 모든 태그를 수집
    posts.forEach((post) => {
        post.tags?.forEach((tag) => {
            const slugified = slug(tag);
            if (!allCategories.includes(slugified)) {
                allCategories.push(slugified);
            }
        });
    });

    const filteredPosts = posts.filter((post) => {
        if (categorySlug === "all") {
            return true;
        }
        return post.tags?.some((tag) => {
            const slugified = slug(tag);
            return slugified === categorySlug;
        });
    });

    // 날짜순 정렬
    const sortedBlogs = sortBlogs(filteredPosts.map(toBlogSummary));
    if (!sortedBlogs.length && categorySlug !== "all") notFound();

    return (
        <article className="mt-12 flex flex-col text-dark dark:text-light">
            <div className="px-5 sm:px-10 md:px-24 sxl:px-32 flex flex-col">
                <h1 className="mt-6 font-semibold text-2xl md:text-4xl lg:text-5xl">#{categorySlug}</h1>
                <span className="mt-2 inline-block text-gray dark:text-light/70">
                    {sortedBlogs.length} posts found. Discover more categories and expand your knowledge!
                </span>
            </div>
            <Categories categories={allCategories} currentSlug={categorySlug} locale={locale} />

            <BlogGrid blogs={sortedBlogs} />
        </article>
    );
};

export default CategoryPage;
