import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                dark: "#1b1b1b",
                light: "#fff",
                accent: "#7B00D3",
                accentDark: "#ffdb4d",
                gray: "#747474",
            },
            fontFamily: {
                mr: ["var(--font-mr)"],
                in: ["var(--font-in)"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            animation: {
                roll: "roll 24s linear infinite",
            },
            keyframes: {
                roll: {
                    "0%": { transform: "translateX(100%)" },
                    "100%": { transform: "translateX(-100%)" },
                },
            },
            screens: {
                sxl: "1180px",
                // @media (min-width: 1180px) {...}
                xs: "480px",
                // @media (min-width: 480px) {...}
            },
        },
    },
    plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
export default config;
