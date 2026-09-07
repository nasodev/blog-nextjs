import InsightRoll from "@/components/About/InsightRoll";

const insights = [
    "generative ai",
    "ai tools",
    "ai models",
    "workflow automation",
    "blockchain",
    "bitcoin",
    "ethereum",
    "solana",
    "e-commerce",
    "seller-tool",
];
export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="w-full flex flex-col items-center justify-between">
            {/* <InsightRoll insights={insights} /> */}
            {children}
        </main>
    );
}
