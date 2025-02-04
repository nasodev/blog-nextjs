import BlogLayoutThree from "@/components/Blog/BlogLayoutThree";
import Categories from "@/components/Blog/Categories";
import { allBlogs } from "contentlayer/generated";
import GithubSlugger, { slug } from "github-slugger";

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

    return (
        <article className="mt-12 flex flex-col text-dark">
            <div className="px-5 sm:px-10 md:px-24 sxl:px-32 flex flex-col">
                <h1 className="mt-6 font-semibold text-2xl md:text-4xl lg:text-5xl">#{params.slug}</h1>
                <span className="mt-2 inline-block">Discover more categories and expand your knowledge!</span>
            </div>
            <Categories categories={allCategories} currentSlug={params.slug} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-16 mt-5 sm:mt-10 md:mt-24 sxl:mt-32 px-5 sm:px-10 md:px-24 sxl:px-32">
                {blogs.map((blog, index) => (
                    <article className="col-span-1 row-span-1 relative" key={index}>
                        <BlogLayoutThree blog={blog} />
                    </article>
                ))}
            </div>
        </article>
    );
};

export default CategoryPage;
