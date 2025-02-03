import React from "react";
import Image from "next/image";
import profileImg from "@/public/profile-img.jpg";

const AboutCoverSection = () => {
    return (
        <section className="w-full md:h-[75vh] border-b-2 border-solid border-dark dark:border-light flex md:flex-row flex-col items-center justify-center text-dark dark:text-light">
            <div className="w-full md:w-1/2 h-full border-r-2 border-solid border-dark dark:border-light flex justify-center">
                <Image
                    src={profileImg}
                    alt="funq"
                    className="w-4/5 xs:w-3/4 md:w-full h-full object-contain object-center"
                />
            </div>
            <div className="w-full md:w-1/2 flex flex-col items-start justify-center pb-10 px-5 lg:px-16 text-center lg:text-left">
                <h2 className="font-bold capitalize text-4xl xs:text-5xl sxl:text-6xl">
                    A person who <br />
                    never stops <br /> learning and growing.
                </h2>
                <p className="font-medium capitalize mt-4 text-base">
                    &quot;If you don&apos;t go when you want to go, when you do go, you&apos;ll find you&apos;re
                    gone.&quot;
                </p>
                <p className="font-medium capitalize mt-2 text-base">
                    Waiting too long often means missing the perfect moment. Embracing every opportunity and constantly
                    pushing my boundaries has become a way of life. This is how I keep learning and growing every day.
                </p>
            </div>
        </section>
    );
};

export default AboutCoverSection;
