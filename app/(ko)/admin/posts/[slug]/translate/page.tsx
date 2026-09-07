"use client";

import { use, useEffect, useState } from "react";
import PostEditor from "@/components/Admin/PostEditor";
import { getPostForEdit } from "@/lib/api/admin";
import { ApiPostDetail } from "@/lib/api/types";
import { getPostLocale } from "@/lib/i18n";

export default function TranslatePostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [source, setSource] = useState<ApiPostDetail | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (getPostLocale(slug) === "en") return;
        let active = true;
        getPostForEdit(slug)
            .then((post) => { if (active) setSource(post); })
            .catch((e) => { if (active) setError(String(e)); });
        return () => { active = false; };
    }, [slug]);

    if (getPostLocale(slug) === "en") return <p className="p-10">한국어 원문에서 영문 번역을 작성하세요.</p>;
    if (error) return <p className="p-10 text-red-500">{error}</p>;
    if (!source || source.slug !== slug) return <p className="p-10">Loading...</p>;
    return <PostEditor key={slug} initial={null} translationSource={source} />;
}
