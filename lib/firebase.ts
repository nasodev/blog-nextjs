"use client";

import { initializeApp, getApps } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function signInWithGoogle(): Promise<void> {
    await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
    await signOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void, onError?: (error: Error) => void) {
    return onAuthStateChanged(auth, cb, onError);
}

export async function getIdToken(): Promise<string | null> {
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
}
