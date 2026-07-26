"use client";

import { use, useEffect, useState } from "react";
import PostEditor from "@/components/Admin/PostEditor";
import { getPostForEdit } from "@/lib/api/admin";
import { ApiPostDetail } from "@/lib/api/types";

export default function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [post, setPost] = useState<ApiPostDetail | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getPostForEdit(slug).then(setPost).catch((e) => setError(String(e)));
    }, [slug]);

    if (error) return <div className="p-10 text-red-500">{error}</div>;
    if (!post) return <div className="p-10">Loading...</div>;
    return <PostEditor initial={post} />;
}
