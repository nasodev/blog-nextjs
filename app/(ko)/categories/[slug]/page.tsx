import CategoryPage, { categoryMetadata, categoryStaticParams } from "@/components/Blog/CategoryPage";

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => categoryStaticParams("ko");
export const generateMetadata = async ({ params }: Props) => categoryMetadata((await params).slug, "ko");

export default async function Page({ params }: Props) {
    return <CategoryPage slug={(await params).slug} locale="ko" />;
}
