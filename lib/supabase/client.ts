import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// 싱글톤 패턴으로 Supabase 클라이언트 생성
export const supabase = createBrowserClient(
    SUPABASE_URL as string,
    SUPABASE_ANON_KEY as string
);
