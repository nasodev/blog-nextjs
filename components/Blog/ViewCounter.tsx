"use client";

import React, { useEffect, useState, useRef } from "react";
import { incrementViewCount, getViewCount } from "@/lib/supabase/api/views";

interface ViewCounterProps {
    slug: string;
    noCount?: boolean;
    showCount?: boolean;
}

const ViewCounter: React.FC<ViewCounterProps> = ({ slug, noCount = false, showCount = true }) => {
    const [views, setViews] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const hasIncrementedRef = useRef(false);

    useEffect(() => {
        const incrementView = async () => {
            try {
                if (!hasIncrementedRef.current) {
                    await incrementViewCount(slug);
                    hasIncrementedRef.current = true;
                }
            } catch (err) {
                setError("조회수를 업데이트하는 중 오류가 발생했습니다.");
                console.error(err);
            }
        };

        if (!noCount) {
            incrementView();
        }
    }, [slug, noCount]);

    useEffect(() => {
        const fetchViewCount = async () => {
            try {
                const count = await getViewCount(slug);
                setViews(count);
            } catch (err) {
                setError("조회수를 가져오는 중 오류가 발생했습니다.");
                console.error(err);
            }
        };

        fetchViewCount();
    }, [slug]);

    if (!showCount) return null;
    if (error) return <div className="text-red-500 text-sm">{error}</div>;

    return <div>{views} views</div>;
};

export default ViewCounter;
