import { cx } from "@/utils";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Script from "next/script";
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
        <html lang="en">
            <body className={cx(inter.variable, manrope.variable, "font-mr bg-light dark:bg-dark")}>
                <Script id="theme-script">
                    {`if (localStorage.getItem("theme") === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                        document.documentElement.classList.add("dark");
                    } else {
                        document.documentElement.classList.remove("dark");
                    }`}
                </Script>
                <Header />
                {children}
                <Footer />
            </body>
        </html>
    );
}
