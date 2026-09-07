import HomePage, { homeMetadata } from "@/components/Home/HomePage";

export const generateMetadata = () => homeMetadata("en");
export default function Page() {
    return <HomePage locale="en" />;
}
