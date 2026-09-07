import React from "react";
import Image from "next/image";
import Link from "next/link";
import profileImg from "@/public/profile-img.png";
import { Locale, localePath } from "@/lib/i18n";

const Logo = ({ locale = "ko" }: { locale?: Locale }) => {
    return (
        <Link href={localePath("/", locale)} className="flex items-center text-dark dark:text-light">
            <div className="w-12 md:w-16 rounded-full overflow-hidden border border-solid border-dark dark:border-light mr-2 md:mr-4">
                <Image
                    src={profileImg}
                    alt="FunDev"
                    className="w-full h-auto rounded-full"
                    sizes="(min-width: 768px) 64px, 48px"
                ></Image>
            </div>
            <span className="font-bold text-lg md:text-xl dark:font-semibold">FunDev</span>
        </Link>
    );
};

export default Logo;
