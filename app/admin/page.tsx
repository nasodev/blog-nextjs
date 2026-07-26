"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listAllPosts, deletePost, requestRevalidate } from "@/lib/api/admin";
import { ApiPostSummary } from "@/lib/api/types";

export default function AdminPostsPage() {
    const [posts, setPosts] = useState<ApiPostSummary[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        listAllPosts().then(setPosts).catch((e) => setError(String(e)));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleDelete = async (slug: string) => {
        if (!window.confirm(`"${slug}" 글을 삭제할까요?`)) return;
        try {
            await deletePost(slug);
        } catch (e) {
            setError(String(e));
            return;
        }
        try {
            await requestRevalidate(slug);
            setError(null);
        } catch (e) {
            setError(`"${slug}" 삭제됨 — 캐시 반영 실패`);
        }
        load();
    };

    return (
        <main className="max-w-4xl mx-auto px-5 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">글 관리</h1>
                <Link href="/admin/posts/new" className="px-4 py-2 rounded-lg bg-accent text-light">
                    새 글
                </Link>
            </div>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <ul className="divide-y divide-dark/10 dark:divide-light/10">
                {posts.map((post) => (
                    <li key={post.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <Link href={`/admin/posts/${post.slug}`} className="font-semibold hover:underline">
                                {post.title}
                            </Link>
                            <p className="text-sm opacity-60 truncate">
                                {post.slug} · {new Date(post.published_at).toLocaleDateString()} · {post.view_count} views
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <Link href={`/blogs/${post.slug}`} className="text-sm underline" target="_blank">
                                보기
                            </Link>
                            <button onClick={() => handleDelete(post.slug)} className="text-sm text-red-500 underline">
                                삭제
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </main>
    );
}
