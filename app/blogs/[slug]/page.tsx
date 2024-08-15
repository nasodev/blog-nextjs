import Tag from "@/components/Elements/tag";
import { allBlogs } from "contentlayer/generated";
import Image from "next/image";

export default function BlogPage({ params }: { params: { slug: string } }) {
  const blog = allBlogs.find((blog) => blog._raw.flattenedPath === params.slug);

  if (!blog) {
    return <div>블로그 게시물을 찾을 수 없습니다.</div>;
  }

  return (
    <article>
      <div>
        <div>
          <Tag
            name={blog.tags?.[0]}
            link={`/categories/${blog.tags?.[0]}`}
            className="px-6 text-sm py-2"
          />
          <h1 className="inline-block mt-6 font-semibold capitalize text-light text-5xl leading-normal relative w-5/6">
            {blog?.title}
          </h1>
        </div>
        <div className="absolute top-0 left-0 right-0 bottom-0 h-full bg-dark/60">
          <Image
            src={blog.image.filePath.replace("../public", "")}
            placeholder="blur"
            blurDataURL={blog.image.blurhashDataUrl}
            alt={blog.title}
            width={blog.image.width}
            height={blog.image.height}
            className="aspect-square w-full h-full object-cover object-center"
          />
        </div>
      </div>
    </article>
  );
}
