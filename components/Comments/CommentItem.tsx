import type { ReactNode } from "react";
import type { ApiComment } from "@/lib/api/comments";
import type { Locale } from "@/lib/i18n";
import { commentCopy } from "./copy";

export type CommentAction = "reply" | "edit" | "delete";

export default function CommentItem({ comment, locale, signedIn, active, onAction, children }: {
    comment: ApiComment;
    locale: Locale;
    signedIn: boolean;
    active: boolean;
    onAction: (action: CommentAction) => void;
    children?: ReactNode;
}) {
    const copy = commentCopy[locale];
    const guest = comment.author_type === "guest";
    return (
        <article id={`comment-${comment.id}`} className="min-w-0 py-5 scroll-mt-24" aria-label={comment.is_deleted ? copy.deleted : comment.author_name}>
            {comment.is_deleted ? <p className="text-sm italic opacity-60">{copy.deleted}</p> : <>
                <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 dark:bg-accentDark/10 text-sm font-bold text-accent dark:text-accentDark">{Array.from(comment.author_name)[0] || "?"}</span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="min-w-0 max-w-full break-words font-semibold">{comment.author_name}</span>
                            <span className="rounded border border-dark/10 dark:border-light/20 px-1.5 py-0.5 text-xs opacity-60">{guest ? copy.guest : comment.author_type === "github" ? "GitHub" : "Google"}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-2 text-xs opacity-60">
                            <time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString(locale === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</time>
                            {comment.updated_at !== comment.created_at && <span>{copy.edited}</span>}
                            {comment.source_url && <a href={comment.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{copy.imported}</a>}
                        </div>
                    </div>
                </div>
                <p className="native-comment-body mt-3 whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">{comment.content}</p>
                {!active && <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {!comment.parent_id && <button type="button" onClick={() => onAction("reply")} className="rounded py-1 underline underline-offset-4">{copy.reply}</button>}
                    {(guest || (signedIn && comment.can_edit)) && <button type="button" onClick={() => onAction("edit")} className="rounded py-1 underline underline-offset-4">{copy.edit}</button>}
                    {(guest || (signedIn && comment.can_delete)) && <button type="button" onClick={() => onAction("delete")} className="rounded py-1 text-red-700 dark:text-red-300 underline underline-offset-4">{copy.remove}</button>}
                </div>}
            </>}
            {children && <div className="mt-4">{children}</div>}
        </article>
    );
}
