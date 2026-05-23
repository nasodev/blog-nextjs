# Next.js 16 마이그레이션 디자인

**작성일**: 2026-05-23
**대상 프로젝트**: blog-nextjs (https://blog.funq.kr)
**현재 버전**: Next.js 14.2.35 / React 18 / Node 20 (Docker)
**목표 버전**: Next.js 16.2.6 LTS / React 19

---

## 1. 목표 & 스코프

### 1.1 목표

Next.js 14.2.35 → **Next.js 16.2.6 LTS** 마이그레이션, 신기능(Turbopack/React Compiler) 도입,
사장된(deprecated/unmaintained) 의존성 정리. Docker 기반 CI/CD 파이프라인을 무중단 유지.

### 1.2 In Scope

| 항목 | 액션 |
|---|---|
| Next.js | 14.2.35 → 16.2.6 |
| React | 18 → 19 |
| eslint-config-next | 13.5.8 → 16.x (현재 버전 불일치 해소) |
| `params`/`searchParams` | 동기 → **async (Promise)** |
| Turbopack | dev/build 모두 활성화 (16 기본값) |
| React Compiler | 활성화 |
| `@supabase/auth-helpers-nextjs` | → `@supabase/ssr` |
| `@dotlottie/react-player` | → `@lottiefiles/dotlottie-react` |
| `react-lottie-player` | 제거 (orphan dependency) |
| `next.config.js` | → `next.config.ts` + Turbopack 호환 형식 + `output: "standalone"` 유지 + 보안 헤더 보존 |
| `app/feed.xml/route.ts` | Next 15+ 캐싱 기본값 변화 → `dynamic = 'force-static'` 명시 |
| Dockerfile | 필요 시 Node base 이미지 마이너 패치 갱신 (selective) |

### 1.3 Out of Scope

- Contentlayer2 → Velite/MDX 직접 마이그레이션 (별도 작업으로 분리)
- 컴포넌트 리팩토링, UI 변경
- `components/Search/index.tsx`의 `forwardRef` 제거 (React 19에서 ref가 일반 prop 가능하나 현재 코드도 동작)
- Supabase 스키마 변경
- 배포 인프라(Nginx, ufw, fail2ban, GHCR, GitHub Actions 워크플로) 구조 변경

### 1.4 Success Criteria

1. `npm run lint` 통과 (GitHub Actions Lint job 통과 = 배포 게이트 통과)
2. `npm run build` 성공 (Turbopack 빌드, `.next/standalone` 산출물 생성)
3. `docker build --target builder .` 성공 (Docker 이미지 빌드 검증)
4. `./run-local.sh` 또는 `docker compose up` 로컬 dev 정상 동작
5. 모든 페이지 렌더링 확인: `/`, `/blogs/[slug]`, `/categories/[slug]`, `/about`, `/contact`, `/feed.xml`
6. ViewCounter (Supabase RPC) 동작
7. Giscus 댓글 위젯 로드
8. Lottie 애니메이션 재생
9. 검색 (Cmd/Ctrl+K) 동작
10. 무한 스크롤 동작 (`/categories/*`)
11. RSS feed (`/feed.xml`) 정상 응답 (200, XML)
12. 다크모드 토글 + localStorage 영속
13. `postbuild` (next-sitemap) 정상 → `public/sitemap*.xml` 생성

---

## 2. 아키텍처 변경

### 2.1 Build & Runtime 파이프라인

```
[현재]                              [목표]
─────                              ─────
Next.js 14.2.35                    Next.js 16.2.6 LTS
   │                                  │
   ├─ Webpack (config 커스텀)        ├─ Turbopack (기본)
   │  └─ outputFileTracingExcludes   │  └─ turbopack.* config
   │  └─ webpack(config) fn          │     (fs fallback 별도)
   │                                  │
   ├─ React 18                        ├─ React 19
   │  └─ 수동 memo/useCallback        │  └─ React Compiler 자동
   │                                  │
   ├─ next.config.js                  ├─ next.config.ts
   │  └─ output: "standalone"         │  └─ output: "standalone" (유지)
   │  └─ async headers (보안)         │  └─ async headers (유지)
```

### 2.2 배포 파이프라인 (변경 없음, 호환성만 확인)

```
git push main
   ↓
GitHub Actions
   ├─ Lint job (Node 20)
   ├─ Build & Push (Docker multi-stage, Node 20-alpine)
   │  └─ GHCR: ghcr.io/nasodev/blog-nextjs:latest
   └─ Deploy (SSH to Ubuntu server)
       └─ docker compose -f docker-compose.prod.yml up -d
```

Docker base `node:20-alpine`은 Next 16 요구사항(Node 20+) 충족. 변경 불필요.
(옵션) 보안 패치 적용을 위해 `node:20.18-alpine` 등 마이너 패치 핀.

### 2.3 Request API 변경 (Async)

Next.js 15에서 도입된 async `params`/`searchParams`는 16에서 동기 접근이 **완전 제거**됨.

```ts
// 현재 (동기)
export default function Page({
  params,
}: { params: { slug: string } }) {
  const blog = find(params.slug);
}

// 목표 (async)
export default async function Page({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = find(slug);
}
```

`generateStaticParams()` 반환 타입은 동일.
`generateMetadata({ params })`도 동일 패턴으로 async 변환 필요.

**영향 받는 파일**:
- `app/blogs/[slug]/page.tsx` (page + generateMetadata)
- `app/categories/[slug]/page.tsx` (page + generateMetadata)

**완료 기준**: 두 파일에서 `params.<x>` 직접 접근 패턴이 0건이 되고, 함수 진입부에서 `const { ... } = await params;`로 한 번 비구조화한 뒤 로컬 변수만 사용.

**영향 없음**:
- `app/page.tsx`, `app/manifest.ts`, `app/layout.tsx`, `app/(about)/**`, `app/feed.xml/route.ts`: dynamic params 없음

### 2.4 Route Handler 캐싱 변경

Next 14 → 15+ 변경:
- GET Route Handler가 **기본 캐시 안 됨**

```ts
// app/feed.xml/route.ts (현재)
export async function GET() {
  // ... allBlogs에서 RSS XML 생성
  return new Response(feed, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" }
  });
}

// 목표 — 정적 생성 명시
export const dynamic = 'force-static';   // 빌드 타임 SSG

export async function GET() { /* 동일 */ }
```

`allBlogs`는 Contentlayer2가 빌드 타임에 생성하므로 `force-static`이 올바른 의미. 기존 Cache-Control 헤더는 CDN 캐싱용으로 함께 유지.

### 2.5 Supabase 클라이언트 변경

```ts
// 현재: lib/supabase/client.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const supabase = createClientComponentClient({
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_ANON_KEY,
});

// 목표
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
```

호출부 `lib/supabase/api/views.ts`는 `supabase` 객체만 import하므로 **변경 없음**.

### 2.6 Lottie 컴포넌트 변경

```tsx
// 현재: components/Contact/LottieAnimation.tsx
import { DotLottiePlayer } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";

<DotLottiePlayer src="/Animation-....lottie" autoplay loop />

// 목표
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
// CSS import 불필요

<DotLottieReact src="/Animation-....lottie" autoplay loop />
```

기존 `.lottie` 파일은 그대로 사용 (포맷 동일).

### 2.7 next.config 변경 형식

아래 스니펫은 **Commit 7 이후 최종 형태**. Commit 6 시점에는 `reactCompiler` 키를 제외한 채로 적용하고, Commit 7에서 `reactCompiler: true`를 추가.

```ts
// 목표: next.config.ts (최종 형태, Commit 7 완료 후)
import { withContentlayer } from "next-contentlayer2";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",              // ← 유지 (Docker 빌드용)
  reactStrictMode: true,
  // swcMinify: true,                ← 16에서 제거 (항상 활성)
  async headers() {                  // ← 유지 (보안 헤더)
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
  reactCompiler: true,               // ← 신규
  outputFileTracing: {               // ← experimental에서 top-level로
    excludes: {
      "*": [
        "node_modules/@swc/core-linux-x64-gnu",
        "node_modules/@swc/core-linux-x64-musl",
        "node_modules/@esbuild/linux-x64",
      ],
    },
  },
  turbopack: {                       // ← webpack(config) 대체
    resolveAlias: {
      // 클라이언트 fs fallback 필요 시
    },
  },
};

export default withContentlayer(nextConfig);
```

---

## 3. 단계별 실행 계획 (Approach B — Staged Commits)

격리: feature branch + git worktree. 단일 PR, 8개 커밋(+선택 1개)으로 분리하여 각 단계 독립 검증 및 `git bisect` 가능.

### Step 0 — 브랜치 + worktree

```bash
git worktree add ../blog-nextjs-next16 -b chore/upgrade-nextjs-16
cd ../blog-nextjs-next16
npm install
npm run build  # baseline 빌드 통과 확인 (롤백 기준점)
```

### Commit 1: `chore: remove orphan react-lottie-player`

| 파일 | 변경 |
|---|---|
| `package.json` | `"react-lottie-player": "^2.1.0"` 라인 삭제 |
| `package-lock.json` | `npm install`로 재생성 |

**검증**: `npm run build` 통과.

### Commit 2: `refactor: migrate @supabase/auth-helpers → @supabase/ssr`

| 파일 | 변경 |
|---|---|
| `package.json` | `@supabase/auth-helpers-nextjs` 제거 → `@supabase/ssr` + `@supabase/supabase-js` 추가 |
| `lib/supabase/client.ts` | `createClientComponentClient` → `createBrowserClient(URL, KEY)` |

**검증**: `npm run dev` → 블로그 글 페이지에서 ViewCounter 숫자 표시 + 새로고침 시 증가 확인.

### Commit 3: `refactor: swap Lottie player to @lottiefiles/dotlottie-react`

| 파일 | 변경 |
|---|---|
| `package.json` | `@dotlottie/react-player` 제거 → `@lottiefiles/dotlottie-react` 추가 |
| `components/Contact/LottieAnimation.tsx` | `DotLottiePlayer` → `DotLottieReact`, CSS import 삭제 |

**검증**: `/contact` 페이지 애니메이션 재생 확인.

### Commit 4: `chore: run @next/codemod upgrade latest`

```bash
npx @next/codemod@latest upgrade latest
```

**자동 변경 예상** (package.json):
- `next`: 14.2.35 → 16.x (codemod는 최신 16.x 마이너로 점프)
- `react`, `react-dom`: 18 → 19
- `@types/react`, `@types/react-dom`: 18 → 19
- `eslint-config-next`: 13.5.8 → 16.x

**버전 핀**: codemod 후 `next` 버전이 목표 `16.2.6 LTS`가 아니면 `npm install next@16.2.6 --save-exact` 후속 실행으로 핀. `npm outdated next`로 현재 버전 확인 가능.

**자동 변경 예상** (코드):
- 일부 `params`/`searchParams` 사용처 async 변환 (~80%)
- deprecated API 자동 치환

**검증**: codemod 변경 사항을 `git diff` 검토 후 커밋. 빌드는 아직 실패 가능 → Commit 5에서 해결.

### Commit 5: `fix: async params/searchParams in dynamic routes`

Codemod가 놓친 부분 수동 수정.

| 파일 | 변경 |
|---|---|
| `app/blogs/[slug]/page.tsx` | `params: { slug }` → `params: Promise<{ slug }>`, page를 `async`로, 함수 진입부에서 `const { slug } = await params;`로 비구조화 (page + generateMetadata 2곳) |
| `app/categories/[slug]/page.tsx` | 동일 (page + generateMetadata 2곳) |

**완료 검증**: `git grep "params\.\w"` 결과가 두 파일에서 0건.

**검증**:
- `npm run build` 통과 (Webpack 또는 Turbopack)
- `npm run dev` → `/blogs/<any-slug>`, `/categories/all` 정상 렌더
- 빌드 로그에서 정적 경로 개수 = 마이그레이션 전과 동일

### Commit 5b (NEW): `fix: pin feed.xml route to force-static`

Next 15+ 캐싱 기본값 변화 대응.

| 파일 | 변경 |
|---|---|
| `app/feed.xml/route.ts` | 파일 상단에 `export const dynamic = 'force-static';` 추가 |

**검증**:
- `npm run build`: 빌드 로그에서 `/feed.xml`이 정적(○) 마크로 표시
- `npm run start` → `curl http://localhost:3000/feed.xml`: 200, `<?xml ...>` 응답

### Commit 6: `chore: migrate config to next.config.ts + Turbopack`

| 파일 | 변경 |
|---|---|
| `next.config.js` | 삭제 |
| `next.config.ts` | 신규 (Section 2.7 참조 — `output: "standalone"`, `headers()`, `outputFileTracing.excludes`, `turbopack`, `reactCompiler: false` 단계적 적용용으로 일단 false) |

`reactCompiler`는 Commit 7에서 `true`로 전환하므로 본 커밋에선 미설정.

**검증**:
- `npm run build` (= Turbopack 빌드) 통과
- `npm run dev` (= Turbopack dev) 통과
- 빌드 로그에 "Turbopack" 표시
- `.next/standalone/` 디렉터리 생성 확인 (Docker 빌드 의존)
- MDX 빌드 정상, 보안 헤더 응답 헤더에 존재 (`curl -I` 확인)

### Commit 6b (NEW, optional): `chore: bump Dockerfile node base`

현재 `node:20-alpine`는 latest 20 minor. 필요시 핀.

| 파일 | 변경 |
|---|---|
| `Dockerfile` | `FROM node:20-alpine` → `FROM node:20.18-alpine` (4 stages 모두) |

**검증**: `docker build --target builder .` 통과.

생략 시: latest minor 자동 추적 (덜 명시적이지만 동작은 동일).

### Commit 7: `feat: enable React Compiler`

| 파일 | 변경 |
|---|---|
| `package.json` | `babel-plugin-react-compiler` devDep 추가 |
| `next.config.ts` | `reactCompiler: true` 활성화 |

**검증**:
- `npm run build` 통과
- 빌드 로그에 React Compiler 활성화 메시지
- 컴파일 실패 컴포넌트 발생 시 별도 fix 커밋 또는 `'use no memo'` 옵트아웃

---

## 4. 검증 & 위험 관리

### 4.1 최종 검증 체크리스트 (Commit 7 후, PR 전)

**빌드 & 정적 분석**
- [ ] `npm run lint` 통과 (eslint-config-next 16)
- [ ] `npm run build` 통과 (Turbopack)
- [ ] `.next/standalone/` 생성 확인
- [ ] 빌드 로그: 정적 페이지 개수가 마이그레이션 전과 동일
- [ ] `/feed.xml`이 정적(○) 표시
- [ ] `postbuild` (next-sitemap) → `public/sitemap*.xml` 생성
- [ ] 빌드 메모리/시간 측정 (Turbopack 효과)

**Docker 검증** (CI/CD 사전 안전망)
- [ ] `docker build --target builder .` 통과
- [ ] `docker build --target runner .` 통과
- [ ] (선택) `docker compose -f docker-compose.prod.yml up` 로컬 실행 → http://localhost:3000 응답 확인

**런타임 (production 모드)**
- [ ] `/` 홈: HomeCoverSection + FeaturePosts + AllPostsSection 렌더
- [ ] `/blogs/<slug>` (임의 1개): MDX 본문 + TOC + 이미지 + 코드 하이라이트(github-dark)
- [ ] `/blogs/<slug>`: ViewCounter 표시 + 새로고침 시 증가 (Supabase)
- [ ] `/blogs/<slug>`: Giscus 댓글 위젯 로드
- [ ] `/categories/all`, `/categories/<tag>`: 글 목록 + 카테고리 + **무한 스크롤** 동작
- [ ] `/about`, `/contact`: 정상 렌더 + Lottie 애니메이션 재생
- [ ] `/feed.xml`: 200 응답, valid XML, RSS items 포함
- [ ] **검색 (Cmd/Ctrl+K)**: 모달 오픈, 검색어 입력 → fuse.js 결과, ↑↓Enter 키보드 내비게이션
- [ ] 다크모드 토글 + localStorage 영속
- [ ] 메타데이터/JSON-LD: 페이지 소스에서 `<meta og:*>`, `<script type="application/ld+json">` 확인
- [ ] **응답 헤더**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS 모두 존재

**검증 결과 기록 → PR 본문 첨부**
- 빌드 시간 before/after
- 빌드 메모리 사용량 before/after
- Docker 이미지 사이즈 before/after
- 번들 사이즈 변화

### 4.2 위험 매트릭스

| 위험 | 확률 | 영향 | 완화책 |
|---|---|---|---|
| Contentlayer2가 Next 16에서 동작 안 함 | 낮음 (호환 확인됨) | **치명** | Commit 4 직후 빌드 검증. 실패 시 `patch-package` 핫픽스, 안 되면 Velite 마이그레이션을 별도 작업으로 분리 |
| Turbopack + `output: "standalone"` 비호환 | 낮~중 | **치명** (Docker 빌드 차단) | Commit 6 직후 `docker build --target builder` 검증. 실패 시 일시적으로 `--webpack` 빌드로 폴백, standalone 호환 이슈 별도 추적 |
| `@giscus/react`가 React 19에서 깨짐 | 중 (1년 미업데이트) | 중 (댓글만 영향) | **Stop-and-report (4.4 항목)**. 인라인으로 처리 시 마이그레이션 범위가 2배로 커지므로, 발견 즉시 사용자에게 보고 후 (a) 별도 PR로 처리하고 본 PR은 댓글 일시 비활성화로 머지, (b) 본 PR에 포함해 진행 중 하나를 결정. |
| React Compiler 특정 컴포넌트에서 컴파일 실패 | 중 | 낮음 | `eslint-plugin-react-compiler`로 사전 감지, 실패 시 `'use no memo'` 옵트아웃. 주의 대상: `components/Search/index.tsx` (`forwardRef` 사용) |
| `forwardRef` + React 19 + Compiler 비호환 | 낮음 | 낮음 (검색 기능만) | 컴파일 실패 시 Search 컴포넌트만 `'use no memo'` |
| feed.xml caching 회귀 (force-static 누락) | 낮음 (Commit 5b로 대응) | 낮음 | Commit 5b로 사전 방지, 검증에서 정적 ○ 마크 확인 |
| Dockerfile npm ci 실패 (lockfile mismatch) | 낮음 | 높음 | 각 의존성 변경 커밋(1,2,3,4) 후 `npm install` 정확히 실행, package-lock.json 함께 커밋 |
| GitHub Actions Lint 실패로 배포 차단 | 낮~중 | 중 | 로컬에서 `npm run lint` 통과 후 push. eslint-config-next 16 신규 룰 위반 시 fix 또는 룰 비활성화 |
| Hydration mismatch (다크모드 스크립트) | 낮음 | 낮음 | 기존 동작 검증, 문제 시 `suppressHydrationWarning` |
| `.lottie` 파일 포맷 신/구 라이브러리 차이 | 낮음 | 낮음 | docs 확인, 안 되면 Lottie 제거 옵션 |

### 4.3 롤백 전략

**Commit 단위 롤백 (Approach B의 핵심 이점)**

```
Commit 7  실패 → Commit 6까지로 되돌리고 Compiler 옵트인만 보류
Commit 6b 실패 → Commit 6까지로 (Dockerfile 갱신은 선택적)
Commit 6  실패 → Commit 5b까지로, Webpack 유지하며 머지
Commit 5b 실패 → Commit 5까지로 (feed.xml 정적 검증만 별도 PR로)
Commit 5  실패 → Commit 4 codemod 결과 재검토
Commit 4  실패 → reset --hard, 수동 업그레이드로 재시도
Commit 1-3 실패 → 해당 커밋만 revert
```

**브랜치 단위 롤백**
- 전체 실패 시: 브랜치 폐기, main 무영향 (worktree 격리)
- `git worktree remove ../blog-nextjs-next16`

**main 머지 후 사이트 깨졌을 때**
- CI/CD가 자동으로 GHCR push + 서버 배포 → **실패 시 자동 배포 차단** (health check 실패 → exit 1)
- 수동 복구: `git revert <merge-commit>` → push → CI/CD 재실행
- 또는 서버에서 `docker pull ghcr.io/nasodev/blog-nextjs:<previous-sha>` 후 `docker compose up`

### 4.4 Stopping Conditions

다음 중 하나 발생 시 **즉시 중단하고 사용자에게 보고**:

1. Contentlayer2가 Next 16에서 빌드 실패하며 patch로 해결 안 됨
2. 마이그레이션 후 정적 페이지 개수가 줄어듦 (글 누락)
3. Supabase RPC 호출이 새 클라이언트에서 실패
4. Docker 빌드(builder/runner stage) 실패
5. **`@giscus/react`가 React 19에서 깨지는 것이 확인됨** (4.2 매트릭스의 Giscus 위험 항목)
6. 위험 매트릭스의 "치명" 항목 발생

---

## 5. 머지 & 배포

### 5.1 머지 흐름

1. 로컬 모든 검증 통과 → `git push origin chore/upgrade-nextjs-16`
2. GitHub에서 PR 생성 (PR 본문에 4.1 체크리스트 + 측정값 첨부)
3. GitHub Actions Lint job 통과 확인 (PR 단계에선 Lint만 트리거됨)
4. PR 머지 → main push 이벤트로 CI/CD 풀 파이프라인 실행:
   - Lint → Docker Build → GHCR Push → SSH Deploy → Health Check
5. 배포 자동 완료 (서버 측 수동 작업 불필요)

### 5.2 배포 후 스모크 테스트

- https://blog.funq.kr 접속
- 홈 + 글 1개 + /about + /contact + /feed.xml + Cmd+K 검색 1회씩 확인
- 다크모드 토글 / Giscus 댓글 / Lottie / 무한 스크롤 확인
- 응답 헤더에 보안 헤더 4종 존재 확인

### 5.3 배포 실패 시 복구

- 자동 health check 실패 → 배포 자동 차단 (서버에 새 이미지 적용 안 됨)
- 부분 실패: `git revert <merge-commit>` → push → CI/CD 재실행으로 이전 상태 복구
- 즉시 복구가 필요한 경우 서버에서 이전 GHCR 이미지로 수동 롤백:
  ```bash
  ssh server
  cd /home/funq/dev/blog-nextjs
  docker pull ghcr.io/nasodev/blog-nextjs:<previous-sha>
  # docker-compose.prod.yml의 image 태그 임시 수정
  docker compose -f docker-compose.prod.yml up -d
  ```

### 5.4 파일 인벤토리

**삭제**
| 파일 | 사유 |
|---|---|
| `next.config.js` | → `next.config.ts`로 대체 |

**신규**
| 파일 | 사유 |
|---|---|
| `next.config.ts` | TS config + Turbopack + React Compiler + standalone + headers |

**수정**
| 파일 | 커밋 | 변경 요지 |
|---|---|---|
| `package.json` | 1, 2, 3, 4, 7 | 의존성 정리 + 버전 업 |
| `package-lock.json` | 1-7 | 자동 재생성 |
| `lib/supabase/client.ts` | 2 | `@supabase/ssr` 사용 |
| `components/Contact/LottieAnimation.tsx` | 3 | `@lottiefiles/dotlottie-react` 사용 |
| `app/blogs/[slug]/page.tsx` | 4, 5 | async `params` (page + generateMetadata, 5회 사용 갱신) |
| `app/categories/[slug]/page.tsx` | 4, 5 | async `params` (page + generateMetadata, 4회 사용 갱신) |
| `app/feed.xml/route.ts` | 5b | `export const dynamic = 'force-static'` 추가 |
| `Dockerfile` | 6b (선택) | Node base 마이너 패치 핀 |

**변경 없음 (참고)**
- `contentlayer.config.ts`: Contentlayer2 자체는 그대로
- `app/layout.tsx`, `app/page.tsx`, `app/manifest.ts`: dynamic params 없음
- `app/(about)/layout.tsx`, `app/(about)/about/page.tsx`, `app/(about)/contact/page.tsx`: dynamic params 없음
- `lib/supabase/api/views.ts`: 추상화된 인터페이스 → 변경 불필요
- `.github/workflows/deploy.yml`: 변경 불필요 (Node 20 그대로, Lint job만 통과되면 됨)
- `docker-compose.yml`, `docker-compose.prod.yml`: 변경 불필요
- 그 외 `components/**`, `hooks/**`, `utils/**`: 변경 없음 (React Compiler는 자동 적용)
- `content/**`, `public/**`: 변경 없음
- 배포 설정 (Nginx, ufw, fail2ban): 변경 없음

---

## 6. Open Questions (구현 단계로 미룸)

1. **eslint-plugin-react-compiler 사용 여부** — Commit 7에서 사전 감지 도입 시 Commit 7-pre로 분리할지, 같이 묶을지 구현 단계 결정.
2. **번들 사이즈 분석 도구** — 검증 시 `@next/bundle-analyzer` 임시 도입 여부.
3. **PR 본문 템플릿** — before/after 측정값 + 체크리스트 포맷은 PR 생성 시 결정.
4. **Dockerfile node 마이너 패치 핀 여부** — Commit 6b는 optional. 보안 정책에 따라 결정.
5. **forwardRef → ref-as-prop 리팩토링** — Out of scope이나 React Compiler 호환성 검증 후 별도 PR 후속 작업으로 검토.

---

## 7. Approach 선정 근거

3가지 접근 중 **Approach B (Staged commits in single branch + single PR)** 선택.

| 항목 | A (Big-bang) | **B (Staged) ⭐** | C (Multiple PRs) |
|---|---|---|---|
| 디버깅 용이성 | 낮음 | **높음 (bisectable)** | 높음 |
| 작업 시간 | 짧음 | 중 | 김 |
| 리뷰 부담 | 중 | 중 | 낮음 (분산) |
| 롤백 단위 | 전체 | **커밋별** | PR별 |
| 1인 프로젝트 적합성 | 보통 | **높음** | 오버헤드 과다 |
| CI/CD 배포 트리거 | 1회 | 1회 | 4회 (분할만큼 자동배포) |

CI/CD가 main push에 트리거되므로 Approach C는 배포 4회 = 다운타임 4번 → B의 이점 추가.

---

## 참고 자료

- [Next.js Upgrading: Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js | endoflife.date](https://endoflife.date/nextjs)
- [Migrating to the SSR package from Auth Helpers (Supabase)](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers)
- [@lottiefiles/dotlottie-react](https://www.npmjs.com/package/@lottiefiles/dotlottie-react)
- [Contentlayer2 + Next 15/16 호환성 (Stackblitz)](https://stackblitz.com/edit/github-ekmxur-ba82kk?file=package.json)
- [Next.js Route Handlers Caching](https://nextjs.org/docs/app/api-reference/file-conventions/route#caching)
