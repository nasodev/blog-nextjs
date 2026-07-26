"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeMirror from "@uiw/react-codemirror";
import { html as htmlLang } from "@codemirror/lang-html";
import { createPost, updatePost, uploadImage, requestRevalidate, PostPayload } from "@/lib/api/admin";
import { ApiPostDetail } from "@/lib/api/types";
import { API_URL } from "@/lib/api/posts";

const DRAFT_KEY = (slug: string) => `blog-draft:${slug}`;

interface Meta {
    slug: string;
    title: string;
    description: string;
    tags: string;          // 콤마 구분 입력
    cover_image_url: string;
    is_published: boolean;
}

const PostEditor = ({ initial }: { initial: ApiPostDetail | null }) => {
    const router = useRouter();
    const isNew = initial === null;
    const draftKey = DRAFT_KEY(initial?.slug ?? "new");  // 컴포넌트 생명주기 동안 고정 (initial은 마운트 후 안 바뀜)
    const [meta, setMeta] = useState<Meta>({
        slug: initial?.slug ?? "",
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        tags: initial?.tags.join(", ") ?? "",
        cover_image_url: initial?.cover_image_url ?? "",
        is_published: initial?.is_published ?? true,
    });
    const [content, setContent] = useState(initial?.content_html ?? "");
    const [status, setStatus] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [revalidateFailed, setRevalidateFailed] = useState<string | null>(null);  // 실패한 slug

    // 최신 메타/콘텐츠를 ref로 추적 — 인터벌이 키 입력마다 재등록되지 않도록 함
    const latestDraftRef = useRef({ meta, content });
    useEffect(() => {
        latestDraftRef.current = { meta, content };
    }, [meta, content]);

    // 초안 자동 백업 (5초 간격 — draftKey가 고정이므로 인터벌은 마운트 시 한 번만 등록됨)
    useEffect(() => {
        const timer = setInterval(() => {
            localStorage.setItem(draftKey, JSON.stringify({ ...latestDraftRef.current, at: Date.now() }));
        }, 5000);
        return () => clearInterval(timer);
    }, [draftKey]);

    // 초안 복구 제안 (마운트 시 1회)
    useEffect(() => {
        const raw = localStorage.getItem(draftKey);
        if (!raw) return;
        try {
            const draft = JSON.parse(raw);
            if (draft.content && draft.content !== (initial?.content_html ?? "")) {
                if (window.confirm("저장되지 않은 초안이 있습니다. 복구할까요?")) {
                    // 마운트 시 1회, 사용자 확인 후 복구 — 외부 저장소(localStorage) 동기화이며
                    // 렌더 중 계산으로 대체 불가 (window.confirm은 effect 밖에서 호출 불가)
                    /* eslint-disable-next-line react-hooks/set-state-in-effect */
                    setMeta(draft.meta);
                    setContent(draft.content);
                }
            }
        } catch {
            /* 손상된 초안 무시 */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const insertAtCursor = useCallback((text: string) => {
        setContent((prev) => prev + "\n" + text);  // 단순화: 끝에 추가 (커서 삽입은 CodeMirror view API로 개선 가능)
    }, []);

    const handleImageFiles = useCallback(
        async (files: FileList | File[]) => {
            for (const file of Array.from(files)) {
                if (!file.type.startsWith("image/")) continue;
                setStatus(`업로드 중: ${file.name}...`);
                try {
                    const { url } = await uploadImage(file);
                    insertAtCursor(`<img src="${API_URL}${url}" alt="" loading="lazy" />`);
                    setStatus(`업로드 완료: ${file.name}`);
                } catch (e) {
                    setStatus(`업로드 실패: ${String(e)}`);
                }
            }
        },
        [insertAtCursor]
    );

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);
        const payload: PostPayload = {
            title: meta.title,
            description: meta.description,
            content_html: content,
            cover_image_url: meta.cover_image_url || null,
            tags: meta.tags.split(",").map((t) => t.trim()).filter(Boolean),
            is_published: meta.is_published,
        };
        try {
            const saved = isNew
                ? await createPost({ ...payload, slug: meta.slug })
                : await updatePost(initial!.slug, payload);
            try {
                await requestRevalidate(saved.slug);
                setStatus("저장 + 반영 완료");
                setRevalidateFailed(null);
            } catch {
                setStatus("저장됨 — 캐시 반영 실패");
                setRevalidateFailed(saved.slug);
            }
            localStorage.removeItem(draftKey);
            if (isNew) router.replace(`/admin/posts/${saved.slug}`);
        } catch (e) {
            setStatus(`저장 실패: ${String(e)}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="px-5 py-6">
            {/* 메타데이터 폼 */}
            <div className="grid grid-cols-2 gap-3 mb-4 max-w-4xl">
                <input
                    className="border rounded px-3 py-2 bg-transparent"
                    placeholder="slug (kebab-case)"
                    value={meta.slug}
                    disabled={!isNew}
                    onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2 bg-transparent"
                    placeholder="제목"
                    value={meta.title}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2 bg-transparent col-span-2"
                    placeholder="설명"
                    value={meta.description}
                    onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2 bg-transparent"
                    placeholder="태그 (콤마 구분)"
                    value={meta.tags}
                    onChange={(e) => setMeta({ ...meta, tags: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2 bg-transparent"
                    placeholder="커버 이미지 URL"
                    value={meta.cover_image_url}
                    onChange={(e) => setMeta({ ...meta, cover_image_url: e.target.value })}
                />
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={meta.is_published}
                        onChange={(e) => setMeta({ ...meta, is_published: e.target.checked })}
                    />
                    발행
                </label>
                <div className="flex items-center gap-3 justify-end">
                    {status && <span className="text-sm opacity-70">{status}</span>}
                    {revalidateFailed && (
                        <button
                            onClick={async () => {
                                try {
                                    await requestRevalidate(revalidateFailed);
                                    setStatus("반영 완료");
                                    setRevalidateFailed(null);
                                } catch {
                                    setStatus("반영 재시도 실패");
                                }
                            }}
                            className="px-4 py-2 rounded-lg border border-red-500 text-red-500"
                        >
                            반영 재시도
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg bg-accent text-light disabled:opacity-50"
                    >
                        {saving ? "저장 중..." : "저장"}
                    </button>
                </div>
            </div>

            {/* 에디터 + 프리뷰 분할 뷰 */}
            <div
                className="grid grid-cols-2 gap-4 h-[calc(100vh-260px)]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    handleImageFiles(e.dataTransfer.files);
                }}
                onPaste={(e) => {
                    const files = Array.from(e.clipboardData.files);
                    if (files.length) {
                        e.preventDefault();
                        handleImageFiles(files);
                    }
                }}
            >
                <div className="overflow-auto border rounded">
                    <CodeMirror
                        value={content}
                        height="100%"
                        extensions={[htmlLang()]}
                        onChange={setContent}
                    />
                </div>
                <div className="border rounded overflow-hidden">
                    {/* Task 9: <EditorPreview html={content} /> */}
                    <div className="p-4 text-sm opacity-50">프리뷰 (다음 태스크)</div>
                </div>
            </div>
        </main>
    );
};

export default PostEditor;
