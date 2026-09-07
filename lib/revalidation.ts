import { timingSafeEqual } from "node:crypto";
import { API_URL } from "@/lib/api/posts";

export async function revalidationAuthStatus(request: Request): Promise<number> {
    const secret = request.headers.get("x-revalidate-secret");
    if (secret) {
        const expected = process.env.REVALIDATE_SECRET;
        if (!expected) return 401;
        const actualBytes = Buffer.from(secret);
        const expectedBytes = Buffer.from(expected);
        return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes) ? 200 : 401;
    }

    const authorization = request.headers.get("authorization");
    if (!authorization || !/^Bearer \S+$/.test(authorization)) return 401;
    try {
        // Reuse the backend's Firebase verification AND administrator permission check.
        const response = await fetch(`${API_URL}/blog/admin/posts`, {
            headers: { Authorization: authorization },
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(5000),
        });
        await response.body?.cancel();
        if (response.ok) return 200;
        return response.status === 401 || response.status === 403 ? response.status : 503;
    } catch {
        return 503;
    }
}
