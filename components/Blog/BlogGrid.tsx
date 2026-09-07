import { BlogSummary } from "@/utils/blogData";
import BlogLayoutThree from "./BlogLayoutThree";

// ponytail: all links remain in server HTML; add linked pagination when the catalogue outgrows one page.
const BlogGrid = ({ blogs }: { blogs: BlogSummary[] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-16 mt-5 sm:mt-10 md:mt-24 sxl:mt-32 px-5 sm:px-10 md:px-24 sxl:px-32">
        {blogs.map((blog) => (
            <article className="col-span-1 relative" key={blog._id}>
                <BlogLayoutThree blog={blog} />
            </article>
        ))}
    </div>
);

export default BlogGrid;
