import BlogPage, { blogMetadata, blogStaticParams } from "@/components/Blog/BlogPage";

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => blogStaticParams("ko");
export const generateMetadata = async ({ params }: Props) => blogMetadata((await params).slug, "ko");

export default async function Page({ params }: Props) {
    return <BlogPage slug={(await params).slug} locale="ko" />;
}
