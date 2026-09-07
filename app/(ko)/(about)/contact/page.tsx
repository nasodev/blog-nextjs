import LottieAnimation from "@/components/Contact/LottieAnimation";
import ContactForm from "@/components/Contact/ContactForm";
import siteMetaData from "@/utils/siteMetaData";

const contactDescription = `${siteMetaData.title}에 프로젝트 문의와 협업 제안을 보낼 수 있는 연락 페이지입니다.`;

export const metadata = {
    title: "Contact Me",
    description: contactDescription,
    alternates: {
        canonical: "/contact",
        types: { "application/rss+xml": "/feed.xml" },
    },
    twitter: {
        card: "summary_large_image" as const,
        title: "Contact Me",
        description: contactDescription,
        images: [siteMetaData.siteUrl + siteMetaData.socialBanner],
    },
    openGraph: {
        title: `Contact Me | ${siteMetaData.title}`,
        description: contactDescription,
        url: `${siteMetaData.siteUrl}/contact`,
        siteName: siteMetaData.title,
        locale: siteMetaData.locale,
        type: "website",
        images: [{ url: siteMetaData.siteUrl + siteMetaData.socialBanner, width: 1200, height: 630 }],
    },
};

export default function Contact() {
    return (
        <section className="w-full h-auto md:min-h-[75vh] border-b-2 border-solid border-dark dark:border-light flex flex-col md:flex-row items-center justify-center text-dark dark:text-light">
            <div className="hidden md:block md:w-2/5 h-full md:border-r-2 border-solid border-dark dark:border-light">
                <LottieAnimation />
            </div>
            <div className="w-full sm:w-3/5 flex flex-col items-start justify-center px-5 xs:px-10 md:px-16 py-8">
                <h1 className="font-bold text-2xl xs:text-3xl sm:text-4xl">문의하기</h1>
                <ContactForm />
            </div>
        </section>
    );
}
