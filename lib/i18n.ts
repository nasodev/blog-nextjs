import type { ApiPostSummary } from "./api/types";
import siteMetaData from "@/utils/siteMetaData";

export type Locale = "ko" | "en";

// ponytail: two languages share the existing API; use explicit locale fields if more are needed.
// The en- slug prefix is reserved for English translations of the remaining slug.
export const getPostLocale = (slug: string): Locale => slug.startsWith("en-") ? "en" : "ko";
export const getSourceSlug = (slug: string) => slug.replace(/^en-/, "");
export const getApiSlug = (slug: string, locale: Locale) => locale === "en" ? `en-${slug}` : slug;
export const localePath = (path: string, locale: Locale) => locale === "en" ? `/en${path === "/" ? "" : path}` : path;
export const postPath = (slug: string) => localePath(`/blogs/${getSourceSlug(slug)}`, getPostLocale(slug));
export const feedPath = (locale: Locale) => localePath("/feed.xml", locale);

export function postAlternates(post: ApiPostSummary, posts: ApiPostSummary[]) {
    const sourceSlug = getSourceSlug(post.slug);
    const languages: Record<string, string> = {};
    for (const locale of ["ko", "en"] as const) {
        const slug = getApiSlug(sourceSlug, locale);
        if (slug === post.slug || posts.some((candidate) => candidate.slug === slug)) {
            languages[locale] = siteMetaData.siteUrl + postPath(slug);
        }
    }
    languages["x-default"] = languages.ko ?? languages.en;
    return {
        canonical: postPath(post.slug),
        languages,
        types: { "application/rss+xml": feedPath(getPostLocale(post.slug)) },
    };
}
