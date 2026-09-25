"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { Locale } from "@/lib/i18n";
import { ApiComment, CommentPage, createComment, deleteComment, listComments, updateComment } from "@/lib/api/comments";
import { getIdToken, onAuthChange, signInWithGoogle, signOutUser } from "@/lib/firebase";
import CommentForm, { CommentFormValue } from "./CommentForm";
import CommentItem, { CommentAction } from "./CommentItem";
import { commentCopy, commentError } from "./copy";

interface CommentsProps {
    slug: string;
    locale?: Locale;
}

function mergeComments(current: ApiComment[], incoming: ApiComment[]): ApiComment[] {
    const comments = new Map(current.map((item) => [item.id, item]));
    incoming.forEach((item) => comments.set(item.id, item));
    return [...comments.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id));
}

export default function Comments({ slug, locale = "ko" }: CommentsProps) {
    const copy = commentCopy[locale];
    const [user, setUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState(false);
    const [page, setPage] = useState<CommentPage>({ items: [], next_cursor: null, total: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);
    const [action, setAction] = useState<{ id: string; kind: CommentAction } | null>(null);
    const [notice, setNotice] = useState("");
    const generation = useRef(0);
    const pageInFlight = useRef(false);
    const hasLoaded = useRef(false);
    const viewerUid = useRef<string | null>(null);

    useEffect(() => onAuthChange((nextUser) => {
        const nextUid = nextUser?.uid ?? null;
        if (viewerUid.current !== nextUid) {
            viewerUid.current = nextUid;
            generation.current++;
            hasLoaded.current = false;
            setPage({ items: [], next_cursor: null, total: 0 });
            setAction(null);
            setLoading(true);
        }
        setUser(nextUser);
        setAuthError(false);
    }, () => setAuthError(true)), []);

    useEffect(() => {
        const requestGeneration = ++generation.current;
        let active = true;
        // An expired/offline identity must not prevent reading public comments.
        getIdToken().catch(() => null).then((token) => listComments(slug, { token })).then((result) => {
            if (active && generation.current === requestGeneration) {
                hasLoaded.current = true;
                setPage((current) => ({ ...result, items: mergeComments(current.items, result.items) }));
                setError(null);
                setLoading(false);
            }
        }).catch((error) => {
            if (active && generation.current === requestGeneration) {
                setError(commentError(error, locale));
                setLoading(false);
            }
        });
        return () => { active = false; };
    }, [slug, user?.uid, revision, locale]);

    function finishMutation() {
        generation.current++;
        // A mutation can finish before the initial list. Fetch a new snapshot so
        // cancelling that stale read never hides the pre-existing conversation.
        if (!hasLoaded.current) setRevision((value) => value + 1);
    }

    async function loadMore() {
        if (!page.next_cursor || pageInFlight.current) return;
        pageInFlight.current = true;
        setLoadingMore(true);
        const requestGeneration = generation.current;
        try {
            const token = await getIdToken().catch(() => null);
            const next = await listComments(slug, { token, cursor: page.next_cursor });
            if (generation.current === requestGeneration) {
                setPage((current) => ({ ...next, items: mergeComments(current.items, next.items) }));
                setError(null);
            }
        } catch (error) {
            if (generation.current === requestGeneration) setError(commentError(error, locale));
        } finally {
            pageInFlight.current = false;
            setLoadingMore(false);
        }
    }

    async function create(value: CommentFormValue, parentId?: string) {
        const token = value.author_type === "google" ? await getIdToken() : await getIdToken().catch(() => null);
        const comment = await createComment(slug, { ...value, ...(parentId ? { parent_id: parentId } : {}) }, token);
        finishMutation();
        setPage((current) => ({ ...current, items: mergeComments(current.items, [comment]), total: current.total + 1 }));
        setLoading(false);
        setAction(null);
        setNotice(copy.created);
    }

    function actionForm(comment: ApiComment) {
        if (!action || action.id !== comment.id) return null;
        const kind = action.kind;
        const needsPassword = comment.author_type === "guest" && (kind === "edit" || !(user && comment.can_delete));
        return <CommentForm key={`${kind}-${comment.id}`} locale={locale} user={user} kind={kind}
            initialContent={kind === "edit" ? comment.content : ""} needsPassword={needsPassword}
            onLogin={signInWithGoogle} onCancel={() => setAction(null)} onSubmit={async (value) => {
                if (kind === "reply") { await create(value, comment.id); return; }
                const token = await getIdToken().catch(() => null);
                if (kind === "edit") {
                    const changed = await updateComment(slug, comment.id, { content: value.content, ...(value.password ? { password: value.password } : {}) }, token);
                    finishMutation();
                    setPage((current) => ({ ...current, items: mergeComments(current.items, [changed]) }));
                    setNotice(copy.updated);
                } else {
                    await deleteComment(slug, comment.id, value.password ? { password: value.password } : {}, token);
                    finishMutation();
                    setPage((current) => ({ ...current, total: Math.max(0, current.total - 1), items: current.items.map((item) => item.id === comment.id ? { ...item, is_deleted: true, content: "", author_name: "", can_edit: false, can_delete: false } : item) }));
                    setNotice(copy.removed);
                }
                setAction(null);
            }} />;
    }

    const ids = new Set(page.items.map((item) => item.id));
    const roots = page.items.filter((item) => !item.parent_id || !ids.has(item.parent_id));
    const replies = new Map<string, ApiComment[]>();
    page.items.forEach((item) => {
        if (item.parent_id && ids.has(item.parent_id)) replies.set(item.parent_id, [...(replies.get(item.parent_id) ?? []), item]);
    });

    function renderComment(comment: ApiComment) {
        return <CommentItem key={comment.id} comment={comment} locale={locale} signedIn={!!user} active={action?.id === comment.id}
            onAction={(kind) => { setAction({ id: comment.id, kind }); setNotice(""); }}>
            {actionForm(comment)}
        </CommentItem>;
    }

    return (
        <section id="comments" aria-labelledby="comments-heading" className="mt-16 mb-8 border-t border-dark/20 dark:border-light/20 pt-8 text-dark dark:text-light">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id="comments-heading" className="text-2xl font-bold">{copy.heading}{!loading && <span className="ml-2 text-accent dark:text-accentDark">{page.total}</span>}</h2>
                    <p className="mt-2 text-sm opacity-60">{copy.shared}</p>
                </div>
                {user && <button type="button" onClick={() => signOutUser().catch(() => setAuthError(true))} className="rounded py-2 text-sm underline underline-offset-4">{copy.logout}</button>}
            </div>
            {authError && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{copy.authError}</p>}
            <CommentForm locale={locale} user={user} onLogin={signInWithGoogle} onSubmit={create} />
            <p role="status" className="mt-3 min-h-5 text-sm text-accent dark:text-accentDark">{notice}</p>
            {loading && <p className="py-8 text-sm opacity-60" role="status">{copy.loading}</p>}
            {error && <div className="my-5 rounded-lg border border-red-500/30 p-4">
                <p role="alert" className="text-sm">{error}</p>
                <button type="button" className="mt-2 text-sm underline" onClick={() => { setLoading(true); setError(null); setRevision((value) => value + 1); }}>{copy.retry}</button>
            </div>}
            {!loading && !error && !page.items.length && <p className="py-8 text-sm opacity-60">{copy.empty}</p>}
            <div className="divide-y divide-dark/10 dark:divide-light/10">
                {roots.map((root) => <div key={root.id}>
                    {renderComment(root)}
                    {!!replies.get(root.id)?.length && <div className="mb-3 ml-4 sm:ml-9 border-l-2 border-dark/10 dark:border-light/20 pl-4 sm:pl-5 divide-y divide-dark/10 dark:divide-light/10">
                        {replies.get(root.id)!.map(renderComment)}
                    </div>}
                </div>)}
            </div>
            {page.next_cursor && <button type="button" disabled={loadingMore} onClick={loadMore} className="mt-5 w-full rounded-lg border border-dark/20 dark:border-light/20 px-4 py-3 text-sm font-medium disabled:opacity-50">{loadingMore ? copy.loading : copy.more}</button>}
        </section>
    );
}
