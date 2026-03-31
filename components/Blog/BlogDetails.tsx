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
