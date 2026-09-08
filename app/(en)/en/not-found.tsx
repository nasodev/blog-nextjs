import Link from "next/link";

// 영문 글이 아직 하나도 발행되지 않아 /en/blogs/* 전부가 이 경계를 타고, /en/categories/*
// 도 태그가 없으면 여기로 온다. 셸 없이 렌더되지 않도록 (en) 쪽에도 같은 경계를 둔다.
export default function NotFound() {
    return (
        <section className="w-full flex flex-col items-center justify-center text-dark dark:text-light px-5 sxl:px-32 py-24 sm:py-32">
            <p className="font-mr font-bold text-accent dark:text-accentDark text-6xl sm:text-8xl">404</p>
            <h1 className="mt-6 font-bold text-2xl sm:text-4xl text-center">
                Page not found
            </h1>
            <p className="mt-4 text-base sm:text-lg text-center max-w-xl opacity-80">
                This page may have moved, or the English translation is not published yet.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 justify-center">
                <Link
                    href="/en"
                    className="inline-block font-medium rounded-lg px-6 py-3 bg-dark text-light dark:bg-light dark:text-dark hover:scale-105 transition-all ease duration-200"
                >
                    English home
                </Link>
                <Link
                    href="/"
                    className="inline-block font-medium rounded-lg px-6 py-3 border-2 border-solid border-dark dark:border-light hover:scale-105 transition-all ease duration-200"
                >
                    한국어 블로그
                </Link>
            </div>
        </section>
    );
}
