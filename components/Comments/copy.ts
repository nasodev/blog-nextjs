import { CommentApiError } from "@/lib/api/comments";
import type { Locale } from "@/lib/i18n";

export const commentCopy = {
    ko: {
        heading: "댓글", shared: "한글·영문 페이지가 같은 댓글을 공유합니다.",
        createForm: "댓글 작성", replyForm: "답글 작성", editForm: "댓글 수정", deleteForm: "댓글 삭제",
        google: "Google 계정", guest: "비회원", login: "Google로 로그인", logout: "로그아웃",
        loginHint: "Google 계정으로 로그인한 뒤 댓글을 남길 수 있습니다.",
        guestHint: "비밀번호는 이 댓글을 수정하거나 삭제할 때 필요합니다.",
        nickname: "닉네임", password: "비밀번호", passwordHint: "8–128자", content: "댓글 내용",
        placeholder: "궁금한 점이나 의견을 남겨 주세요.",
        submit: "댓글 등록", submitReply: "답글 등록", save: "수정 저장", remove: "삭제", cancel: "취소",
        reply: "답글", edit: "수정", submitting: "처리 중…", loading: "댓글을 불러오는 중…",
        empty: "아직 댓글이 없습니다. 첫 의견을 남겨 주세요.", retry: "다시 시도", more: "댓글 더 보기",
        deleted: "삭제된 댓글입니다.", edited: "수정됨", imported: "GitHub에서 옮긴 댓글",
        deletePrompt: "이 댓글을 삭제할까요? 기존 답글은 유지됩니다.",
        invalidContent: "댓글을 1–5,000자로 입력해 주세요.", invalidName: "닉네임을 1–40자로 입력해 주세요.",
        invalidPassword: "비밀번호를 공백만으로 구성되지 않은 8–128자로 입력해 주세요.",
        authError: "Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.",
        unauthenticated: "Google 로그인 상태를 확인해 주세요.", forbidden: "권한이 없거나 비밀번호가 올바르지 않습니다.",
        notFound: "글이나 댓글을 찾을 수 없습니다.", invalid: "입력 내용을 확인해 주세요.",
        limited: "요청이 많습니다. 잠시 후 다시 시도해 주세요.", unavailable: "댓글 서비스에 연결하지 못했습니다. 다시 시도해 주세요.",
        created: "댓글이 등록되었습니다.", updated: "댓글을 수정했습니다.", removed: "댓글을 삭제했습니다.", reader: "Google 사용자",
    },
    en: {
        heading: "Comments", shared: "Korean and English pages share this conversation.",
        createForm: "Write a comment", replyForm: "Write a reply", editForm: "Edit comment", deleteForm: "Delete comment",
        google: "Google account", guest: "Guest", login: "Sign in with Google", logout: "Sign out",
        loginHint: "Sign in with your Google account to leave a comment.",
        guestHint: "You will need this password to edit or delete this comment.",
        nickname: "Nickname", password: "Password", passwordHint: "8–128 characters", content: "Comment",
        placeholder: "Share a question or your thoughts.",
        submit: "Post comment", submitReply: "Post reply", save: "Save changes", remove: "Delete", cancel: "Cancel",
        reply: "Reply", edit: "Edit", submitting: "Working…", loading: "Loading comments…",
        empty: "No comments yet. Start the conversation.", retry: "Try again", more: "Load more comments",
        deleted: "This comment was deleted.", edited: "Edited", imported: "Imported from GitHub",
        deletePrompt: "Delete this comment? Existing replies will remain.",
        invalidContent: "Enter a comment between 1 and 5,000 characters.", invalidName: "Enter a nickname between 1 and 40 characters.",
        invalidPassword: "Enter a password of 8–128 characters that is not only whitespace.",
        authError: "Google sign-in could not be completed. Please try again.",
        unauthenticated: "Please check your Google sign-in.", forbidden: "You do not have permission, or the password is incorrect.",
        notFound: "The post or comment could not be found.", invalid: "Please check your input.",
        limited: "Too many requests. Please try again shortly.", unavailable: "Could not connect to comments. Please try again.",
        created: "Your comment was posted.", updated: "Your comment was updated.", removed: "The comment was deleted.", reader: "Google user",
    },
};

export function commentError(error: unknown, locale: Locale): string {
    const copy = commentCopy[locale];
    if (!(error instanceof CommentApiError)) return copy.unavailable;
    if (error.status === 401) return copy.unauthenticated;
    if (error.status === 403) return copy.forbidden;
    if (error.status === 404) return copy.notFound;
    if (error.status === 400 || error.status === 422) return copy.invalid;
    if (error.status === 429) return error.retryAfter
        ? (locale === "ko" ? `${error.retryAfter}초 후 다시 시도해 주세요.` : `Please try again in ${error.retryAfter} seconds.`)
        : copy.limited;
    return copy.unavailable;
}
