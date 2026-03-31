"use client";
import Link from "next/link";
import { InstagramIcon, GithubIcon, LinkedinIcon, XIcon } from "../icons";
import siteMetaData from "@/utils/siteMetaData";

const Footer = () => {
    return (
        <footer className="mt-16 rounded-2xl bg-dark dark:bg-accentDark/90 m-2 sm:m-10 flex flex-col items-center text-light dark:text-dark">
            <div className="flex items-center mt-8">
                <Link href={siteMetaData.github} className="inline-block w-6 h-6 mr-4 fill-light">
                    <GithubIcon className="hover:scale-125 transition-all ease duration-200 fill-light dark:fill-dark" />
                </Link>
                <Link href={siteMetaData.x} className="inline-block w-6 h-6 mr-4">
                    <XIcon className="hover:scale-125 transition-all ease duration-200 fill-light dark:fill-dark" />
                </Link>
                <Link href={siteMetaData.linkedin} className="inline-block w-6 h-6 mr-4">
                    <LinkedinIcon className="hover:scale-125 transition-all ease duration-200" />
                </Link>
                <Link href={siteMetaData.instagram} className="inline-block w-6 h-6 mr-4">
                    <InstagramIcon className="hover:scale-125 transition-all ease duration-200" />
                </Link>
            </div>

            <div className="w-full mt-16 md:mt-24 relative font-medium border-t border-solid border-light py-6 px-8 flex flex-col md:flex-row items-center justify-between">
                <span>&copy;2024 FunDev. All rights reserved.</span>
                <Link href="/sitemap.xml" className="text-center underline my-4 md:my-0">
                    sitemap.xml
                </Link>
            </div>
        </footer>
    );
};

export default Footer;
