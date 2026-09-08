import type { Metadata } from "next";
import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";

// (ko)·(en) 두 개의 루트 레이아웃으로 나뉜 뒤에는 그룹 위쪽에 사이트 셸을 둘 수 없어,
// 어떤 라우트에도 매칭되지 않는 URL 의 404 가 Next 기본 셸(html/body 만)로 렌더된다.
// global-not-found 는 문서 전체를 직접 렌더할 수 있는 유일한 지점이므로 SiteLayout 을
// 그대로 재사용해 헤더·푸터·lang·테마 스크립트를 되살린다.
export const metadata: Metadata = {
    title: "404 — 페이지를 찾을 수 없습니다",
    robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
    return (
        <SiteLayout locale="ko">
            <section className="w-full flex flex-col items-center justify-center text-dark dark:text-light px-5 sxl:px-32 py-24 sm:py-32">
                <p className="font-mr font-bold text-accent dark:text-accentDark text-6xl sm:text-8xl">404</p>
                <h1 className="mt-6 font-bold text-2xl sm:text-4xl text-center">
                    페이지를 찾을 수 없습니다
                </h1>
                <p className="mt-4 text-base sm:text-lg text-center max-w-xl opacity-80">
                    주소가 바뀌었거나 삭제된 글일 수 있습니다.
                </p>
                <div className="mt-10 flex flex-wrap gap-3 justify-center">
                    <Link
                        href="/"
                        className="inline-block font-medium rounded-lg px-6 py-3 bg-dark text-light dark:bg-light dark:text-dark hover:scale-105 transition-all ease duration-200"
                    >
                        홈으로
                    </Link>
                    <Link
                        href="/categories/all"
                        className="inline-block font-medium rounded-lg px-6 py-3 border-2 border-solid border-dark dark:border-light hover:scale-105 transition-all ease duration-200"
                    >
                        전체 글 보기
                    </Link>
                </div>
            </section>
        </SiteLayout>
    );
}
