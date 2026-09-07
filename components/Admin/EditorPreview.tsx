"use client";

import { useEffect, useState } from "react";
import { postBodyClassName } from "@/components/Blog/PostBody";

const EditorPreview = ({ html }: { html: string }) => {
    const [documentHtml, setDocumentHtml] = useState("");
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], head style'))
                .map((style) => style.outerHTML).join("");
            setDocumentHtml(`<!doctype html><html class="${dark ? "dark" : ""}"><head>
                <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
                <meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; form-action 'none'">
                <base href="${window.location.origin}/">${styles}</head>
                <body class="p-5 bg-light dark:bg-dark"><div class="${postBodyClassName}">${html}</div></body></html>`);
        }, 300);
        return () => clearTimeout(timer);
    }, [html, dark]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-end px-3 py-1 border-b">
                <button onClick={() => setDark((value) => !value)} className="text-sm underline">
                    {dark ? "라이트 모드" : "다크 모드"}
                </button>
            </div>
            <iframe sandbox="" srcDoc={documentHtml} className="flex-1 w-full" title="글 미리보기" />
        </div>
    );
};

export default EditorPreview;
