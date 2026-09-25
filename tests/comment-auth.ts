import type { Page } from "@playwright/test";

/** Seed the real Firebase SDK's supported persisted-user shape; only network verification is mocked. */
function identity(uid: string) {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub: uid, user_id: uid, aud: "demo-blog", iss: "https://securetoken.google.com/demo-blog", iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: "google.com" } })}.test-signature`;
    const record = {
        uid, displayName: "로그인 사용자", email: "reader@example.test", emailVerified: true, isAnonymous: false,
        providerData: [{ providerId: "google.com", uid, displayName: "로그인 사용자", email: "reader@example.test", photoURL: null }],
        stsTokenManager: { refreshToken: "test-refresh", accessToken: token, expirationTime: Date.now() + 3600000 },
        createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: "test-api-key", appName: "[DEFAULT]",
    };
    return { token, record };
}

export async function signInCommentTestUser(page: Page, uid = "comment-reader") {
    const { token, record } = identity(uid);
    await page.addInitScript((value) => {
        if (location.origin === "http://127.0.0.1:23002" && !sessionStorage.getItem("comment-test-seeded")) {
            localStorage.setItem("firebase:authUser:test-api-key:[DEFAULT]", JSON.stringify(value));
            sessionStorage.setItem("comment-test-seeded", "1");
        }
    }, record);
    await page.route("https://identitytoolkit.googleapis.com/v1/accounts:lookup?*", (route) => route.fulfill({
        headers: { "Access-Control-Allow-Origin": "*" },
        json: { users: [{ localId: uid, displayName: record.displayName, email: record.email, emailVerified: true, providerUserInfo: [{ providerId: "google.com", rawId: uid, displayName: record.displayName, email: record.email }], createdAt: record.createdAt, lastLoginAt: record.lastLoginAt }] },
    }));
    return token;
}

/** Simulate completion of Google sign-in/account switching via Firebase's real persistence listener. */
export async function switchCommentTestUser(page: Page, uid: string) {
    const { token, record } = identity(uid);
    await page.evaluate((value) => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("firebaseLocalStorageDb", 1);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => request.result.createObjectStore("firebaseLocalStorage", { keyPath: "fbase_key" });
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("firebaseLocalStorage", "readwrite");
            transaction.objectStore("firebaseLocalStorage").put({ fbase_key: "firebase:authUser:test-api-key:[DEFAULT]", value });
            transaction.oncomplete = () => { db.close(); resolve(); };
            transaction.onerror = () => { db.close(); reject(transaction.error); };
        };
    }), record);
    return token;
}
