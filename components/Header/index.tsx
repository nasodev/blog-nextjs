"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import React from "react";
import Logo from "./Logo";
import { LinkedinIcon, SunIcon, MoonIcon, XIcon, GithubIcon, InstagramIcon } from "@/components/icons";
import useThemeSwitch from "@/components/Hook/useThemeSwitch";
import siteMetaData from "@/utils/siteMetaData";
import Search, { SearchHandle } from "@/components/Search";

const HAMBURGER_TOP_OPEN = { transform: "rotate(-45deg) translateY(0)" } as const;
const HAMBURGER_TOP_CLOSED = { transform: "rotate(0deg) translateY(6px)" } as const;
const HAMBURGER_MID_OPEN = { opacity: 0 } as const;
const HAMBURGER_MID_CLOSED = { opacity: 1 } as const;
const HAMBURGER_BOT_OPEN = { transform: "rotate(45deg) translateY(0)" } as const;
const HAMBURGER_BOT_CLOSED = { transform: "rotate(0deg) translateY(-6px)" } as const;

const Header = () => {
    const { theme, setTheme } = useThemeSwitch();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const searchRef = useRef<SearchHandle>(null);

    const handleMenuToggle = () => {
        searchRef.current?.close();
        setIsMenuOpen(!isMenuOpen);
    };

    // 헤더는 서버 HTML에 항상 포함되어야 한다 — mounted 게이트로 null을 반환하면
    // 하이드레이션 시 헤더가 삽입되며 CLS가 생기고, 내비 링크가 초기 HTML에서 빠져
    // 크롤러가 따라갈 수 없다. 테마 의존 UI(토글 버튼)는 CSS dark: variant로 처리한다.
    return (
        <header className="w-full p-4 px-5 sm:px-10 flex items-center justify-between">
            <Logo />
            <button className="inline-block sm:hidden z-50" onClick={handleMenuToggle} aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}>
                <div className="w-6 cursor-pointer transition-all ease duration-300">
                    <div className="relative">
                        <span
                            className="absolute top-0 w-full h-0.5 bg-dark dark:bg-light rounded transition-all duration-200 ease"
                            style={isMenuOpen ? HAMBURGER_TOP_OPEN : HAMBURGER_TOP_CLOSED}
                        >
                            &nbsp;
                        </span>
                        <span
                            className="absolute top-0 w-full h-0.5 bg-dark dark:bg-light rounded transition-all duration-200 ease"
                            style={isMenuOpen ? HAMBURGER_MID_OPEN : HAMBURGER_MID_CLOSED}
                        >
                            &nbsp;
                        </span>
                        <span
                            className="absolute top-0 w-full h-0.5 bg-dark dark:bg-light rounded transition-all duration-200 ease"
                            style={isMenuOpen ? HAMBURGER_BOT_OPEN : HAMBURGER_BOT_CLOSED}
                        >
                            &nbsp;
                        </span>
                    </div>
                </div>
            </button>
            <nav
                className={`w-max py-3 px-3 sm:px-8 border border-solid border-dark rounded-full font-medium capitalize flex items-center fixed right-1/2 translate-x-1/2 
                    bg-light/80 backdrop-blur-sm z-50 transition-all duration-300 ease 
                    ${isMenuOpen ? "top-4" : "top-[-5rem]"} sm:top-4`}
            >
                <Link href="/" className="mr-2">
                    Home
                </Link>
                <Link href="/about" className="mx-2">
                    About
                </Link>
                <Link href="/contact" className="mx-2">
                    Contact
                </Link>
                <Search ref={searchRef} />
                <button
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    aria-label="테마 전환"
                    className="w-6 h-6 ease ml-2 flex items-center justify-center rounded-full p-1 bg-dark text-light dark:bg-light dark:text-dark"
                >
                    <MoonIcon className="dark:hidden fill-dark" />
                    <SunIcon className="hidden dark:inline-block fill-light" />
                </button>
            </nav>
            <div className="sm:flex items-center hidden">
                <Link href={siteMetaData.github} className="inline-block w-6 h-6 mr-4" aria-label="GitHub">
                    <GithubIcon className="hover:scale-125 transition-all ease duration-200 dark:fill-light" aria-hidden="true" />
                </Link>
                <Link href={siteMetaData.x} className="inline-block w-6 h-6 mr-4" aria-label="X">
                    <XIcon className="hover:scale-125 transition-all ease duration-200 dark:fill-light" aria-hidden="true" />
                </Link>
                <Link href={siteMetaData.linkedin} className="inline-block w-6 h-6 mr-4" aria-label="LinkedIn">
                    <LinkedinIcon className="hover:scale-125 transition-all ease duration-200" aria-hidden="true" />
                </Link>
                <Link href={siteMetaData.instagram} className="inline-block w-6 h-6 mr-4" aria-label="Instagram">
                    <InstagramIcon className="hover:scale-125 transition-all ease duration-200" aria-hidden="true" />
                </Link>
            </div>
        </header>
    );
};

export default Header;
