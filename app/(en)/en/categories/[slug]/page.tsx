import CategoryPage, { categoryMetadata, categoryStaticParams } from "@/components/Blog/CategoryPage";

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => categoryStaticParams("en");
export const generateMetadata = async ({ params }: Props) => categoryMetadata((await params).slug, "en");

export default async function Page({ params }: Props) {
    return <CategoryPage slug={(await params).slug} locale="en" />;
}
