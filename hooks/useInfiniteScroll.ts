import { useState, useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions<T> {
    items: T[];
    itemsPerPage: number;
}

interface UseInfiniteScrollReturn<T> {
    displayedItems: T[];
    hasMore: boolean;
    loadMoreRef: React.RefObject<HTMLDivElement | null>;
    isLoading: boolean;
}

export function useInfiniteScroll<T>({
    items,
    itemsPerPage,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
    // 초기값을 전체 개수로 두어 모든 카드가 서버 HTML에 포함되게 한다 —
    // itemsPerPage로 시작하면 크롤러가 처음 N개 글 링크만 볼 수 있다(SEO).
    // 글이 수백 개 규모로 늘면 실제 페이지네이션(<a href> 링크)으로 전환할 것.
    const [displayCount, setDisplayCount] = useState(items.length);
    const [isLoading, setIsLoading] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // items가 바뀌면 displayCount를 리셋한다. effect 대신 렌더링 중
    // 상태를 조정하는 React 공식 패턴을 사용해 추가 렌더 사이클을 피한다.
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    const [prevItems, setPrevItems] = useState(items);
    if (items !== prevItems) {
        setPrevItems(items);
        setDisplayCount(items.length);
    }

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

    return {
        displayedItems,
        hasMore,
        loadMoreRef,
        isLoading,
    };
}
