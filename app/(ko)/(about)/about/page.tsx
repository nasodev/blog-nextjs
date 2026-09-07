import AboutCoverSection from "@/components/About/AboutCoverSection";
import Skills from "@/components/About/Skills";
import Link from "next/link";
import siteMetaData from "@/utils/siteMetaData";

const aboutDescription =
    "AI 도구와 LLM을 활용해 개발 생산성을 높이는 개발자 funqdev의 소개 페이지입니다. 기술 스택과 프로젝트 경험을 확인해보세요.";

export const metadata = {
    title: "About Me",
    description: aboutDescription,
    alternates: {
        canonical: "/about",
        types: { "application/rss+xml": "/feed.xml" },
    },
    twitter: {
        card: "summary_large_image" as const,
        title: "About Me",
        description: aboutDescription,
        images: [siteMetaData.siteUrl + siteMetaData.socialBanner],
    },
    openGraph: {
        title: `About Me | ${siteMetaData.title}`,
        description: aboutDescription,
        url: `${siteMetaData.siteUrl}/about`,
        siteName: siteMetaData.title,
        locale: siteMetaData.locale,
        type: "website",
        images: [{ url: siteMetaData.siteUrl + siteMetaData.socialBanner, width: 1200, height: 630 }],
    },
};

export default function About() {
    return (
        <div>
            <AboutCoverSection />
            <Skills />
            <h2 className="mt-8 font-semibold text-lg sm:text-xl md:text-2xl self-start mx-5 xs:mx-10 sm:mx-12 md:mx-16 lg:mx-20 text-dark dark:text-light dark:font-normal">
                Have a project in mind? Reach out to me! from{" "}
                <Link href="/contact" className="!underline underline-offset-2 text-blue-500 dark:text-blue-400">
                    here,
                </Link>{" "}
                and let&apos;s make something great together!
            </h2>
        </div>
    );
}
