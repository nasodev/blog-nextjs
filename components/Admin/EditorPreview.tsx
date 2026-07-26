"use client";

import { useEffect, useRef, useState } from "react";

const EditorPreview = ({ html }: { html: string }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [ready, setReady] = useState(false);
    const [dark, setDark] = useState(
        () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    );

    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (e.data?.previewReady) setReady(true);
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    // 300ms 디바운스로 HTML 전송
    useEffect(() => {
        if (!ready) return;
        const timer = setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage({ html, dark }, window.location.origin);
        }, 300);
        return () => clearTimeout(timer);
    }, [html, dark, ready]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-end px-3 py-1 border-b">
                <button onClick={() => setDark((d) => !d)} className="text-sm underline">
                    {dark ? "라이트 모드" : "다크 모드"}
                </button>
            </div>
            <iframe ref={iframeRef} src="/admin/preview" className="flex-1 w-full" title="preview" />
        </div>
    );
};

export default EditorPreview;
