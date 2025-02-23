import BlogDetails from "@/components/Blog/BlogDetails";
import RenderMdx from "@/components/Blog/RenderMdx";
import Tag from "@/components/Elements/tag";
import { allBlogs } from "contentlayer/generated";
import { slug } from "github-slugger";
import Image from "next/image";
import siteMetaData from "@/utils/siteMetaData";

export async function generateStaticParams() {
    return allBlogs.map((blog) => ({ slug: blog._raw.flattenedPath }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const blog = allBlogs.find((blog) => blog._raw.flattenedPath === params.slug);

    if (!blog) {
        return {
            title: "Blog Not Found",
            description: "Blog not found",
        };
    }

    const publishedTime = new Date(blog.publishedAt).toISOString();
    const modifiedTime = new Date(blog.updatedAt).toISOString();

    let imageList = [siteMetaData.socialBanner];

    if (blog.image) {
        imageList =
            typeof blog.image.filePath === "string"
                ? [siteMetaData.siteUrl + blog.image.filePath.replace("../public", "")]
                : [blog.image.filePath]; // ImageFieldData를 string 배열로 변환
    }

    const ogImage = imageList.map((image) => {
        return {
            url: image.includes("http") ? image : siteMetaData.siteUrl + image,
        };
    });

    const authors = blog?.author ? [blog.author] : siteMetaData.author;

    return {
        title: `${blog?.title}`,

        description: blog?.description,
        openGraph: {
            title: blog?.title,
            description: blog?.description,
            url: siteMetaData.siteUrl + blog.url,
            siteName: siteMetaData.title,
            locale: siteMetaData.locale,
            type: "article",
            publishedTime: publishedTime,
            modifiedTime: modifiedTime,
            images: ogImage,
            authors: authors.length > 0 ? authors : [siteMetaData.author],
        },
        twitter: {
            card: "summary_large_image",
            title: blog?.title,
            description: blog?.description,
            images: ogImage,
        },
    };
}

export default function BlogPage({ params }: { params: { slug: string } }) {
    const blog = allBlogs.find((blog) => blog._raw.flattenedPath === params.slug);

    if (!blog) {
        return <div>블로그 게시물을 찾을 수 없습니다.</div>;
    }

    const publishedTime = new Date(blog.publishedAt).toISOString();
    const modifiedTime = new Date(blog.updatedAt).toISOString();
    const authors = blog?.author ? [blog.author] : siteMetaData.author;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: blog?.title,
        description: blog?.description,
        image: blog.image
            ? [siteMetaData.siteUrl + blog.image.filePath.replace("../public", "")]
            : [siteMetaData.socialBanner],
        datePublished: publishedTime,
        dateModified: modifiedTime,
        author: [
            {
                "@type": "Person",
                name: authors,
                url: siteMetaData.siteUrl + blog.url,
            },
        ],
    };

    return (
        <section>
            {/* Add JSON-LD to your page */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <article>
                <div className="mb-8 text-center relative w-full h-[70vh] bg-dark">
                    <div className="w-full z-10 flex flex-col items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Tag
                            name={blog.tags?.[0] ? slug(blog.tags[0]) : "uncategorized"}
                            link={`/categories/${blog.tags?.[0] ? slug(blog.tags[0]) : "uncategorized"}`}
                            className="px-6 text-sm py-2"
                        />
                        <h1 className="inline-block mt-6 font-semibold capitalize text-light text-2xl md:text-3xl lg:text-5xl leading-normal relative w-5/6">
                            {blog?.title}
                        </h1>
                    </div>
                    <div className="absolute top-0 left-0 right-0 bottom-0 h-full bg-dark/60 dark:bg-dark/40" />
                    <Image
                        src={blog.image.filePath.replace("../public", "")}
                        placeholder="blur"
                        blurDataURL={blog.image.blurhashDataUrl}
                        alt={blog.title}
                        width={blog.image.width}
                        height={blog.image.height}
                        className="aspect-square w-full h-full object-cover object-center"
                        priority
                        sizes="100vw"
                    />
                </div>
                <BlogDetails blog={blog} slug={params.slug} />
                <div className="grid grid-cols-12 gap-y-8 lg:gap-8 sxl:gap-16 mt-8 px-5 md:px-10">
                    <div className="col-span-12 md:col-span-3">
                        <details className="border-[1px] border-solid border-dark dark:border-light text-dark dark:text-light rounded-lg p-4 sticky top-6 max-h-[80vh] overflow-hidden overflow-y-auto">
                            <summary className="text-lg font-semibold capitalize cursor-pointer">
                                Table of Contents
                            </summary>
                            <ul className="mt-4 font-in text-base">
                                {blog.toc.map((heading: any) => {
                                    return (
                                        <li key={heading.slug} className="py-1">
                                            <a
                                                href={`#${heading.slug}`}
                                                data-level={heading.level}
                                                className="data-[level=two]:pl-0 data-[level=two]:pt-2 data-[level=two]:border-t border-solid border-dark/40
                                        data-[level=three]:pl-4 sm:data-[level=three]:pl-6
                                        flex items-center justify-start"
                                            >
                                                {heading.level == "three" ? (
                                                    <span className="flex w-1 h-1 rouned-full bg-dark mr-2">
                                                        &nbsp;
                                                    </span>
                                                ) : null}
                                                <span className="hover:underline">{heading.text}</span>
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </details>
                    </div>
                    <RenderMdx blog={blog} />
                </div>
            </article>
        </section>
    );
}
