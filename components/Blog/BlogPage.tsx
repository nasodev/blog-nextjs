import BlogDetails from "@/components/Blog/BlogDetails";
import BlogLayoutThree from "@/components/Blog/BlogLayoutThree";
import PostBody from "@/components/Blog/PostBody";
import SharePost from "@/components/Blog/SharePost";
import Tag from "@/components/Elements/tag";
import TagList from "@/components/Elements/TagList";
import Comments from "@/components/Comments";
import { slug as slugify } from "github-slugger";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import siteMetaData from "@/utils/siteMetaData";
import { sortBlogs } from "@/utils";
import { getPost, getPublishedPosts, getAllPublishedPosts, resolveImageUrl } from "@/lib/api/posts";
import { toBlogSummary } from "@/utils/blogData";
import { getPostLocale, getSourceSlug, Locale, localePath, postAlternates, postPath } from "@/lib/i18n";

export async function blogStaticParams(locale: Locale) {
    const posts = await getPublishedPosts(undefined, locale);
    return posts.map((post) => ({ slug: getSourceSlug(post.slug) }));
}

export async function blogMetadata(slug: string, locale: Locale) {
    const [post, posts] = await Promise.all([getPost(slug, locale), getAllPublishedPosts()]);
    if (!post) notFound();

    const imageUrl = resolveImageUrl(post.cover_image_url);
    const ogImage = [
        {
            url: imageUrl.startsWith("http") ? imageUrl : siteMetaData.siteUrl + imageUrl,
            width: 1200,
            height: 630,
        },
    ];

    return {
        title: post.title,
        description: post.description,
        alternates: postAlternates(post, posts),
        openGraph: {
            title: post.title,
            description: post.description,
            url: siteMetaData.siteUrl + postPath(post.slug),
            siteName: siteMetaData.title,
            locale: locale === "en" ? "en_US" : "ko_KR",
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

export default async function BlogPage({ slug, locale }: { slug: string; locale: Locale }) {
    const [post, allPosts] = await Promise.all([getPost(slug, locale), getAllPublishedPosts()]);
    if (!post) notFound();

    // 내부 링크(이전/다음 글, 관련 글) — 목록은 "posts" 태그 캐시를 재사용하므로 추가 API 부담 없음
    const sortedBlogs = sortBlogs(allPosts.filter((item) => getPostLocale(item.slug) === locale).map(toBlogSummary));
    const currentIndex = sortedBlogs.findIndex((blog) => blog.slug === post.slug);
    const newerPost = currentIndex > 0 ? sortedBlogs[currentIndex - 1] : null;
    const olderPost = currentIndex >= 0 && currentIndex < sortedBlogs.length - 1 ? sortedBlogs[currentIndex + 1] : null;

    const tagSlugs = new Set(post.tags.map((tag) => slugify(tag)));
    const scoredBySharedTags = sortedBlogs
        .filter((blog) => blog.slug !== post.slug)
        .map((blog) => ({ blog, score: blog.tags.filter((tag) => tagSlugs.has(slugify(tag))).length }))
        .sort((a, b) => b.score - a.score);
    const relatedBlogs = (
        scoredBySharedTags[0]?.score
            ? scoredBySharedTags.filter(({ score }) => score > 0)
            : scoredBySharedTags
    )
        .slice(0, 3)
        .map(({ blog }) => blog);

    const imageUrl = resolveImageUrl(post.cover_image_url);
    const postUrl = siteMetaData.siteUrl + postPath(post.slug);
    const alternateLocale = locale === "en" ? "ko" : "en";
    const alternateUrl = postAlternates(post, allPosts).languages[alternateLocale];
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        image: [imageUrl.startsWith("http") ? imageUrl : siteMetaData.siteUrl + imageUrl],
        datePublished: new Date(post.published_at).toISOString(),
        dateModified: new Date(post.updated_at).toISOString(),
        url: postUrl,
        mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
        author: { "@type": "Person", name: post.author, url: `${siteMetaData.siteUrl}/about` },
        publisher: {
            "@type": "Organization",
            name: siteMetaData.title,
            logo: { "@type": "ImageObject", url: siteMetaData.siteUrl + siteMetaData.siteLogo },
        },
        inLanguage: locale === "en" ? "en" : "ko-KR",
        keywords: post.tags.join(", "),
    };
    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteMetaData.siteUrl + localePath("/", locale) },
            {
                "@type": "ListItem",
                position: 2,
                name: post.tags[0] ?? "uncategorized",
                item: siteMetaData.siteUrl + localePath(`/categories/${post.tags[0] ? slugify(post.tags[0]) : "all"}`, locale),
            },
            { "@type": "ListItem", position: 3, name: post.title },
        ],
    };

    return (
        <section>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />
            <article>
                <div className="mb-8 text-center relative w-full h-[70vh] bg-dark">
                    <div className="w-full z-10 flex flex-col items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Tag
                            name={post.tags[0] ? slugify(post.tags[0]) : "uncategorized"}
                            link={localePath(`/categories/${post.tags[0] ? slugify(post.tags[0]) : "all"}`, locale)}
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
                <BlogDetails blog={toBlogSummary(post)} slug={post.slug} />
                {alternateUrl && (
                    <nav aria-label={locale === "en" ? "Article language" : "글 언어"} className="mx-5 md:mx-10 mt-4 text-right">
                        <Link href={localePath(`/blogs/${slug}`, alternateLocale)} hrefLang={alternateLocale} lang={alternateLocale} className="underline text-accent dark:text-accentDark">
                            {locale === "en" ? "한국어로 읽기" : "Read in English"}
                        </Link>
                    </nav>
                )}
                {post.tags.length > 1 && (
                    <div className="mx-5 md:mx-10 mt-4">
                        <TagList tags={post.tags} locale={locale} />
                    </div>
                )}
                <div className="grid grid-cols-12 gap-y-8 lg:gap-8 sxl:gap-16 mt-8 px-5 md:px-10">
                    <div className="col-span-12 md:col-span-3">
                        <details className="border-[1px] border-solid border-dark dark:border-light text-dark dark:text-light rounded-lg p-4 sticky top-6 max-h-[80vh] overflow-hidden overflow-y-auto">
                            <summary className="text-lg font-semibold capitalize cursor-pointer">
                                {locale === "en" ? "Table of Contents" : "목차"}
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
                                                <span className="flex w-1 h-1 rounded-full bg-dark mr-2">&nbsp;</span>
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
                <SharePost url={postUrl} locale={locale} />
                {(olderPost || newerPost) && (
                    <nav aria-label={locale === "en" ? "Previous and next posts" : "이전/다음 글"} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 px-5 md:px-10">
                        {olderPost ? (
                            <Link
                                href={olderPost.url}
                                className="group flex flex-col p-4 border border-solid border-dark/20 dark:border-light/20 rounded-lg hover:border-accent dark:hover:border-accentDark transition-colors"
                            >
                                <span className="text-sm text-gray dark:text-light/50">← {locale === "en" ? "Older post" : "이전 글"}</span>
                                <span className="mt-1 font-semibold text-dark dark:text-light group-hover:text-accent dark:group-hover:text-accentDark">
                                    {olderPost.title}
                                </span>
                            </Link>
                        ) : (
                            <span />
                        )}
                        {newerPost && (
                            <Link
                                href={newerPost.url}
                                className="group flex flex-col p-4 text-right border border-solid border-dark/20 dark:border-light/20 rounded-lg hover:border-accent dark:hover:border-accentDark transition-colors"
                            >
                                <span className="text-sm text-gray dark:text-light/50">{locale === "en" ? "Newer post" : "다음 글"} →</span>
                                <span className="mt-1 font-semibold text-dark dark:text-light group-hover:text-accent dark:group-hover:text-accentDark">
                                    {newerPost.title}
                                </span>
                            </Link>
                        )}
                    </nav>
                )}
                {relatedBlogs.length > 0 && (
                    <section className="mt-16 px-5 md:px-10">
                        <h2 className="font-semibold text-2xl md:text-3xl text-dark dark:text-light">{locale === "en" ? "Related posts" : "관련 글"}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-16 mt-8">
                            {relatedBlogs.map((blog) => (
                                <article key={blog.slug} className="col-span-1 relative">
                                    <BlogLayoutThree blog={blog} />
                                </article>
                            ))}
                        </div>
                    </section>
                )}
                <div className="px-5 md:px-10">
                    <Comments key={post.slug} slug={post.slug} locale={locale} />
                </div>
            </article>
        </section>
    );
}
