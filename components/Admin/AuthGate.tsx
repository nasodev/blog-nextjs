"use client";

import { useEffect, useState } from "react";
import { signInWithGoogle, signOutUser, onAuthChange } from "@/lib/firebase";
import type { User } from "firebase/auth";

const AuthGate = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return onAuthChange((u) => {
            setUser(u);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <h1 className="text-2xl font-semibold">Blog Admin</h1>
                <button
                    onClick={() => signInWithGoogle()}
                    className="px-6 py-2 rounded-lg bg-dark text-light dark:bg-light dark:text-dark"
                >
                    Google로 로그인
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end px-5 py-2 text-sm gap-4">
                <span>{user.email}</span>
                <button onClick={() => signOutUser()} className="underline">로그아웃</button>
            </div>
            {children}
        </div>
    );
};

export default AuthGate;
