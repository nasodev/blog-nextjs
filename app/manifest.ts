import siteMetaData from "@/utils/siteMetaData";
import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: siteMetaData.title,
        short_name: siteMetaData.headerTitle,
        description: siteMetaData.description,
        start_url: "/",
        display: "standalone",
        lang: "ko",
        background_color: "#ffffff",
        theme_color: "#7b00d3",
        icons: [
            {
                src: "/favicon/favicon-16x16.png",
                sizes: "16x16",
                type: "image/png",
            },
            {
                src: "/favicon/favicon-32x32.png",
                sizes: "32x32",
                type: "image/png",
            },
            {
                src: "/favicon/android-chrome-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/favicon/android-chrome-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
