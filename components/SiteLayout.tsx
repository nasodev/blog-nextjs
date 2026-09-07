import { cx } from "@/utils";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "@/app/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import siteMetaData from "@/utils/siteMetaData";
import { feedPath, Locale, localePath } from "@/lib/i18n";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-in",
});

const manrope = Manrope({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-mr",
});

export function siteMetadata(locale: Locale): Metadata {
    const description = locale === "en"
        ? siteMetaData.descriptionEn
        : siteMetaData.description;
    return {
        metadataBase: new URL(siteMetaData.siteUrl),
        title: {
            template: "%s | " + siteMetaData.title,
            default: siteMetaData.title,
        },
        description,
        openGraph: {
            ...siteMetaData.openGraph,
            type: "website",
            description,
            url: localePath("/", locale),
            locale: locale === "en" ? "en_US" : "ko_KR",
        },
        alternates: {
            canonical: localePath("/", locale),
            types: {
                "application/rss+xml": feedPath(locale),
            },
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                noimageindex: false,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
        twitter: { ...siteMetaData.twitter, card: "summary_large_image", description },
    };
}

export default function SiteLayout({ children, locale }: { children: React.ReactNode; locale: Locale }) {
    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={cx(inter.variable, manrope.variable, "font-mr bg-light dark:bg-dark")}>
                {/* FOUC 방지용 동기 인라인 스크립트 — next/script는 App Router에서
                    beforeInteractive여도 프레임워크 부트스트랩 이후에 실행되므로 쓰지 않는다 */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `var savedTheme;try{savedTheme=localStorage.getItem("theme")}catch(e){}document.documentElement.classList.toggle("dark",savedTheme==="dark"||(savedTheme!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches))`,
                    }}
                />
                <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:p-3 bg-light text-dark rounded-lg">
                    {locale === "en" ? "Skip to content" : "본문 바로가기"}
                </a>
                <Header locale={locale} />
                <div id="main-content" tabIndex={-1}>{children}</div>
                <Footer />
            </body>
        </html>
    );
}
