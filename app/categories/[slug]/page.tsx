import BlogGridInfinite from "@/components/Blog/BlogGridInfinite";
import Categories from "@/components/Blog/Categories";
import { allBlogs } from "contentlayer/generated";
import GithubSlugger, { slug } from "github-slugger";
import { sortBlogs } from "@/utils";
import { toBlogSummary } from "@/utils/blogData";
import siteMetaData from "@/utils/siteMetaData";

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const title = `${slug} Blogs`;
    const description =
        slug === "all"
            ? "AI와 코딩에 관한 모든 블로그 글 목록"
            : `${slug} 관련 블로그 글 목록`;

    return {
        title,
        description,
        alternates: {
            canonical: `/categories/${slug}`,
        },
        openGraph: {
            title: `${title} | ${siteMetaData.title}`,
            description,
            url: `${siteMetaData.siteUrl}/categories/${slug}`,
        },
    };
}

const CategoryPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const { slug: categorySlug } = await params;
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
        if (!blog.isPublished) return false;

        if (categorySlug === "all") {
            return true;
        }
        return blog.tags?.some((tag) => {
            const slugified = slug(tag);
            return slugified === categorySlug;
        });
    });

    // 날짜순 정렬
    const sortedBlogs = sortBlogs(blogs.map(toBlogSummary));

    return (
        <article className="mt-12 flex flex-col text-dark dark:text-light">
            <div className="px-5 sm:px-10 md:px-24 sxl:px-32 flex flex-col">
                <h1 className="mt-6 font-semibold text-2xl md:text-4xl lg:text-5xl">#{categorySlug}</h1>
                <span className="mt-2 inline-block text-gray dark:text-light/70">
                    {sortedBlogs.length} posts found. Discover more categories and expand your knowledge!
                </span>
            </div>
            <Categories categories={allCategories} currentSlug={categorySlug} />

            <BlogGridInfinite blogs={sortedBlogs} itemsPerPage={9} />
        </article>
    );
};

export default CategoryPage;
