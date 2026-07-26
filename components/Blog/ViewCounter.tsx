"use client";

import React, { useEffect, useState, useRef } from "react";
import { incrementView } from "@/lib/api/views";

interface ViewCounterProps {
    slug: string;
    noCount?: boolean;
    showCount?: boolean;
}

const ViewCounter: React.FC<ViewCounterProps> = ({ slug, noCount = false, showCount = true }) => {
    const [views, setViews] = useState(0);
    const [failed, setFailed] = useState(false);
    const hasIncrementedRef = useRef(false);

    useEffect(() => {
        const handleViews = async () => {
            try {
                if (!noCount && !hasIncrementedRef.current) {
                    const count = await incrementView(slug);
                    hasIncrementedRef.current = true;
                    setViews(count);
                }
            } catch (err) {
                // 조회수 실패는 조용히 무시 (spec §6) — 콘솔에만 남긴다
                setFailed(true);
                console.error(err);
            }
        };

        handleViews();
    }, [slug, noCount]);

    if (!showCount || failed) return null;

    return <div>{views} views</div>;
};

export default ViewCounter;
