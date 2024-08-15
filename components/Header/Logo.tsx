import React from "react";
import Image from "next/image";
import Link from "next/link";
import profileImg from "@/public/profile-img.jpg";

const Logo = () => {
  return (
    <Link href="/" className="flex items-center text-dark">
      <div className="w-16 rounded-full overflow-hidden border border-solid border-dark mr-4">
        <Image
          src={profileImg}
          alt="FunDev"
          className="w-full h-auto rounded-full"
        ></Image>
      </div>
      <span className="font-bold text-xl">FunDev</span>
    </Link>
  );
};

export default Logo;
