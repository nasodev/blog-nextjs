import { BlogsProp } from "@/types/Home";
import { sortBlogs } from "@/utils";
import Link from "next/link";
import BlogLayoutThree from "../Blog/BlogLayoutThree";

const RecentPosts = ({ blogs }: BlogsProp) => {
    const sortedBlogs = sortBlogs(blogs);
    return (
        <section className="w-full t-16 sm:mt-24 md:mt-32 px-5 sm:px-10 md:px-24 sxl:px-32 flex flex-col items-center justify-center">
            <div className="w-full flex justify-between">
                <h2 className="w-fit inline-block font-bold capitalize text-2xl md:text-4xl text-dark dark:text-light">
                    Recent Posts
                </h2>
                <Link
                    href={"/categories/all"}
                    className="inline-block font-medium text-accent dark:text-accentDark underline underline-offset-2 text-base sm:text-lg"
                >
                    view all
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-16 mt-16">
                {sortedBlogs.slice(1, 10).map((blog, index) => {
                    return (
                        <article key={index} className="col-span-1 row-span-1 relative">
                            <BlogLayoutThree blog={blog} />
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default RecentPosts;
