"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
}

const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey,
});

const ViewCounter = ({
    slug,
    noCount = false,
    showCount = true,
}: {
    slug: string;
    noCount?: boolean;
    showCount?: boolean;
}) => {
    const [views, setViews] = useState(0);
    const hasIncrementedRef = useRef(false);

    useEffect(() => {
        console.log("Effect running, hasIncremented:", hasIncrementedRef.current);

        const incrementView = async () => {
            try {
                if (!hasIncrementedRef.current) {
                    console.log("Attempting to increment view");
                    let { error } = await supabase.rpc("increment", {
                        slug_text: slug,
                    });
                    if (error) console.error(error);
                    hasIncrementedRef.current = true;
                    console.log("View incremented, hasIncremented set to:", hasIncrementedRef.current);
                }
            } catch (error) {
                console.error(error);
            }
        };

        if (!noCount) {
            incrementView();
        }

        return () => {
            console.log("Cleanup: Effect is being cleaned up");
        };
    }, [slug, noCount]);

    useEffect(() => {
        const getViews = async () => {
            try {
                let { data: views, error } = await supabase.from("views").select("count").eq("slug", slug);
                if (error) console.error(error);
                else setViews(views?.[0]?.count || 0);
            } catch (error) {
                console.error(error);
            }
        };

        getViews();
    }, [slug]);

    if (!showCount) return null;
    return <div>{views}</div>;
};

export default ViewCounter;
