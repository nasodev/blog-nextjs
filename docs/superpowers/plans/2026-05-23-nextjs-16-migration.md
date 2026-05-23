# Next.js 16 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade blog-nextjs from Next.js 14.2.35 → 16.2.6 LTS with React 19, Turbopack, React Compiler, async params, and refreshed Supabase/Lottie deps — all in a single PR with bisectable commits, preserving Docker + GHCR + GitHub Actions deploy pipeline.

**Architecture:** Staged commits in a feature branch + git worktree (Approach B from spec). Eight required commits + one optional commit. Each task ends in a verifiable build and a single commit. CI/CD remains untouched; the only post-merge action is automatic via existing GitHub Actions.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Contentlayer2, Turbopack, Docker (Node 20-alpine multi-stage), GitHub Actions, GHCR, Ubuntu/Nginx server.

**Spec:** [docs/superpowers/specs/2026-05-23-nextjs-16-migration-design.md](../specs/2026-05-23-nextjs-16-migration-design.md)

---

## Shell Note

This plan's command blocks are written in **bash syntax**. The project is on Windows (per the host environment). Run them via Git Bash, WSL, or the executor's Bash tool — NOT PowerShell. Specific PowerShell equivalents are noted where bash idioms (`/tmp/`, `du -sh`, `tee`, `| grep`) won't translate cleanly.

---

## Pre-flight Checks

Before starting, the executor MUST confirm:

- [ ] Current branch is `main` and clean: `git status` shows clean tree (no uncommitted changes besides untracked files outside scope)
- [ ] `main` is up to date with `origin/main`: `git fetch && git status` shows "up to date"
- [ ] Node version locally is 20+: `node -v` shows `v20.x` or higher
- [ ] Docker is running: `docker info` succeeds
- [ ] Environment variables present in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If any fails, STOP and report.

---

## Stopping Conditions (per spec §4.4)

Halt execution and report to user if ANY of these occur:

1. Contentlayer2 fails to build on Next 16 and `patch-package` cannot fix it
2. After migration, static page count is lower than before (post lost)
3. Supabase RPC `increment` fails from the new client
4. Docker `builder` or `runner` stage fails to build
5. `@giscus/react` breaks under React 19
6. Any "치명" (Critical) item from spec §4.2 occurs

---

## File Structure (changes touching these files)

| Path | Action | Tasks |
|---|---|---|
| `package.json` | modify (deps) | 1, 2, 3, 4, 7 |
| `package-lock.json` | regenerate | 1, 2, 3, 4, 7 |
| `lib/supabase/client.ts` | modify | 2 |
| `components/Contact/LottieAnimation.tsx` | modify | 3 |
| `app/blogs/[slug]/page.tsx` | modify (async params) | 4, 5 |
| `app/categories/[slug]/page.tsx` | modify (async params) | 4, 5 |
| `app/feed.xml/route.ts` | modify (add force-static) | 5b |
| `next.config.js` | delete | 6 |
| `next.config.ts` | create | 6, 7 |
| `Dockerfile` | modify (optional minor bump) | 6b |

---

## Task 0: Create Worktree and Baseline

**Purpose:** Isolate the migration in a dedicated worktree so `main` and the active dev environment stay untouched. Capture a baseline build metric to compare against after migration.

**Files:** None modified. Creates sibling directory `../blog-nextjs-next16`.

- [ ] **Step 1: Create the worktree**

Run from `C:\dev\blog-nextjs`:

```bash
git worktree add ../blog-nextjs-next16 -b chore/upgrade-nextjs-16
```

Expected output: `Preparing worktree (new branch 'chore/upgrade-nextjs-16')`

- [ ] **Step 2: Switch into the worktree**

```bash
cd ../blog-nextjs-next16
```

All subsequent commands run from this directory unless noted.

- [ ] **Step 3: Install dependencies (baseline)**

```bash
npm install
```

Expected: no errors. `node_modules/` populated.

- [ ] **Step 4: Capture baseline build metrics**

```bash
npm run build 2>&1 | tee /tmp/baseline-build.log
```

Record from the log output:
- Build time (`Compiled successfully in <X>ms` or final "✓ Compiled")
- Number of static pages generated (look for "○ Static" / "● Static" markers in route table)
- `.next/` directory size: `du -sh .next` (Linux/Mac) or `Get-ChildItem .next -Recurse | Measure-Object -Sum Length` (PowerShell)

Save these as the baseline for comparison in Task 8.

Expected: build succeeds, exits 0.

- [ ] **Step 5: Verify baseline runtime (smoke test)**

```bash
npm run start
```

In another terminal:
```bash
curl -sf http://localhost:3000 > /dev/null && echo "OK" || echo "FAIL"
```

Expected: `OK`. Then stop the server (Ctrl+C).

If the baseline build OR smoke fails, STOP and report (the migration shouldn't start from a broken baseline).

- [ ] **Step 6: No commit yet (worktree creation isn't code change)**

The branch exists but has no extra commits beyond `main`.

---

## Task 1: Remove Orphan `react-lottie-player`

**Purpose:** Eliminate an unused dependency before any other changes, reducing surface area for breakage.

**Files:**
- Modify: `package.json` (remove one line)
- Regenerate: `package-lock.json`

- [ ] **Step 1: Verify it's truly orphaned**

```bash
git grep -n "react-lottie-player" -- ":!package*.json" ":!docs"
```

Expected: no matches (only `package.json` and `package-lock.json` reference it).

If any source file references it, STOP — the spec assumption is wrong.

- [ ] **Step 2: Remove from package.json**

Edit `package.json`. Remove the line:

```json
    "react-lottie-player": "^2.1.0",
```

Make sure JSON stays valid (trailing comma on previous line removed if needed).

- [ ] **Step 3: Regenerate lockfile**

```bash
npm install
```

Expected: lockfile updated, `react-lottie-player` removed from `node_modules`. Verify:

```bash
ls node_modules | grep -i lottie
```

Expected: only `@dotlottie` (the player package — separate, kept until Task 3).

- [ ] **Step 4: Verify build still passes**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove orphan react-lottie-player

Package was declared in dependencies but not imported anywhere in
source. Removed to reduce dependency surface before Next.js 16
migration.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Migrate `@supabase/auth-helpers-nextjs` → `@supabase/ssr`

**Purpose:** `@supabase/auth-helpers-nextjs` is officially deprecated. Migrate to `@supabase/ssr` to align with current Supabase guidance and ensure compatibility going forward.

**Files:**
- Modify: `package.json`
- Modify: `lib/supabase/client.ts` (file is tiny — full new content shown below)
- Regenerate: `package-lock.json`

**Important order**: `lib/supabase/client.ts` imports from `@supabase/auth-helpers-nextjs`. Uninstalling the old package before rewriting the file breaks the build mid-task. Install the new packages first, rewrite the file, then uninstall the old one.

- [ ] **Step 1: Install the new packages (keep old alongside for now)**

```bash
npm install @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 2: Rewrite `lib/supabase/client.ts`**

Replace entire file contents with:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// 싱글톤 패턴으로 Supabase 클라이언트 생성
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

- [ ] **Step 3: Now uninstall the old package**

```bash
npm uninstall @supabase/auth-helpers-nextjs
```

- [ ] **Step 4: Verify no remaining `auth-helpers` imports**

```bash
git grep -n "@supabase/auth-helpers" -- ":!package*.json"
```

Expected: no matches.

- [ ] **Step 5: Build and dev runtime verification**

```bash
npm run build
```

Expected: build succeeds. Then:

```bash
npm run dev
```

In a browser: visit `http://localhost:3000/blogs/<any-published-slug>` (open any blog post — look in `content/` for an `index.mdx`).

Verify:
- Page renders without console errors
- `ViewCounter` shows a number (e.g., "Views: N")
- Refresh the page → counter increments by 1 (Supabase RPC `increment` working)

If counter does not increment, STOP — Supabase client is broken.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/supabase/client.ts
git commit -m "refactor: migrate @supabase/auth-helpers-nextjs to @supabase/ssr

auth-helpers-nextjs is officially deprecated. Replace
createClientComponentClient with createBrowserClient from
@supabase/ssr. Public API (the exported \`supabase\` instance)
is unchanged, so lib/supabase/api/views.ts and ViewCounter
consume it transparently.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Swap Lottie Player

**Purpose:** `@dotlottie/react-player` has been unmaintained for ~2 years. Switch to the actively maintained `@lottiefiles/dotlottie-react`. Same `.lottie` file format works with both.

**Files:**
- Modify: `package.json`
- Modify: `components/Contact/LottieAnimation.tsx`
- Regenerate: `package-lock.json`

**Important order**: the existing file has a top-level `import "@dotlottie/react-player/dist/index.css"` plus a dynamic import of the old package. Uninstalling the old package before rewriting the file will break the build mid-task. Install the new package first, rewrite the file, then uninstall the old one.

- [ ] **Step 1: Install the new package (keep old alongside for now)**

```bash
npm install @lottiefiles/dotlottie-react
```

- [ ] **Step 2: Rewrite `components/Contact/LottieAnimation.tsx`**

The current file lazy-loads via `next/dynamic({ ssr: false })` with a loading skeleton. Preserve that pattern — `@lottiefiles/dotlottie-react` also depends on browser-only APIs (Web Components, `window`), so SSR must remain disabled.

Replace entire file contents with:

```tsx
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
```

What changed vs. the original:
- Import path: `@dotlottie/react-player` → `@lottiefiles/dotlottie-react`
- Component name: `DotLottiePlayer` → `DotLottieReact`
- Removed the top-level `import "@dotlottie/react-player/dist/index.css"` (the new library ships styles inline)
- Preserved: `"use client"`, `next/dynamic`, `ssr: false`, loading skeleton

- [ ] **Step 3: Now uninstall the old package**

```bash
npm uninstall @dotlottie/react-player
```

- [ ] **Step 4: Verify no remaining old imports**

```bash
git grep -n "@dotlottie/react-player"
```

Expected: no matches.

- [ ] **Step 5: Build verification**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Runtime verification**

```bash
npm run dev
```

In browser: visit `http://localhost:3000/contact`.

Verify:
- The Lottie animation renders and plays (looping)
- No console errors about missing file or invalid format

If animation does not play, check the network tab for the `.lottie` request — should return 200.

Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json components/Contact/LottieAnimation.tsx
git commit -m "refactor: swap Lottie player to @lottiefiles/dotlottie-react

@dotlottie/react-player has been unmaintained for ~2 years.
@lottiefiles/dotlottie-react is the actively maintained
successor; .lottie file format is identical so no asset changes
are needed. Inline styles ship with the package, so the
explicit CSS import is removed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Run `@next/codemod` Upgrade

**Purpose:** Use the official codemod to bump Next.js, React, and friends, plus auto-rewrite ~80% of breaking-API call sites.

**Files:** The codemod modifies `package.json`, `package-lock.json`, and likely some source files (async params, deprecated APIs). Exact set depends on what the codemod detects.

- [ ] **Step 1: Capture pre-codemod state for diff comparison**

```bash
git log -1 --oneline
```

Note the commit SHA — useful for `git diff` later if needed.

- [ ] **Step 2: Run the codemod**

```bash
npx @next/codemod@latest upgrade latest
```

Follow any interactive prompts. The codemod typically asks:
- Confirm package manager (npm) — answer yes
- Confirm version to upgrade to — accept the latest stable

Expected: tool prints a list of files changed and codemods applied.

- [ ] **Step 3: Pin Next to the LTS version**

The codemod jumps to the latest 16.x minor. Pin to LTS 16.2.6 to match the spec:

```bash
npm install next@16.2.6 --save-exact
```

Verify `package.json` shows `"next": "16.2.6"` (no caret).

- [ ] **Step 4: Inspect what changed**

```bash
git diff --stat
```

Verify the changes match expectations:
- `package.json`: `next`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `eslint-config-next` all bumped to 16 / 19 family
- `package-lock.json`: regenerated
- Possibly: `app/blogs/[slug]/page.tsx`, `app/categories/[slug]/page.tsx` partially converted to async params

```bash
git diff app/
```

Review any source changes. Don't try to fix any remaining build errors here — that's Task 5.

- [ ] **Step 5: Build (expected to possibly fail)**

```bash
npm run build
```

Expected outcomes (either is acceptable for this commit):
- Build succeeds → codemod handled everything
- Build fails with errors about sync `params` access → expected, fix in Task 5

If build fails for OTHER reasons (e.g., Contentlayer2 incompatibility, missing dependency), STOP and report.

- [ ] **Step 6: Commit (whatever state — broken build OK here)**

```bash
git add -u
git commit -m "chore: run @next/codemod upgrade to Next 16.2.6 + React 19

Auto-bump: next@16.2.6, react@19, react-dom@19, @types/react@19,
@types/react-dom@19, eslint-config-next@16. Codemod also applied
automated rewrites for deprecated APIs and partial async-params
conversion. Remaining manual fixes follow in next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Manually Fix Async `params` in Dynamic Routes

**Purpose:** Complete the async-params migration for code the codemod missed. Next 16 removes the sync-access compatibility layer entirely.

**Files:**
- Modify: `app/blogs/[slug]/page.tsx`
- Modify: `app/categories/[slug]/page.tsx`

- [ ] **Step 1: Identify remaining sync `params` access**

```bash
git grep -nE "params\.\w+" -- app/blogs/ app/categories/
```

If empty: codemod handled everything; jump to Step 4 (build).

If non-empty: each match needs to be replaced with destructured local variables.

- [ ] **Step 2: Fix `app/blogs/[slug]/page.tsx`**

Apply these transformations:

1. Change `generateMetadata` signature:
   - From: `export async function generateMetadata({ params }: { params: { slug: string } }) {`
   - To: `export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {`

2. At the top of `generateMetadata` body, add:
   ```ts
   const { slug } = await params;
   ```

3. Replace every subsequent `params.slug` inside `generateMetadata` with `slug`.

4. Change `BlogPage` to async function with same param signature change:
   - From: `export default function BlogPage({ params }: { params: { slug: string } }) {`
   - To: `export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {`

5. At the top of `BlogPage` body, add:
   ```ts
   const { slug } = await params;
   ```

6. Replace every `params.slug` inside `BlogPage` with `slug`. Note: `<Comments slug={params.slug} />` becomes `<Comments slug={slug} />`, and `slug={params.slug}` in `BlogDetails` becomes `slug={slug}`.

- [ ] **Step 3: Fix `app/categories/[slug]/page.tsx`**

Same pattern:

1. `generateMetadata` and `CategoryPage` both:
   - Param type: `{ params: Promise<{ slug: string }> }`
   - Function becomes async (CategoryPage was sync — convert)
   - Body starts with `const { slug } = await params;`
   - All `params.slug` → `slug`

- [ ] **Step 4: Confirm zero remaining `params.<x>` access**

```bash
git grep -nE "params\.\w+" -- app/blogs/ app/categories/
```

Expected: NO matches. This is the completion criterion from the spec.

- [ ] **Step 5: Build verification**

```bash
npm run build
```

Expected: build succeeds. Inspect log for:
- No errors about sync `params` access
- Static page count matches baseline (Task 0 Step 4)

If page count dropped: STOP — posts are being lost. Investigate Contentlayer output before continuing.

- [ ] **Step 6: Runtime verification**

```bash
npm run dev
```

Open in browser:
- `http://localhost:3000/blogs/<any-published-slug>` → renders, ViewCounter works
- `http://localhost:3000/categories/all` → renders with blog grid

Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add app/blogs/[slug]/page.tsx app/categories/[slug]/page.tsx
git commit -m "fix: async params in dynamic routes for Next 16

Next 16 removes sync access compatibility for params/searchParams.
Convert page and generateMetadata in app/blogs/[slug] and
app/categories/[slug] to async, destructure await params once at
function entry, and replace all params.<x> usage with local vars.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5b: Pin `feed.xml` Route to `force-static`

**Purpose:** Next 15+ removed automatic caching for GET Route Handlers. `app/feed.xml/route.ts` builds RSS from `allBlogs` (Contentlayer data, baked at build time), so it should be statically generated, not re-rendered per request.

**Files:**
- Modify: `app/feed.xml/route.ts`

- [ ] **Step 1: Add `dynamic = 'force-static'` export**

Edit `app/feed.xml/route.ts`. Add this line immediately after the imports (before `export async function GET()`):

```ts
export const dynamic = 'force-static';
```

The file's structure should be:

```ts
import { allBlogs } from "contentlayer/generated";
import siteMetaData from "@/utils/siteMetaData";

export const dynamic = 'force-static';

export async function GET() {
    // ...existing implementation unchanged
}
```

- [ ] **Step 2: Build verification**

```bash
npm run build
```

Expected: build succeeds. In the build output route table, look for the line for `/feed.xml`. It should show a static marker (often `○` or `●`) — NOT a dynamic marker (`λ` or `f`).

- [ ] **Step 3: Runtime verification**

```bash
npm run start
```

In another terminal:

```bash
curl -i http://localhost:3000/feed.xml
```

Expected:
- HTTP/1.1 200 OK
- `Content-Type: application/xml; charset=utf-8`
- Body starts with `<?xml version="1.0" encoding="UTF-8"?>` and contains `<channel>` and `<item>` elements

Note: the existing `Cache-Control: s-maxage=3600, stale-while-revalidate` header in the handler is harmless under `force-static` — the response is baked at build time, so the per-request header just sits in the cached body for any CDN that picks it up.

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add app/feed.xml/route.ts
git commit -m "fix: pin feed.xml route to force-static

Next 15+ removed default caching for GET Route Handlers. The
RSS feed is fully derived from Contentlayer's allBlogs which
is generated at build time, so static generation is the
intended behavior. Explicit force-static restores the Next 14
default.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Migrate Config to `next.config.ts` + Turbopack

**Purpose:** Convert `next.config.js` to TypeScript, drop removed options (`swcMinify`), move `outputFileTracingExcludes` to its new top-level location, and replace the Webpack hook with Turbopack config. **Do NOT enable `reactCompiler` in this commit** — Task 7 handles that to isolate failures.

**Files:**
- Delete: `next.config.js`
- Create: `next.config.ts`

- [ ] **Step 1: Read the current config (for reference during the rewrite)**

```bash
type next.config.js
```

(PowerShell — use `cat` on Linux/Mac.) Keep a mental note of: `output`, `reactStrictMode`, `async headers()`, `compiler.removeConsole`, `experimental.outputFileTracingExcludes`, `webpack(config)` fs-fallback.

- [ ] **Step 2: Delete the old config**

```bash
rm next.config.js
```

- [ ] **Step 3: Create `next.config.ts`**

New file with this content:

```ts
import { withContentlayer } from "next-contentlayer2";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    reactStrictMode: true,

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
                ],
            },
        ];
    },

    compiler: {
        removeConsole: process.env.NODE_ENV === "production",
    },

    outputFileTracing: {
        excludes: {
            "*": [
                "node_modules/@swc/core-linux-x64-gnu",
                "node_modules/@swc/core-linux-x64-musl",
                "node_modules/@esbuild/linux-x64",
            ],
        },
    },

    turbopack: {
        resolveAlias: {
            // Client-side fs fallback equivalent: handled by Turbopack defaults.
            // If a browser build error appears about Node's "fs", add an alias here.
        },
    },
};

export default withContentlayer(nextConfig);
```

Note what's intentionally absent from this commit:
- `swcMinify` — removed in Next 16 (always-on)
- `reactCompiler` — Task 7
- `webpack` hook — converted to `turbopack` config

- [ ] **Step 4: Build verification (Turbopack)**

```bash
npm run build
```

Expected:
- Build succeeds
- Log shows "Turbopack" being used (Next 16 default)
- Static page count matches baseline
- `.next/standalone/` directory exists: `ls .next/standalone` (or `Get-ChildItem .next/standalone`)

If standalone output is missing, the Docker `runner` stage will fail. STOP and report.

- [ ] **Step 5: Docker build verification**

```bash
docker build --target builder -t blog-builder:test .
```

Expected: exits 0. This proves the migrated config produces a Docker-buildable artifact.

(Optional) Also verify the runner stage:

```bash
docker build --target runner -t blog-runner:test .
```

- [ ] **Step 6: Dev verification**

```bash
npm run dev
```

Verify in browser:
- `http://localhost:3000/` loads
- Response headers include all four security headers (use browser devtools Network tab or `curl -I http://localhost:3000/`)

Specifically check `curl -I http://localhost:3000/` output for:
- `x-content-type-options: nosniff`
- `x-frame-options: SAMEORIGIN`
- `referrer-policy: strict-origin-when-cross-origin`
- `strict-transport-security: max-age=63072000; includeSubDomains; preload`

Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add -A next.config.ts
git rm next.config.js
git commit -m "chore: migrate config to next.config.ts and Turbopack

- Convert next.config.js to TypeScript (next.config.ts).
- Remove swcMinify (always-on in Next 16).
- Move outputFileTracingExcludes from experimental to top-level.
- Replace webpack hook with turbopack config block.
- Preserve output: standalone (Docker), async headers (security),
  and compiler.removeConsole (prod).
- React Compiler is intentionally NOT enabled here; that lands
  in a follow-up commit so any compiler failures are isolated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6b (OPTIONAL): Pin Dockerfile Node Base Image

**Purpose:** Lock the Docker base image to a specific Node 20 minor patch instead of tracking the latest. Improves reproducibility and reduces risk of an unexpected upstream change breaking builds.

**Skip this task** if the user explicitly opts out (this is in spec Open Questions §6.4).

**Files:**
- Modify: `Dockerfile` (4 stages, same `FROM` line)

- [ ] **Step 1: Confirm current node:20-alpine is acceptable**

Latest Node 20 LTS minor as of plan-write: 20.18. Verify the user wants this specific pin (or different one) before proceeding.

- [ ] **Step 2: Replace all four `FROM` lines**

In `Dockerfile`, change all four occurrences:
- `FROM node:20-alpine AS deps` → `FROM node:20.18-alpine AS deps`
- `FROM node:20-alpine AS builder` → `FROM node:20.18-alpine AS builder`
- `FROM node:20-alpine AS runner` → `FROM node:20.18-alpine AS runner`
- `FROM node:20-alpine AS development` → `FROM node:20.18-alpine AS development`

- [ ] **Step 3: Docker build verification**

```bash
docker build --target builder -t blog-builder:test .
```

Expected: build succeeds with the pinned base.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile
git commit -m "chore: pin Dockerfile node base to 20.18-alpine

Lock the Node base image to a specific minor patch instead of
tracking 20-alpine head. Improves build reproducibility and
isolates the project from unexpected upstream changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Enable React Compiler

**Purpose:** Turn on the React Compiler for automatic memoization. This is the last and highest-risk change — kept separate so it can be reverted independently.

**Files:**
- Modify: `package.json` (may need `babel-plugin-react-compiler`)
- Modify: `next.config.ts` (add `reactCompiler: true`)

- [ ] **Step 1: Check whether the babel plugin is needed**

Try first WITHOUT installing the plugin (Next 16 may have it bundled):

Edit `next.config.ts`. Add `reactCompiler: true` to the `NextConfig` object. The file should now include:

```ts
const nextConfig: NextConfig = {
    output: "standalone",
    reactStrictMode: true,
    reactCompiler: true,   // ← new line
    // ... rest unchanged
};
```

- [ ] **Step 2: Attempt build**

```bash
npm run build
```

Two possible outcomes:
- **Succeeds** → React Compiler is bundled in Next 16; no plugin install needed. Skip Step 3.
- **Fails** with an error mentioning missing `babel-plugin-react-compiler` → go to Step 3.

- [ ] **Step 3 (conditional): Install the babel plugin**

```bash
npm install --save-dev babel-plugin-react-compiler
```

Re-run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Look for per-component compiler failures**

Even if the build succeeds, scan the log for compiler warnings like:
- `Component <Name> opted out of optimization due to ...`
- `Skipped <file> because ...`

These are usually fine but worth noting. Specifically check whether `components/Search/index.tsx` (uses `forwardRef`) is flagged. If it is and the build still succeeds, no action needed — move on.

- [ ] **Step 5: Runtime verification — sanity check**

```bash
npm run dev
```

In browser, open `http://localhost:3000` and:
- Verify the home page renders
- Verify dark mode toggle works (it relies on hook behavior — a good Compiler smoke test)
- Open Cmd/Ctrl+K — search modal opens, typing returns results (Search uses `forwardRef` — confirms Compiler didn't break it)

If any of those fail, identify the failing component and add `'use no memo'` at the top of its file as the opt-out, then rebuild and retest. Commit the opt-out as part of this task.

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "feat: enable React Compiler

Activate automatic memoization in next.config.ts. React Compiler
is bundled with / declared as dev-dependency for Next 16. Any
component that fails to compile uses 'use no memo' as an
opt-out (no current opt-outs needed; verified at build time).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

If `'use no memo'` was added to any file in Step 5, include it in the commit and mention it in the message.

---

## Task 8: Final Verification

**Purpose:** Run the full spec §4.1 checklist before PR. Capture metrics for the PR body.

**Files:** None modified. Pure verification.

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: exits 0. This mirrors the GitHub Actions Lint job (the deploy gate).

If new ESLint rules from `eslint-config-next@16` fail, fix the violations in a small commit (e.g., `chore: fix lint violations for eslint-config-next 16`) before continuing.

- [ ] **Step 2: Production build with metrics capture**

```bash
npm run build 2>&1 | tee /tmp/migrated-build.log
```

Record:
- Build time
- Static page count (compare to Task 0 baseline — should match)
- `.next/` size: bash `du -sh .next` or PowerShell `Get-ChildItem .next -Recurse | Measure-Object -Sum Length`
- `.next/standalone/` exists

- [ ] **Step 3: Docker build (mirrors CI/CD)**

```bash
docker build --target builder -t blog-builder:final .
docker build --target runner -t blog-runner:final .
```

Both must succeed. Record:
- Image size: `docker images blog-runner:final` (compare to current production image if accessible)

- [ ] **Step 4: Production runtime smoke test**

```bash
npm run start
```

Then in browser AND `curl`:

| Check | Method | Expected |
|---|---|---|
| `/` | browser | HomeCoverSection + FeaturePosts + AllPostsSection render |
| `/blogs/<slug>` | browser (any published post) | MDX body + TOC + image + GitHub-dark code highlight |
| `/blogs/<slug>` | browser | ViewCounter shows number, increments on refresh |
| `/blogs/<slug>` | browser | Giscus widget loads (scroll to bottom) |
| `/categories/all` | browser | Blog grid + infinite scroll works |
| `/categories/<tag>` | browser | Filtered grid renders |
| `/about` | browser | Renders |
| `/contact` | browser | Renders + Lottie plays |
| `/feed.xml` | `curl -i` | 200, `<?xml ...>` body |
| Cmd/Ctrl+K | browser | Search modal opens, query returns results |
| Dark mode toggle | browser | Persists across reload (localStorage) |
| Security headers | `curl -I http://localhost:3000/` | All 4 security headers present |
| JSON-LD | view-source on blog page | `<script type="application/ld+json">` exists |

Any failure here = STOP and report.

Stop the server.

- [ ] **Step 5: Compile metrics summary**

Save this as PR body draft (`/tmp/pr-body.md` or wherever convenient):

```
## Next.js 14.2.35 → 16.2.6 LTS migration

### Build metrics
| Metric | Before | After |
|---|---|---|
| Build time | <baseline> | <migrated> |
| Static pages | <baseline> | <migrated> (must match) |
| .next/ size | <baseline> | <migrated> |
| Docker runner image | <baseline> | <migrated> |

### Verified
- [x] Lint passes (CI gate)
- [x] Production build (Turbopack + standalone) succeeds
- [x] Docker builder + runner stages build clean
- [x] All routes render: /, /blogs/[slug], /categories/[slug], /about, /contact, /feed.xml
- [x] Cmd/Ctrl+K search works
- [x] ViewCounter (Supabase RPC) works
- [x] Giscus comments load
- [x] Lottie animation plays
- [x] Infinite scroll works
- [x] Dark mode persists
- [x] Security headers present

### Commits
- [x] Approach B: 8 commits (+ optional Dockerfile pin)
- [x] Bisectable: each commit builds and passes its step's verification

### Risks accepted
- React Compiler is enabled. Any future component that violates React Rules will opt out via 'use no memo'.
- Turbopack is default. Falls back to webpack via `next build --webpack` if needed.
```

- [ ] **Step 6: No commit (Task 8 is verification only)**

If a lint fix was needed in Step 1, that already produced a commit. Otherwise the branch state is unchanged.

---

## Task 9: Push and Open PR

**Purpose:** Trigger the GitHub Actions Lint job (the only CI job that runs on PR — full deploy happens on merge to main). Get a reviewable link.

**Files:** None.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin chore/upgrade-nextjs-16
```

Expected: branch published to GitHub.

- [ ] **Step 2: Open PR via gh CLI**

```bash
gh pr create \
  --title "chore: upgrade to Next.js 16.2.6 LTS (React 19 + Turbopack + Compiler)" \
  --body-file /tmp/pr-body.md \
  --base main
```

(Or use the markdown drafted in Task 8 Step 5 inline with `--body "$(cat /tmp/pr-body.md)"`.)

- [ ] **Step 3: Verify CI passes**

Wait for GitHub Actions Lint job. Watch with:

```bash
gh pr checks --watch
```

Expected: Lint job ✓ green.

- [ ] **Step 4: Report PR URL to user**

Print the PR URL (`gh pr view --web` opens it, `gh pr view --json url -q .url` prints it).

The user reviews and merges. On merge, the existing CI/CD pipeline (Lint → Docker Build → GHCR Push → SSH Deploy) runs automatically. The plan ends at PR open.

---

## Rollback Reference (per spec §4.3)

If a task fails after commit, the easiest recovery is per-commit reset:

```bash
# Discard the failed commit, return to prior task's end state
git reset --hard HEAD~1
```

For broader rollback (return to a known-good task):

```bash
git log --oneline   # find the SHA of the last good commit
git reset --hard <sha>
```

If the entire migration must be abandoned:

```bash
cd C:\dev\blog-nextjs   # back to the main worktree
git worktree remove ../blog-nextjs-next16
git branch -D chore/upgrade-nextjs-16   # only if branch was never pushed
```

If pushed, leave the branch on GitHub — it can be force-pushed later or deleted via `gh`.

---

## Skill References

- [@superpowers:subagent-driven-development](skill://superpowers:subagent-driven-development) — recommended for multi-task plans
- [@superpowers:executing-plans](skill://superpowers:executing-plans) — for inline execution with checkpoints
- [@superpowers:verification-before-completion](skill://superpowers:verification-before-completion) — verify before claiming any task done
- [@superpowers:systematic-debugging](skill://superpowers:systematic-debugging) — for any unexpected failure
