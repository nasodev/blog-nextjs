"use client";
import React from "react";
import { useMDXComponent } from "next-contentlayer2/hooks";
import Image from "next/image";

interface BlogProps {
    blog: {
        body: {
            code: string;
        };
    };
}

const mdxComponent = {
    Image,
};

const RenderMdx = ({ blog }: BlogProps) => {
    const MDXContent = useMDXComponent(blog.body.code);
    return (
        <div
            className="col-span-12 md:col-span-9 font-in prose sm:prose-base md:prose-lg max-w-max
        prose-blockquote:bg-accent/20
        prose-blockquote:px-6
        prose-blockquote:p-2
        prose-blockquote:border-accent
        prose-blockquote:not-italic
        prose-blockquote:rounded-r-lg

        prose-li:marker:text-accent

        dark:prose-invert
        dark:prose-blockquote:border-accentDark
        dark:prose-blockquote:bg-accentDark/20
        dark:prose-li:marker:text-accentDark

        first-letter:text-2xl
        sm:first-letter:text-4xl
        "
        >
            <MDXContent components={mdxComponent} />
        </div>
    );
};
export default RenderMdx;
