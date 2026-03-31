"use client";

import dynamic from "next/dynamic";
import "@dotlottie/react-player/dist/index.css";

const DotLottiePlayer = dynamic(
    () => import("@dotlottie/react-player").then((mod) => mod.DotLottiePlayer),
    { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray/10 rounded-lg" /> }
);

const LottieAnimation = () => {
    return <DotLottiePlayer src="/Animation-1736665363457.lottie" autoplay loop />;
};

export default LottieAnimation;
