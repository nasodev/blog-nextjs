"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CommentApiError, CommentPage, deleteAdminComment, listAdminComments } from "@/lib/api/comments";
import { getIdToken } from "@/lib/firebase";
import { postPath } from "@/lib/i18n";
import { commentError } from "@/components/Comments/copy";

async function adminToken() {
    const token = await getIdToken();
    if (!token) throw new CommentApiError(401);
    return token;
}

export default function AdminCommentsPage() {
    const [data, setData] = useState<CommentPage>({ items: [], next_cursor: null, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);
    const [deleting, setDeleting] = useState<string | null>(null);
    const pageInFlight = useRef(false);
    const mutationInFlight = useRef(false);

    useEffect(() => {
        let active = true;
        adminToken().then((token) => listAdminComments(token)).then((result) => {
            if (active) { setData(result); setError(null); setLoading(false); }
        }).catch((error) => {
            if (active) { setError(commentError(error, "ko")); setLoading(false); }
        });
        return () => { active = false; };
    }, [revision]);

    async function loadMore() {
        if (!data.next_cursor || pageInFlight.current) return;
        pageInFlight.current = true;
        setLoading(true);
        try {
            const next = await listAdminComments(await adminToken(), data.next_cursor);
            setData((current) => ({ ...next, items: [...new Map([...current.items, ...next.items].map((item) => [item.id, item])).values()] }));
            setError(null);
        } catch (error) { setError(commentError(error, "ko")); }
        finally { pageInFlight.current = false; setLoading(false); }
    }

    async function remove(id: string) {
        if (mutationInFlight.current || !window.confirm("이 댓글을 삭제할까요? 기존 답글은 유지됩니다.")) return;
        mutationInFlight.current = true;
        setDeleting(id);
        try {
            await deleteAdminComment(id, await adminToken());
            setData((current) => ({ ...current, total: Math.max(0, current.total - 1), items: current.items.map((item) => item.id === id ? { ...item, content: "", author_name: "", is_deleted: true, can_delete: false } : item) }));
            setError(null);
        } catch (error) { setError(commentError(error, "ko")); }
        finally { mutationInFlight.current = false; setDeleting(null); }
    }

    return <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">댓글 관리</h1>
            <Link href="/admin" className="text-sm underline underline-offset-4">글 관리</Link>
        </div>
        <p className="mb-5 text-sm opacity-60">댓글 {data.total.toLocaleString()}개 · 한글·영문 통합</p>
        {error && <div className="mb-5 rounded-lg border border-red-500/30 p-4">
            <p role="alert">{error}</p>
            <button type="button" className="mt-2 text-sm underline" onClick={() => { setLoading(true); setRevision((value) => value + 1); }}>다시 시도</button>
        </div>}
        {loading && <p role="status" className="py-5 text-sm opacity-60">댓글을 불러오는 중…</p>}
        {!loading && !error && !data.items.length && <p className="py-8 opacity-60">아직 댓글이 없습니다.</p>}
        <ul className="divide-y divide-dark/10 dark:divide-light/20">
            {data.items.map((item) => <li key={item.id} className="py-5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 break-all opacity-60">{item.thread_slug}</span>
                    {item.post_slug && <Link href={`${postPath(item.post_slug)}#comments`} target="_blank" className="shrink-0 underline underline-offset-4">글 보기</Link>}
                    {!item.post_slug && <span className="shrink-0 text-xs opacity-60">공개된 글 없음</span>}
                </div>
                {item.is_deleted ? <p className="mt-3 text-sm italic opacity-60">삭제된 댓글입니다.</p> : <>
                    <p className="mt-3 break-words font-semibold">{item.author_name}<span className="ml-2 text-xs font-normal opacity-60">{item.author_type === "guest" ? "비회원" : item.author_type === "github" ? "GitHub에서 옮김" : "Google"}{item.parent_id ? " · 답글" : ""}</span></p>
                    {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs underline underline-offset-4">원본 댓글</a>}
                    <p className="my-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.content}</p>
                </>}
                <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                    <time dateTime={item.created_at} className="text-xs opacity-60">{new Date(item.created_at).toLocaleString("ko-KR")}</time>
                    {!item.is_deleted && item.can_delete && <button type="button" disabled={!!deleting} onClick={() => remove(item.id)} className="rounded py-1 text-red-700 dark:text-red-300 underline underline-offset-4 disabled:opacity-50">{deleting === item.id ? "삭제 중…" : "삭제"}</button>}
                </div>
            </li>)}
        </ul>
        {data.next_cursor && <button type="button" disabled={loading} onClick={loadMore} className="mt-6 w-full rounded-lg border border-dark/20 dark:border-light/20 px-4 py-3 text-sm disabled:opacity-50">댓글 더 보기</button>}
    </main>;
}
