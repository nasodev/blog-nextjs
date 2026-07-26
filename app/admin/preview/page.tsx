"use client";

import { useEffect, useState } from "react";
import PostBody from "@/components/Blog/PostBody";

export default function PreviewPage() {
    const [html, setHtml] = useState("");

    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (typeof e.data?.html === "string") setHtml(e.data.html);
            if (typeof e.data?.dark === "boolean") {
                document.documentElement.classList.toggle("dark", e.data.dark);
            }
        };
        window.addEventListener("message", onMessage);
        window.parent.postMessage({ previewReady: true }, window.location.origin);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    return (
        <div className="grid grid-cols-12 px-5 py-6 bg-light dark:bg-dark min-h-screen">
            <PostBody html={html} />
        </div>
    );
}
