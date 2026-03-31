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
