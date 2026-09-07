import HomePage, { homeMetadata } from "@/components/Home/HomePage";

export const generateMetadata = () => homeMetadata("ko");
export default function Page() {
    return <HomePage locale="ko" />;
}
