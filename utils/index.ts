import { compareDesc, parseISO } from "date-fns";

export const cx = (...classNames: (string | undefined)[]) => classNames.filter(Boolean).join(" ");

export const sortBlogs = <T extends { publishedAt: string }>(blogs: T[]): T[] => {
    return blogs.slice().sort((a, b) => compareDesc(parseISO(a.publishedAt), parseISO(b.publishedAt)));
};
