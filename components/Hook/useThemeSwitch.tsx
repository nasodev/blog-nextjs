"use client";

import { useSyncExternalStore } from "react";

const themeQuery = "(prefers-color-scheme: dark)";
const getSnapshot = () => document.documentElement.classList.contains("dark") ? "dark" : "light";
const getServerSnapshot = () => null;

function savedTheme() {
    try { return localStorage.getItem("theme"); }
    catch { return null; }
}

function subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const media = window.matchMedia(themeQuery);
    const applyPreference = () => {
        const saved = savedTheme();
        document.documentElement.classList.toggle("dark", saved === "dark" || (saved !== "light" && media.matches));
    };
    const onSystemChange = () => {
        if (!["light", "dark"].includes(savedTheme() ?? "")) applyPreference();
    };
    const onStorage = (event: StorageEvent) => {
        if (event.key === "theme" || event.key === null) applyPreference();
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
        observer.disconnect();
        media.removeEventListener("change", onSystemChange);
        window.removeEventListener("storage", onStorage);
    };
}

const setTheme = (theme: string) => {
    if (theme !== "light" && theme !== "dark") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); }
    catch { /* A blocked storage area must not disable the theme button. */ }
};

const useThemeSwitch = () => {
    const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    return { theme: theme ?? "light", setTheme, mounted: theme !== null };
};

export default useThemeSwitch;
