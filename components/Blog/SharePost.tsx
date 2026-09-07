"use client";

import { useState } from "react";
import { Locale } from "@/lib/i18n";

export default function SharePost({ url, locale }: { url: string; locale: Locale }) {
    const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
    const en = locale === "en";
    return (
        <div className="mt-8 px-5 md:px-10 flex flex-wrap items-center gap-3">
            <button className="px-4 py-3 rounded-lg border border-dark/30 dark:border-light/40 text-dark dark:text-light"
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(url);
                        setStatus("copied");
                    } catch {
                        setStatus("manual");
                    }
                }}>
                {en ? "Copy article link" : "글 링크 복사"}
            </button>
            <span role="status" className="text-sm text-dark dark:text-light">
                {status === "copied" ? en ? "Link copied." : "링크를 복사했습니다."
                    : status === "manual" ? en ? "Select and copy the link below." : "아래 링크를 선택해 복사하세요." : ""}
            </span>
            {status === "manual" && <input readOnly value={url} aria-label={en ? "Article link" : "글 주소"}
                onFocus={(event) => event.currentTarget.select()}
                className="w-full rounded border p-3 bg-transparent text-dark dark:text-light" />}
        </div>
    );
}
