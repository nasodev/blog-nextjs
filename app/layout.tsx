import { cx } from "@/utils";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import siteMetaData from "@/utils/siteMetaData";

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

export const metadata: Metadata = {
    metadataBase: new URL(siteMetaData.siteUrl),
    title: {
        template: "%s | " + siteMetaData.title,
        default: siteMetaData.title,
    },
    description: siteMetaData.description,
    openGraph: siteMetaData.openGraph,
    alternates: {
        canonical: "/",
        types: {
            "application/rss+xml": "/feed.xml",
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
    twitter: siteMetaData.twitter,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body className={cx(inter.variable, manrope.variable, "font-mr bg-light dark:bg-dark")}>
                {/* FOUC 방지용 동기 인라인 스크립트 — next/script는 App Router에서
                    beforeInteractive여도 프레임워크 부트스트랩 이후에 실행되므로 쓰지 않는다 */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{if(localStorage.getItem("theme")==="dark"||(!("theme" in localStorage)&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}`,
                    }}
                />
                <Header />
                {children}
                <Footer />
            </body>
        </html>
    );
}
