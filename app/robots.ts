import { MetadataRoute } from "next";
import siteMetaData from "@/utils/siteMetaData";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/", disallow: "/admin" },
        sitemap: `${siteMetaData.siteUrl}/sitemap.xml`,
    };
}
