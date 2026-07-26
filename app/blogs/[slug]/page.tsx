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
