"use client";

import { useId, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { Locale } from "@/lib/i18n";
import { commentCopy, commentError } from "./copy";

export type CommentFormValue = { content: string; author_type: "google" | "guest"; guest_name?: string; password?: string };

export const commentInputClass = "mt-2 block w-full rounded-lg border border-dark/20 dark:border-light/20 bg-light dark:bg-dark px-3 py-2 text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accentDark disabled:opacity-60";
export const commentButtonClass = "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-light dark:bg-accentDark dark:text-dark disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-accentDark";

interface Props {
    locale: Locale;
    user: User | null;
    kind?: "create" | "reply" | "edit" | "delete";
    initialContent?: string;
    needsPassword?: boolean;
    onSubmit: (value: CommentFormValue) => Promise<void>;
    onCancel?: () => void;
    onLogin: () => Promise<void>;
}

export default function CommentForm({ locale, user, kind = "create", initialContent = "", needsPassword = false, onSubmit, onCancel, onLogin }: Props) {
    const copy = commentCopy[locale];
    const id = useId();
    const [choice, setChoice] = useState<"google" | "guest" | null>(null);
    const [content, setContent] = useState(initialContent);
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const inFlight = useRef(false);
    const creating = kind === "create" || kind === "reply";
    const mode = choice ?? (user ? "google" : "guest");
    const passwordRequired = creating ? mode === "guest" : needsPassword;
    const label = kind === "create" ? copy.createForm : kind === "reply" ? copy.replyForm : kind === "edit" ? copy.editForm : copy.deleteForm;
    const submitLabel = kind === "create" ? copy.submit : kind === "reply" ? copy.submitReply : kind === "edit" ? copy.save : copy.remove;

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (inFlight.current) return;
        if (kind !== "delete" && (!content.trim() || content.length > 5000)) { setError(copy.invalidContent); return; }
        if (creating && mode === "guest" && (!name.trim() || name.trim().length > 40)) { setError(copy.invalidName); return; }
        if (passwordRequired && (password.length < 8 || password.length > 128 || !password.trim())) { setError(copy.invalidPassword); return; }
        if (creating && mode === "google" && !user) { setError(copy.unauthenticated); return; }
        inFlight.current = true;
        setBusy(true);
        setError(null);
        try {
            await onSubmit({
                content: content.trim(), author_type: mode,
                ...(creating && mode === "guest" ? { guest_name: name.trim() } : {}),
                ...(passwordRequired ? { password } : {}),
            });
            setContent("");
            setPassword("");
        } catch (error) {
            setError(commentError(error, locale));
        } finally {
            inFlight.current = false;
            setBusy(false);
        }
    }

    return (
        <form aria-label={label} onSubmit={submit} className="rounded-xl border border-dark/20 dark:border-light/20 bg-dark/[0.02] dark:bg-light/[0.03] p-4 sm:p-5">
            <h3 className="font-semibold text-lg">{label}</h3>
            {creating && (
                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={locale === "ko" ? "작성 방식" : "Comment identity"}>
                    {(["google", "guest"] as const).map((value) => (
                        <button key={value} type="button" disabled={busy} aria-pressed={mode === value} onClick={() => { setChoice(value); setError(null); }}
                            className={`rounded-full border px-4 py-1.5 text-sm ${mode === value ? "border-accent bg-accent/10 dark:border-accentDark dark:bg-accentDark/10" : "border-dark/20 dark:border-light/20"}`}>
                            {copy[value]}
                        </button>
                    ))}
                </div>
            )}
            {creating && mode === "google" && (
                <div className="mt-4 text-sm">
                    {user ? <p>{user.displayName || copy.reader}</p> : <>
                        <p className="opacity-70">{copy.loginHint}</p>
                        <button type="button" className={`${commentButtonClass} mt-3`} disabled={busy} onClick={async () => {
                            if (inFlight.current) return;
                            inFlight.current = true;
                            setBusy(true);
                            try { await onLogin(); setError(null); }
                            catch { setError(copy.authError); }
                            finally { inFlight.current = false; setBusy(false); }
                        }}>{copy.login}</button>
                    </>}
                </div>
            )}
            {creating && mode === "guest" && (
                <label htmlFor={`${id}-name`} className="mt-4 block text-sm font-medium">{copy.nickname}
                    <input id={`${id}-name`} autoComplete="nickname" required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} className={commentInputClass} />
                </label>
            )}
            {kind === "delete" ? <p className="mt-4 text-sm opacity-80">{copy.deletePrompt}</p> : (
                <div className="mt-4 text-sm font-medium"><label htmlFor={`${id}-content`}>{copy.content}</label>
                    <textarea id={`${id}-content`} required maxLength={5000} rows={kind === "create" ? 4 : 3} value={content} onChange={(event) => setContent(event.target.value)} placeholder={copy.placeholder} disabled={busy} className={`${commentInputClass} resize-y`} />
                    <span className="mt-1 block text-right text-xs font-normal opacity-60">{content.length.toLocaleString()} / 5,000</span>
                </div>
            )}
            {passwordRequired && (
                <div className="mt-4 text-sm font-medium"><label htmlFor={`${id}-password`}>{copy.password}</label>
                    <input id={`${id}-password`} type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} placeholder={copy.passwordHint} className={commentInputClass} aria-describedby={`${id}-password-help`} />
                    <span id={`${id}-password-help`} className="mt-2 block text-xs font-normal opacity-70">{copy.guestHint}</span>
                </div>
            )}
            {error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="submit" disabled={busy || (creating && mode === "google" && !user)} className={commentButtonClass}>{busy ? copy.submitting : submitLabel}</button>
                {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="rounded px-2 py-2 text-sm underline underline-offset-4">{copy.cancel}</button>}
            </div>
        </form>
    );
}
