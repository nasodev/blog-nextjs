import HomeCoverSection from "@/components/Home/HomeCoverSection";
import FeaturePosts from "@/components/Home/FeaturePosts";
import { allBlogs } from "contentlayer/generated";
import AllPostsSection from "@/components/Home/AllPostsSection";

export default function Home() {
    return (
        <main className="flex flex-col items-center justify-center">
            <HomeCoverSection blogs={allBlogs} />
            <FeaturePosts blogs={allBlogs} />
            <AllPostsSection blogs={allBlogs} />
        </main>
    );
}

// import Link from "next/link";

// import { allPosts, Post } from "contentlayer/generated";
// import { compareDesc, format, parseISO } from "date-fns";

// function PostCard(post: Blog) {
//   return (
//     <div className="mb-8">
//       <h2 className="mb-1 text-xl">
//         <Link
//           href={post.url}
//           className="text-blue-700 hover:text-blue-900 dark:text-blue-400"
//         >
//           {post.title}
//         </Link>
//       </h2>
//       <time dateTime={post.date} className="mb-2 block text-xs text-gray-600">
//         {format(parseISO(post.date), "LLLL d, yyyy")}
//       </time>
//       <div
//         className="text-sm [&>*]:mb-3 [&>*:last-child]:mb-0"
//         dangerouslySetInnerHTML={{ __html: post.body.html }}
//       />
//     </div>
//   );
// }
