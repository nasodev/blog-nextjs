import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-revalidate-secret");
    if (!secret || secret !== process.env.REVALIDATE_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await request.json().catch(() => null);
    const body = (parsed && typeof parsed === "object" ? parsed : {}) as { slug?: string };
    if (body.slug) {
        revalidateTag(`post:${body.slug}`, { expire: 0 });
    }
    revalidateTag("posts", { expire: 0 });

    return NextResponse.json({ revalidated: true, slug: body.slug ?? null });
}
