"use client";

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import type Fuse from "fuse.js";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getPublishedPosts } from "@/lib/api/posts";
import { Locale } from "@/lib/i18n";
import { BlogSummary, toBlogSummary } from "@/utils/blogData";
import { SearchIcon } from "@/components/icons";

export interface SearchHandle {
    close: () => void;
}

const Search = forwardRef<SearchHandle, { locale: Locale }>(({ locale }, ref) => {
    const router = useRouter();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [searchIndex, setSearchIndex] = useState<Fuse<BlogSummary> | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const results = query.trim() ? searchIndex?.search(query.trim()).slice(0, 6) ?? [] : [];
    const en = locale === "en";
    const closeModal = useCallback(() => dialogRef.current?.close(), []);

    useImperativeHandle(ref, () => ({ close: closeModal }), [closeModal]);

    const loadIndex = useCallback(async () => {
        if (loading || searchIndex) return;
        setLoading(true);
        setLoadError(false);
        try {
            const [{ default: Fuse }, posts] = await Promise.all([
                import("fuse.js"), getPublishedPosts(undefined, locale),
            ]);
            setSearchIndex(new Fuse(posts.map(toBlogSummary), {
                keys: ["title", "description", "tags"], threshold: 0.3,
            }));
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [loading, searchIndex, locale]);

    const openModal = useCallback(() => {
        dialogRef.current?.showModal();
        setIsOpen(true);
        inputRef.current?.focus();
        void loadIndex();
    }, [loadIndex]);

    useEffect(() => {
        const shortcut = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                if (dialogRef.current?.open) closeModal();
                else openModal();
            }
        };
        document.addEventListener("keydown", shortcut);
        return () => document.removeEventListener("keydown", shortcut);
    }, [openModal, closeModal]);

    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [isOpen]);

    return (
        <>
            <button onClick={openModal} aria-label={en ? "Search" : "검색"} aria-haspopup="dialog"
                className="inline-flex items-center justify-center w-11 h-11">
                <SearchIcon className="w-5 h-5 dark:stroke-light" />
            </button>
            <dialog ref={dialogRef} aria-label={en ? "Search posts" : "블로그 글 검색"}
                className="w-[calc(100%-2rem)] max-w-lg mt-[10vh] p-0 rounded-xl border border-dark/10 dark:border-light/20 bg-light dark:bg-dark text-dark dark:text-light shadow-2xl backdrop:bg-dark/70 normal-case text-left"
                onClose={() => { setIsOpen(false); setQuery(""); setSelectedIndex(0); }}
                onKeyDown={(event) => {
                    if (event.key === "Escape" && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        event.stopPropagation();
                        closeModal();
                    }
                }}
                onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
                }}>
                <div className="flex items-center gap-2 px-4 py-2">
                    <SearchIcon className="w-5 h-5 shrink-0" />
                    <input ref={inputRef} type="search" value={query} role="combobox"
                        aria-label={en ? "Search posts" : "블로그 글 검색"}
                        aria-autocomplete="list" aria-expanded={results.length > 0} aria-controls="search-results"
                        aria-activedescendant={results[selectedIndex] ? `search-result-${selectedIndex}` : undefined}
                        placeholder={en ? "Search posts..." : "검색어를 입력하세요"}
                        className="flex-1 min-w-0 border-0 bg-transparent text-base focus:ring-0"
                        onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }}
                        onKeyDown={(event) => {
                            if (event.nativeEvent.isComposing || event.keyCode === 229 || !results.length) return;
                            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                                event.preventDefault();
                                const next = (selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
                                setSelectedIndex(next);
                                document.getElementById(`search-result-${next}`)?.scrollIntoView({ block: "nearest" });
                            } else if (event.key === "Enter" && results[selectedIndex]) {
                                event.preventDefault();
                                router.push(results[selectedIndex].item.url);
                                closeModal();
                            }
                        }} />
                    <button onClick={closeModal} aria-label={en ? "Close search" : "검색 닫기"}
                        className="w-11 h-11 shrink-0 rounded-lg hover:bg-dark/10 dark:hover:bg-light/10">✕</button>
                </div>
                <div className="border-t border-dark/10 dark:border-light/20 max-h-[55vh] overflow-y-auto" aria-busy={loading}>
                    <div role="status" className="text-center text-sm text-dark/70 dark:text-light/80">
                        {loading && <p className="p-6">{en ? "Loading posts..." : "글을 불러오는 중입니다..."}</p>}
                        {loadError && <div className="p-6">
                            <p>{en ? "Search is unavailable. Please try again." : "검색 데이터를 불러오지 못했습니다."}</p>
                            <button onClick={() => void loadIndex()} className="mt-3 px-4 py-2 underline">{en ? "Retry" : "다시 시도"}</button>
                        </div>}
                        {!loading && !loadError && <p className="p-4">{query.trim()
                            ? en ? `${results.length} results` : `검색 결과 ${results.length}개`
                            : en ? "Search by title, description or tag." : "제목, 설명, 태그로 검색하세요."}</p>}
                    </div>
                    <ul id="search-results" role="listbox" aria-label={en ? "Search results" : "검색 결과"}>
                        {results.map(({ item }, index) => (
                            <li key={item._id} role="presentation">
                                <Link href={item.url} id={`search-result-${index}`} role="option"
                                    aria-selected={index === selectedIndex} tabIndex={-1} onClick={closeModal}
                                    className={`flex items-center gap-3 px-4 py-3 ${index === selectedIndex ? "bg-accent/10 dark:bg-accentDark/10" : "hover:bg-dark/5 dark:hover:bg-light/5"}`}>
                                    <Image src={item.image} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-cover" />
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{item.title}</p>
                                        <p className="text-sm opacity-75 truncate">{item.description}</p>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="px-4 py-3 text-xs text-center border-t border-dark/10 dark:border-light/20">
                    {en ? "↑ ↓ Navigate · Enter Select · Esc Close" : "↑ ↓ 이동 · Enter 선택 · Esc 닫기"}
                </p>
            </dialog>
        </>
    );
});

Search.displayName = "Search";
export default Search;
