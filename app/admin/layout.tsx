import AuthGate from "@/components/Admin/AuthGate";

export const metadata = {
    title: "Blog Admin",
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AuthGate>{children}</AuthGate>;
}
