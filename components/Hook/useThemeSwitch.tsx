"use client";

import { useEffect, useState } from "react";

const useThemeSwitch = () => {
    const preferDarkQuery = "(prefers-color-scheme: dark)";
    const storageKey = "theme";

    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem(storageKey);
        const prefersDark = window.matchMedia(preferDarkQuery).matches;

        if (savedTheme) {
            setTheme(savedTheme);
        } else if (prefersDark) {
            setTheme("dark");
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const mediaQuery = window.matchMedia(preferDarkQuery);
        const handleChange = () => {
            const savedTheme = localStorage.getItem(storageKey);
            if (!savedTheme) {
                setTheme(mediaQuery.matches ? "dark" : "light");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [mounted]);

    useEffect(() => {
        if (!mounted) return;

        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        localStorage.setItem(storageKey, theme);
    }, [theme, mounted]);

    return {
        theme,
        setTheme,
        mounted,
    };
};

export default useThemeSwitch;
