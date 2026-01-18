"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import React from "react";
import Logo from "./Logo";
import { LinkedinIcon, SunIcon, MoonIcon, XIcon, GithubIcon, InstagramIcon } from "@/components/icons";
import useThemeSwitch from "@/components/Hook/useThemeSwitch";
import siteMetaData from "@/utils/siteMetaData";
import Search, { SearchHandle } from "@/components/Search";

const Header = () => {
    const { theme, setTheme, mounted } = useThemeSwitch();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const searchRef = useRef<SearchHandle>(null);

    const handleMenuToggle = () => {
        searchRef.current?.close();
        setIsMenuOpen(!isMenuOpen);
    };

    if (!mounted) {
        return null;
    }

    return (
        <header className="w-full p-4 px-5 sm:px-10 flex items-center justify-between">
            <Logo />
            <button className="inline-block sm:hidden z-50" onClick={handleMenuToggle}>
                <div className="w-6 cursor-pointer transition-all ease duration-300">
                    <div className="relative">
                        <span
                            className="absolute top-0 w-full h-0.5 bg-dark dark:bg-light rounded transition-all duration-200 ease"
                            style={{
                                transform: isMenuOpen ? "rotate(-45deg) translateY(0)" : "rotate(0deg) translateY(6px)",
                            }}
                        >
                            &nbsp;
                        </span>
                        <span
                            className="absolute top-0 w-full h-0.5 bg-dark dark:bg-light rounded transition-all duration-200 ease"
                            style={{
                                opacity: isMenuOpen ? 0 : 1,
                            }}
                        >
                            &nbsp;
                        </span>
                        <span
                            className="absolute top-0 w-full h-0.5 bg-dark dark:bg-light rounded transition-all duration-200 ease"
                            style={{
                                transform: isMenuOpen ? "rotate(45deg) translateY(0)" : "rotate(0deg) translateY(-6px)",
                            }}
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
                    className={`w-6 h-6 ease ml-2 flex items-center justify-center rounded-full p-1 ${
                        theme === "dark" ? "bg-light text-dark" : "bg-dark text-light"
                    }`}
                >
                    {theme === "dark" ? <SunIcon className="fill-light" /> : <MoonIcon className="fill-dark" />}
                </button>
            </nav>
            <div className="sm:flex items-center hidden">
                <Link href={siteMetaData.github} className="inline-block w-6 h-6 mr-4">
                    <GithubIcon className="hover:scale-125 transition-all ease duration-200 dark:fill-light" />
                </Link>
                <Link href={siteMetaData.x} className="inline-block w-6 h-6 mr-4">
                    <XIcon className="hover:scale-125 transition-all ease duration-200 dark:fill-light" />
                </Link>
                <Link href={siteMetaData.linkedin} className="inline-block w-6 h-6 mr-4">
                    <LinkedinIcon className="hover:scale-125 transition-all ease duration-200" />
                </Link>
                <Link href={siteMetaData.instagram} className="inline-block w-6 h-6 mr-4">
                    <InstagramIcon className="hover:scale-125 transition-all ease duration-200" />
                </Link>
            </div>
        </header>
    );
};

export default Header;
