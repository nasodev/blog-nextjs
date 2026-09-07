import HomeCoverSection from "@/components/Home/HomeCoverSection";
import FeaturePosts from "@/components/Home/FeaturePosts";
import AllPostsSection from "@/components/Home/AllPostsSection";
import { getPublishedPosts } from "@/lib/api/posts";
import { toBlogSummary } from "@/utils/blogData";
import siteMetaData from "@/utils/siteMetaData";
import { feedPath, Locale, localePath } from "@/lib/i18n";

export async function homeMetadata(locale: Locale) {
    const translations = await getPublishedPosts(undefined, "en");
    return {
        alternates: {
            canonical: localePath("/", locale),
            types: { "application/rss+xml": feedPath(locale) },
            languages: translations.length ? {
                ko: siteMetaData.siteUrl,
                en: `${siteMetaData.siteUrl}/en`,
                "x-default": siteMetaData.siteUrl,
            } : undefined,
        },
        ...(locale === "en" && !translations.length ? { robots: { index: false, follow: true } } : {}),
    };
}

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

export default async function HomePage({ locale }: { locale: Locale }) {
    const posts = await getPublishedPosts(undefined, locale);
    const blogs = posts.map(toBlogSummary);
    return (
        <main className="flex flex-col items-center justify-center">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
                ...websiteJsonLd,
                url: siteMetaData.siteUrl + (locale === "en" ? "/en" : ""),
                description: locale === "en" ? siteMetaData.descriptionEn : siteMetaData.description,
                inLanguage: locale === "en" ? "en" : "ko-KR",
            }) }} />
            {!blogs.length && <p className="px-5 py-16">{locale === "en" ? "English posts are coming soon." : "아직 발행된 글이 없습니다."}</p>}
            <HomeCoverSection blogs={blogs} />
            <FeaturePosts blogs={blogs} />
            <AllPostsSection blogs={blogs} />
        </main>
    );
}
