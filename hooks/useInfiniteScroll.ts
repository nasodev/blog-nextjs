import { useState, useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions<T> {
    items: T[];
    itemsPerPage: number;
}

interface UseInfiniteScrollReturn<T> {
    displayedItems: T[];
    hasMore: boolean;
    loadMoreRef: React.RefObject<HTMLDivElement>;
    isLoading: boolean;
}

export function useInfiniteScroll<T>({
    items,
    itemsPerPage,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
    const [displayCount, setDisplayCount] = useState(itemsPerPage);
    const [isLoading, setIsLoading] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const displayedItems = items.slice(0, displayCount);
    const hasMore = displayCount < items.length;

    const loadMore = useCallback(() => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        // 짧은 딜레이로 로딩 상태 표시 (UX 개선)
        setTimeout(() => {
            setDisplayCount((prev) => Math.min(prev + itemsPerPage, items.length));
            setIsLoading(false);
        }, 300);
    }, [isLoading, hasMore, itemsPerPage, items.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [hasMore, isLoading, loadMore]);

    // items가 변경되면 displayCount 리셋
    useEffect(() => {
        setDisplayCount(itemsPerPage);
    }, [items, itemsPerPage]);

    return {
        displayedItems,
        hasMore,
        loadMoreRef,
        isLoading,
    };
}
