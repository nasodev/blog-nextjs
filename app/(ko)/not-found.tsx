import Link from "next/link";

// (ko) 그룹 안에서 notFound() 가 던져질 때(없는 글, 글이 없는 카테고리) 사이트 셸 안에서
// 렌더되도록 하는 경계. 이 파일이 없으면 Next 기본 not-found 가 헤더·푸터 없이 렌더된다.
export default function NotFound() {
    return (
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
    );
}
