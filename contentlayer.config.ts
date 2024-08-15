import { defineDocumentType, makeSource } from "contentlayer/source-files";

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
  },
}));

export default makeSource({ contentDirPath: "content", documentTypes: [Blog] });

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
