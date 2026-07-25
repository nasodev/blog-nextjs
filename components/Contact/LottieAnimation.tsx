"use client";

import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
    () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
    { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray/10 rounded-lg" /> }
);

const LottieAnimation = () => {
    return <DotLottieReact src="/Animation-1736665363457.lottie" autoplay loop />;
};

export default LottieAnimation;
