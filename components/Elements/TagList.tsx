import Link from "next/link";
import { slug } from "github-slugger";
import { Locale, localePath } from "@/lib/i18n";

interface TagListProps {
    tags: string[];
    maxDisplay?: number;
    locale?: Locale;
}

const TagList = ({ tags, maxDisplay, locale = "ko" }: TagListProps) => {
    const displayTags = maxDisplay ? tags.slice(0, maxDisplay) : tags;
    const remainingCount = maxDisplay ? tags.length - maxDisplay : 0;

    return (
        <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag, index) => (
                <Link
                    key={index}
                    href={localePath(`/categories/${slug(tag)}`, locale)}
                    className="inline-block text-xs px-2 py-0.5 rounded-full bg-accent/10 dark:bg-accentDark/10 text-accent dark:text-accentDark hover:bg-accent/20 dark:hover:bg-accentDark/20 transition-colors duration-200"
                >
                    {tag}
                </Link>
            ))}
            {remainingCount > 0 && (
                <span className="inline-block text-xs px-2 py-0.5 text-gray dark:text-light/50">
                    +{remainingCount}
                </span>
            )}
        </div>
    );
};

export default TagList;
