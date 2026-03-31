import HomeCoverSection from "@/components/Home/HomeCoverSection";
import FeaturePosts from "@/components/Home/FeaturePosts";
import { allBlogs } from "contentlayer/generated";
import AllPostsSection from "@/components/Home/AllPostsSection";
import { toBlogSummary } from "@/utils/blogData";

export default function Home() {
    const blogs = allBlogs.filter((blog) => blog.isPublished).map(toBlogSummary);
    return (
        <main className="flex flex-col items-center justify-center">
            <HomeCoverSection blogs={blogs} />
            <FeaturePosts blogs={blogs} />
            <AllPostsSection blogs={blogs} />
        </main>
    );
}
