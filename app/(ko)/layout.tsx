import SiteLayout, { siteMetadata } from "@/components/SiteLayout";

export const metadata = siteMetadata("ko");

export default function Layout({ children }: { children: React.ReactNode }) {
    return <SiteLayout locale="ko">{children}</SiteLayout>;
}
