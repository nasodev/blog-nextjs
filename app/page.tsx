import HomeCoverSection from "@/components/Home/HomeCoverSection";
import FeaturePosts from "@/components/Home/FeaturePosts";
import AllPostsSection from "@/components/Home/AllPostsSection";
import { getPublishedPosts } from "@/lib/api/posts";
import { toBlogSummary } from "@/utils/blogData";
import siteMetaData from "@/utils/siteMetaData";

const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteMetaData.title,
    alternateName: siteMetaData.headerTitle,
    url: siteMetaData.siteUrl,
    description: siteMetaData.description,
    inLanguage: "ko-KR",
    publisher: {
        "@type": "Organization",
        name: siteMetaData.title,
        logo: { "@type": "ImageObject", url: siteMetaData.siteUrl + siteMetaData.siteLogo },
    },
};

export default async function Home() {
    const posts = await getPublishedPosts();
    const blogs = posts.map(toBlogSummary);
    return (
        <main className="flex flex-col items-center justify-center">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
            <HomeCoverSection blogs={blogs} />
            <FeaturePosts blogs={blogs} />
            <AllPostsSection blogs={blogs} />
        </main>
    );
}
