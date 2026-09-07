import React from "react";
import { slug } from "github-slugger";
import Category from "./Category";
import { Locale, localePath } from "@/lib/i18n";

const Categories = ({ categories, currentSlug, locale = "ko" }: { categories: string[]; currentSlug: string; locale?: Locale }) => {
    return (
        <div className="px-0 sm:px-10 sxl:px-20 mt-10 border-t-2 text-dark dark:text-light border-b-2 border-solid border-dark dark:border-light py-4 flex items-start flex-wrap font-medium mx-5 md:mx-10">
            {categories.map((cat) => (
                <Category key={cat} link={localePath(`/categories/${cat}`, locale)} name={cat} active={currentSlug === slug(cat)} />
            ))}
        </div>
    );
};

export default Categories;
