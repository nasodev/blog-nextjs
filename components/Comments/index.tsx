"use client";

import Giscus from "@giscus/react";
import useThemeSwitch from "@/components/Hook/useThemeSwitch";

interface CommentsProps {
    slug: string;
}

export default function Comments({ slug }: CommentsProps) {
    const { theme, mounted } = useThemeSwitch();

    if (!mounted) {
        return null;
    }

    const giscusTheme = theme === "dark" ? "dark" : "light";

    return (
        <div className="mt-16 mb-8">
            <div className="border-t border-gray/30 pt-8">
                <h2 className="text-2xl font-bold mb-8 text-dark dark:text-light">댓글</h2>
                <Giscus
                    id="comments"
                    repo="nasodev/blog-nextjs-comments"
                    repoId="R_kgDOQWjVAA"
                    category="Announcements"
                    categoryId="DIC_kwDOQWjVAM4Cx1qT"
                    mapping="pathname"
                    strict="0"
                    reactionsEnabled="1"
                    emitMetadata="0"
                    inputPosition="bottom"
                    theme={giscusTheme}
                    lang="ko"
                    loading="lazy"
                />
            </div>
        </div>
    );
}
