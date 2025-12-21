import { supabase } from "../client";

export interface ViewCount {
    count: number;
}

export const incrementViewCount = async (slug: string): Promise<void> => {
    try {
        const { error } = await supabase.rpc("increment", {
            slug_text: slug,
        });
        if (error) throw error;
    } catch (error) {
        console.error("Error incrementing view count:", error);
        throw error;
    }
};

export const getViewCount = async (slug: string): Promise<number> => {
    try {
        const { data: views, error } = await supabase.from("views").select("count").eq("slug", slug).maybeSingle();

        if (error) throw error;
        return views?.count ?? 0;
    } catch (error) {
        console.error("Error getting view count:", error);
        throw error;
    }
};
