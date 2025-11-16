import { defineDocumentType, makeSource } from "contentlayer/source-files";
import readingTime from "reading-time";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import GithubSlugger from "github-slugger";

export const Post = defineDocumentType(() => ({
    name: "Post",
    filePathPattern: `**/*.md`,
    fields: {
        title: { type: "string", required: true },
        date: { type: "date", required: true },
    },
    computedFields: {
        url: {
            type: "string",
            resolve: (post) => `/posts/${post._raw.flattenedPath}`,
        },
    },
}));

export const Blog = defineDocumentType(() => ({
    name: "Blog",
    filePathPattern: `**/**/*.mdx`,
    contentType: "mdx",
    fields: {
        title: { type: "string", required: true },
        publishedAt: { type: "date", required: true },
        updatedAt: { type: "date", required: true },
        description: { type: "string", required: true },
        image: { type: "image", required: true },
        isPublished: { type: "boolean", default: true },
        author: { type: "string", required: true },
        tags: { type: "list", of: { type: "string" } },
    },
    computedFields: {
        url: {
            type: "string",
            resolve: (blog) => `/blogs/${blog._raw.flattenedPath}`,
        },
        readingTime: {
            type: "json",
            resolve: (doc) => readingTime(doc.body.raw),
        },
        toc: {
            type: "json",
            resolve: async (doc) => {
                const regulrExp = /\n(?<flag>#{1,6})\s+(?<content>.+)/g;
                const slugger = new GithubSlugger();
                const headings = Array.from(doc.body.raw.matchAll(regulrExp)).map(({ groups }) => {
                    const flag = groups?.flag;
                    const content = groups?.content;
                    if (flag && content) {
                        return {
                            level: flag.length == 1 ? "one" : flag.length == 2 ? "two" : "three",
                            text: content,
                            slug: content ? slugger.slug(content) : undefined,
                        };
                    }
                });

                return headings;
            },
        },
    },
}));

const codeOptions = {
    theme: "github-dark",
};
export default makeSource({
    contentDirPath: "content",
    documentTypes: [Blog],
    mdx: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "append" }],
            // @ts-expect-error: Typings are not correct for rehype-pretty-code
            [rehypePrettyCode, codeOptions],
        ],
    },
    disableImportAliasWarning: true,
});

// import { defineDocumentType, makeSource } from "contentlayer/source-files";

// export const Post = defineDocumentType(() => ({
//   name: "Post",
//   filePathPattern: `**/*.md`,
//   fields: {
//     title: { type: "string", required: true },
//     date: { type: "date", required: true },
//   },
//   computedFields: {
//     url: {
//       type: "string",
//       resolve: (post) => `/posts/${post._raw.flattenedPath}`,
//     },
//   },
// }));

// export default makeSource({ contentDirPath: "posts", documentTypes: [Post] });
