import { compareDesc, format, parseISO } from "date-fns";
import { Blog } from "contentlayer/generated";

export const cx = (...classNames: (string | undefined)[]) => classNames.filter(Boolean).join(" ");

export const sortBlogs = (blogs: Blog[]) => {
    return blogs.slice().sort((a, b) => compareDesc(parseISO(a.publishedAt), parseISO(b.publishedAt)));
};
