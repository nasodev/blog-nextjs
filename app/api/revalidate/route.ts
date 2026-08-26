import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import siteMetaData from "@/utils/siteMetaData";

// IndexNow(네이버·빙 즉시 색인 ping) 키 — 공개 URL(public/{키}.txt)로 검증되는 설계라
// 공개 값이며, 교체 시 public/의 키 파일도 반드시 같은 값으로 함께 교체해야 한다.
const INDEXNOW_KEY = "4421e8031a14f92fda7b86daa22cf760";

export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-revalidate-secret");
    if (!secret || secret !== (process.env.REVALIDATE_SECRET ?? process.env.NEXT_PUBLIC_REVALIDATE_SECRET)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await request.json().catch(() => null);
    const body = (parsed && typeof parsed === "object" ? parsed : {}) as { slug?: string };
    if (body.slug) {
        revalidateTag(`post:${body.slug}`, { expire: 0 });
    }
    revalidateTag("posts", { expire: 0 });

    // 저장/삭제된 글을 IndexNow 참여 엔진(네이버·빙 등, 구글은 미지원)에 알린다.
    // after()로 응답과 분리해 재검증 지연에 영향을 주지 않으며, 실패해도 무시한다.
    if (body.slug && process.env.NODE_ENV === "production") {
        const slug = body.slug;
        after(async () => {
            try {
                await fetch("https://api.indexnow.org/indexnow", {
                    method: "POST",
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                    body: JSON.stringify({
                        host: new URL(siteMetaData.siteUrl).host,
                        key: INDEXNOW_KEY,
                        keyLocation: `${siteMetaData.siteUrl}/${INDEXNOW_KEY}.txt`,
                        urlList: [`${siteMetaData.siteUrl}/blogs/${slug}`, siteMetaData.siteUrl],
                    }),
                });
            } catch {
                // ping 실패는 색인 지연일 뿐이므로 무시
            }
        });
    }

    return NextResponse.json({ revalidated: true, slug: body.slug ?? null });
}
