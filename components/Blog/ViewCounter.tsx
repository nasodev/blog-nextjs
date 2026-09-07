"use client";

import { useEffect, useState, useRef } from "react";
import { incrementView } from "@/lib/api/views";

interface ViewCounterProps {
    slug: string;
    initialViews?: number;
    noCount?: boolean;
    showCount?: boolean;
}

const ViewCounter = ({ slug, initialViews = 0, noCount = false, showCount = true }: ViewCounterProps) => {
    const [result, setResult] = useState<{ slug: string; count: number } | null>(null);
    const requestRef = useRef<{ slug: string; promise: Promise<number> } | null>(null);

    useEffect(() => {
        if (noCount) return;
        if (requestRef.current?.slug !== slug) {
            requestRef.current = { slug, promise: incrementView(slug) };
        }
        let active = true;
        // Strict Mode's second effect subscribes to the same in-flight request.
        requestRef.current.promise.then((count) => {
            if (active) setResult({ slug, count });
        }).catch(() => { /* Keep the server's last known count when offline. */ });
        return () => { active = false; };
    }, [slug, noCount]);

    if (!showCount) return null;
    return <div>{result?.slug === slug ? result.count : initialViews} views</div>;
};

export default ViewCounter;
