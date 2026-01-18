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
