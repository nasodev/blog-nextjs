"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Fuse from "fuse.js";
import Link from "next/link";
import Image from "next/image";
import { allBlogs, Blog } from "contentlayer/generated";
import { SearchIcon, CloseIcon } from "@/components/icons";

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

export default function Search() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback((searchQuery: string) => {
        setQuery(searchQuery);
        if (searchQuery.trim() === "") {
            setResults([]);
            return;
        }
        const searchResults = fuse.search(searchQuery);
        setResults(searchResults.slice(0, 5));
    }, []);

    const openModal = useCallback(() => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setQuery("");
        setResults([]);
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
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, openModal, closeModal]);

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

            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="fixed inset-0 bg-dark/50 dark:bg-dark/70" />
                    <div
                        ref={modalRef}
                        className="relative w-full max-w-xl bg-light dark:bg-dark border border-dark/10 dark:border-light/10 rounded-xl shadow-2xl"
                    >
                        <div className="flex items-center px-4 border-b border-dark/10 dark:border-light/10">
                            <SearchIcon className="w-5 h-5 text-gray dark:text-light/60" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="검색어를 입력하세요..."
                                className="flex-1 px-3 py-4 bg-transparent text-dark dark:text-light placeholder:text-gray outline-none"
                            />
                            <div className="flex items-center gap-2">
                                <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-gray bg-dark/5 dark:bg-light/10 rounded">
                                    ESC
                                </kbd>
                                <button
                                    onClick={closeModal}
                                    className="p-1 hover:bg-dark/5 dark:hover:bg-light/10 rounded"
                                >
                                    <CloseIcon className="w-5 h-5 text-gray dark:text-light/60" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                            {query && results.length === 0 && (
                                <div className="p-8 text-center text-gray">
                                    검색 결과가 없습니다.
                                </div>
                            )}

                            {results.length > 0 && (
                                <ul className="p-2">
                                    {results.map(({ item }) => (
                                        <li key={item._id}>
                                            <Link
                                                href={item.url}
                                                onClick={closeModal}
                                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-dark/5 dark:hover:bg-light/10 transition-colors"
                                            >
                                                {item.image && (
                                                    <Image
                                                        src={item.image.filePath.replace("../public", "")}
                                                        alt={item.title}
                                                        width={60}
                                                        height={40}
                                                        className="rounded object-cover aspect-video"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-dark dark:text-light truncate">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-gray truncate">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {!query && (
                                <div className="p-8 text-center text-gray">
                                    <p className="mb-2">블로그 글을 검색하세요</p>
                                    <p className="text-sm">
                                        <kbd className="px-2 py-1 text-xs bg-dark/5 dark:bg-light/10 rounded">
                                            Ctrl
                                        </kbd>
                                        {" + "}
                                        <kbd className="px-2 py-1 text-xs bg-dark/5 dark:bg-light/10 rounded">
                                            K
                                        </kbd>
                                        {" 로 언제든 검색창을 열 수 있습니다"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
