import Image from "next/image";
import Link from "next/link";
import { BlogProp } from "@/types/Home";
import { format } from "date-fns";
import TagList from "@/components/Elements/TagList";

const BlogLayoutThree = ({ blog }: BlogProp) => {
    return (
        <div className="group flex flex-col items-center text-dark dark:text-light">
            <Link href={blog.url} className="w-full rounded-xl overflow-hidden">
                <div className="relative w-full aspect-[4/3]">
                    <Image
                        src={blog.image.filePath.replace("../public", "")}
                        placeholder="blur"
                        blurDataURL={blog.image.blurhashDataUrl}
                        alt={blog.title}
                        fill
                        className="object-cover object-center group-hover:scale-105 transition-all ease duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                </div>
            </Link>

            <div className="flex flex-col w-full mt-4">
                {blog.tags && blog.tags.length > 0 && (
                    <div className="mb-2">
                        <TagList tags={blog.tags} maxDisplay={8} />
                    </div>
                )}
                <Link href={blog.url} className="inline-block my-1">
                    <h2 className="font-semibold capitalize text-base sm:text-lg">
                        <span className="bg-gradient-to-r from-accent/50 to-accent/50 dark:from-accentDark/50 dark:to-accentDark/50 bg-[length:0px_3px] group-hover:bg-[length:100%_3px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500">
                            {blog.title}
                        </span>
                    </h2>
                </Link>
                <span className="inline-block w-full capitalize text-gray dark:text-light/50 font-semibold text-xs sm:text-base">
                    {format(new Date(blog.publishedAt), "MMMM dd yyyy")}
                </span>
            </div>
        </div>
    );
};

export default BlogLayoutThree;
