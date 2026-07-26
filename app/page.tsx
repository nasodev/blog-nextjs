import HomeCoverSection from "@/components/Home/HomeCoverSection";
import FeaturePosts from "@/components/Home/FeaturePosts";
import AllPostsSection from "@/components/Home/AllPostsSection";
import { getPublishedPosts } from "@/lib/api/posts";
import { toBlogSummary } from "@/utils/blogData";

export default async function Home() {
    const posts = await getPublishedPosts();
    const blogs = posts.map(toBlogSummary);
    return (
        <main className="flex flex-col items-center justify-center">
            <HomeCoverSection blogs={blogs} />
            <FeaturePosts blogs={blogs} />
            <AllPostsSection blogs={blogs} />
        </main>
    );
}
