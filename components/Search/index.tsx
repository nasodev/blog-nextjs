"use client";

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";
import Fuse from "fuse.js";
import Link from "next/link";
import Image from "next/image";
import { allBlogs, Blog } from "contentlayer/generated";
import { SearchIcon } from "@/components/icons";

export interface SearchHandle {
    close: () => void;
}

const fuseOptions = {
    keys: ["title", "description", "tags"],
    threshold: 0.3,
    includeScore: true,
};

const fuse = new Fuse(
    allBlogs.filter((blog) => blog.isPublished),
    fuseOptions
);

interface SearchResult {
    item: Blog;
    score?: number;
}

const Search = forwardRef<SearchHandle>((_, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setQuery("");
        setResults([]);
        setSelectedIndex(0);
    }, []);

    useImperativeHandle(ref, () => ({
        close: closeModal
    }), [closeModal]);

    const handleSearch = useCallback((searchQuery: string) => {
        setQuery(searchQuery);
        setSelectedIndex(0);
        if (searchQuery.trim() === "") {
            setResults([]);
            return;
        }
        const searchResults = fuse.search(searchQuery);
        setResults(searchResults.slice(0, 6));
    }, []);

    const openModal = useCallback(() => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                if (isOpen) {
                    closeModal();
                } else {
                    openModal();
                }
            }
            if (e.key === "Escape" && isOpen) {
                closeModal();
            }
            if (e.key === "ArrowDown" && isOpen && results.length > 0) {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % results.length);
            }
            if (e.key === "ArrowUp" && isOpen && results.length > 0) {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
            }
            if (e.key === "Enter" && isOpen && results.length > 0) {
                e.preventDefault();
                const selectedResult = results[selectedIndex];
                if (selectedResult) {
                    window.location.href = selectedResult.item.url;
                    closeModal();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, openModal, closeModal, results, selectedIndex]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    return (
        <>
            <button
                onClick={openModal}
                className="inline-flex items-center justify-center w-6 h-6 mr-4 hover:scale-125 transition-all ease duration-200"
                aria-label="검색"
            >
                <SearchIcon className="w-5 h-5 dark:stroke-light" />
            </button>

            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4 sm:px-6"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="fixed inset-0 bg-dark/70 dark:bg-dark/85 z-[9998]" />
                    <div className="relative z-[9999] w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg bg-light dark:bg-[#1a1a1a] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-dark/5 dark:border-light/5">
                        {/* 검색 입력 영역 */}
                        <div className="flex items-center gap-2 px-3 sm:px-5 py-3 sm:py-4">
                            <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-accent dark:text-accentDark flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="검색..."
                                className="flex-1 min-w-0 bg-transparent text-dark dark:text-light text-sm sm:text-lg placeholder:text-gray/60 outline-none"
                            />
                            <button
                                onClick={closeModal}
                                className="flex-shrink-0 p-1 rounded-full hover:bg-dark/10 dark:hover:bg-light/10 transition-colors"
                                aria-label="닫기"
                            >
                                <svg className="w-5 h-5 text-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 검색 결과 영역 */}
                        <div className="max-h-[45vh] sm:max-h-[50vh] overflow-y-auto border-t border-dark/5 dark:border-light/5">
                            {query && results.length === 0 && (
                                <div className="py-12 text-center text-gray">
                                    <p className="text-lg">검색 결과가 없습니다</p>
                                    <p className="text-sm mt-1 text-gray/60">다른 키워드로 검색해보세요</p>
                                </div>
                            )}

                            {results.length > 0 && (
                                <ul className="py-1 sm:py-2">
                                    {results.map(({ item }, index) => (
                                        <li key={item._id}>
                                            <Link
                                                href={item.url}
                                                onClick={closeModal}
                                                className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2 sm:py-3 transition-colors ${
                                                    index === selectedIndex
                                                        ? "bg-accent/10 dark:bg-accentDark/10"
                                                        : "hover:bg-dark/5 dark:hover:bg-light/5"
                                                }`}
                                            >
                                                {item.image && (
                                                    <Image
                                                        src={item.image.filePath.replace("../public", "")}
                                                        alt={item.title}
                                                        width={48}
                                                        height={48}
                                                        className="rounded-lg object-cover w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-dark dark:text-light truncate text-sm sm:text-base">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-gray/80 truncate mt-0.5">
                                                        {item.description}
                                                    </p>
                                                </div>
                                                {index === selectedIndex && (
                                                    <span className="text-xs text-accent dark:text-accentDark flex-shrink-0 hidden sm:block">
                                                        Enter ↵
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {!query && (
                                <div className="py-8 sm:py-12 text-center">
                                    <p className="text-gray/80 text-sm sm:text-base">블로그 글을 검색하세요</p>
                                </div>
                            )}
                        </div>

                        {/* 하단 단축키 안내 */}
                        <div className="flex items-center justify-center gap-3 sm:gap-6 px-3 sm:px-5 py-2 sm:py-3 border-t border-dark/5 dark:border-light/5 bg-dark/[0.02] dark:bg-light/[0.02]">
                            <span className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray/60">
                                <kbd className="px-1 sm:px-1.5 py-0.5 bg-dark/5 dark:bg-light/10 rounded text-gray/80">↑</kbd>
                                <kbd className="px-1 sm:px-1.5 py-0.5 bg-dark/5 dark:bg-light/10 rounded text-gray/80">↓</kbd>
                                <span>이동</span>
                            </span>
                            <span className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray/60">
                                <kbd className="px-1 sm:px-1.5 py-0.5 bg-dark/5 dark:bg-light/10 rounded text-gray/80">Enter</kbd>
                                <span>선택</span>
                            </span>
                            <span className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray/60">
                                <kbd className="px-1 sm:px-1.5 py-0.5 bg-dark/5 dark:bg-light/10 rounded text-gray/80">ESC</kbd>
                                <span>닫기</span>
                            </span>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});

Search.displayName = "Search";

export default Search;
