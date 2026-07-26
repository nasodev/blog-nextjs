# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 기반 기술 블로그 (https://blog.funq.kr)

| Stack | Technology |
|-------|------------|
| Framework | Next.js 16.2.6, React 19, TypeScript |
| Content | backend-api `/blog` REST API (tag 기반 on-demand ISR) |
| Styling | Tailwind CSS, @tailwindcss/typography |
| Admin Auth | Firebase Auth (Google 로그인, funq-auth 프로젝트 공용) |
| Hosting | Ubuntu Server + Nginx + HTTPS (개인 서버) |

## Commands

### Docker (로컬 개발)

```bash
# Docker로 실행
./run-local.sh
# 또는
docker compose up --build

# 컨테이너 로그
docker logs -f blog-dev
```

### npm (기존 방식)

```bash
# npm으로 실행
./run-local.sh npm
# 또는
npm run dev -- -p 23001

# 기타 명령어
npm run build     # 프로덕션 빌드 (SSG가 빌드 중 backend-api를 호출 — 아래 Build Notes 참고)
npm run start     # 프로덕션 서버
npm run lint      # ESLint
```

### 포트 구성

| 환경 | 포트 | URL |
|------|------|-----|
| 로컬 개발 | 23001 | http://localhost:23001 |
| 프로덕션 | 3000 | Nginx → localhost:3000 |

## Architecture

### Content Pipeline

```
/admin (Firebase Google 로그인) → PostEditor (CodeMirror, HTML 본문)
                                          │
                                          ▼
                          backend-api  POST/PUT /blog/posts  (lib/api/admin.ts)
                                          │
                                          ▼
                    requestRevalidate() → POST /api/revalidate → revalidateTag(tag, { expire: 0 })
                                          │
                                          ▼
              lib/api/posts.ts (next: { tags: ["posts"] / [`post:{slug}`] }) ← app/blogs/[slug]/page.tsx 등
```

- **글 작성/수정**: MDX가 아니라 `/admin` 에디터에서 HTML 본문을 직접 작성 (`components/Admin/PostEditor.tsx`)
- **저장 즉시 반영**: 저장/삭제 시 `requestRevalidate(slug)` 호출 → `app/api/revalidate/route.ts`가 공유 시크릿 검증 후 해당 글 태그 + `"posts"` 태그를 즉시 만료
- **빌드 타임 SSG**: `generateStaticParams()`가 빌드 중 `NEXT_PUBLIC_API_URL`로 전체 글 목록을 fetch — 이후에는 태그 기반 on-demand ISR로 갱신 (재빌드 불필요)
- **레거시 원본**: `content/{slug}/index.mdx` (22개, Contentlayer 시절 글)는 참고용으로만 보존 — **마이그레이션 완료(2026-07-26)**: `scripts/migration/`의 변환기(convert.mjs)·적재기(load_posts.py)로 전량 HTML 변환 후 프로덕션 DB 적재됨. 빌드·서빙에는 쓰이지 않음

### Data Flow

**공개 페이지 (읽기)**
```
[backend-api /blog]  --fetch(tags)-->  lib/api/posts.ts  -->  app/page.tsx, app/blogs/[slug]/page.tsx, 카테고리/검색 등
                                              │
                                              ▼
                                    lib/api/views.ts (조회수 POST) ← ViewCounter.tsx (마운트 시 1회)
```

**관리자 (쓰기)**
```
[Firebase Auth]  --Google 로그인-->  lib/firebase.ts  -->  components/Admin/AuthGate.tsx  -->  /admin/*
                                                                                                    │
                                                                                                    ▼
                                                              lib/api/admin.ts (Bearer ID 토큰) → backend-api
```

### Key Integration Points

- **조회수**: `lib/api/views.ts` - backend-api `POST /blog/posts/{slug}/view` 호출, `ViewCounter.tsx`가 마운트 시 1회 증가
- **댓글**: `components/Comments/index.tsx` - Giscus (GitHub Discussions)
- **SEO**: `app/blogs/[slug]/page.tsx` - generateMetadata() + JSON-LD
- **관리자 에디터**: `/admin` (Firebase Google 로그인 필요, `AuthGate.tsx`) - 글 목록/작성/수정/삭제, CodeMirror 편집 + 초안 로컬 백업 + `/admin/preview` iframe 실시간 프리뷰
- **온디맨드 재검증**: `app/api/revalidate/route.ts` - `x-revalidate-secret` 헤더 검증 후 `revalidateTag(tag, { expire: 0 })`; 에디터 저장/삭제 시 자동 호출

## Blog Post Format

### 새 글 작성 (현재 방식)

`/admin`에서 작성 (Google 로그인 필요). 제목/설명/커버 이미지/태그/발행 여부를 입력하고 본문은 CodeMirror로 HTML을 직접 작성 (MDX 아님). 본문 HTML은 **blog-html 스킬**(`.claude/skills/blog-html/SKILL.md`)로 MD 초안을 규약(`.post-body` 스코프, 다크모드, 정적 하이라이팅) 준수 HTML로 변환해 붙여넣는 흐름을 권장. 저장 시 backend-api로 전송되고 자동으로 재검증까지 호출됨. 페이로드 형태 (`lib/api/admin.ts`):

```typescript
interface PostPayload {
    slug?: string;
    title?: string;
    description?: string;
    content_html?: string;
    author?: string;
    cover_image_url?: string | null;
    tags?: string[];
    is_published?: boolean;
    published_at?: string;
}
```

### 레거시: `content/` MDX (마이그레이션 완료 — 참고용 보존)

`content/{topic}-{YYYYMMDD}-v01/index.mdx` 형태의 기존 글 22개는 **2026-07-26 마이그레이션 완료** — `scripts/migration/convert.mjs`(기존 Contentlayer와 동일한 remark/rehype/shiki 체인)로 HTML 변환 후 `load_posts.py`로 프로덕션 DB에 적재됨(published_at은 KST 벽시계 보존). 원본은 삭제하지 말고 참고용으로 보존. 아래 frontmatter/코드 블록 문법은 **이 레거시 파일에만 해당**하며, 관련 `blog-frontmatter` 스킬은 deprecated.

```yaml
---
title: "글 제목"                           # required
description: "글 설명"                     # required
image: "../../public/blog-cover/xxx.jpg"  # required
publishedAt: "2025-12-14 10:00:00"         # required
updatedAt: "2025-12-14 10:00:00"           # required
author: "fundev"                           # required
isPublished: true                          # default: true
tags:
  - tag1
  - tag2
---
```

코드 블록 (마이그레이션 변환 스크립트가 참고하는 원본 문법):

```markdown
```typescript showLineNumbers {2-4} title="파일명.ts"
// 코드
```
```

- `showLineNumbers`: 라인 번호 표시 / `{2-4}`: 라인 하이라이팅 / `title="..."`: 파일명 표시

## Styling

Tailwind CSS custom tokens:

```typescript
colors: { dark: "#1b1b1b", light: "#fff", accent: "#7B00D3", accentDark: "#ffdb4d" }
fonts: { "font-mr": Manrope, "font-in": Inter }
screens: { xs: "480px", sxl: "1180px" }
```

Dark mode: `darkMode: "class"`, localStorage 기반

## Environment Variables

전체 목록/설명은 `.env.example` 참고. 로컬 값은 `.env.local`에 설정 (gitignored).

```bash
# backend-api 베이스 URL — 빌드 타임 인라인 (next.config.ts images.remotePatterns도 함께 확인)
NEXT_PUBLIC_API_URL=http://localhost:28000      # 로컬. 프로덕션: https://api.funq.kr

# /api/revalidate 보호용 공유 시크릿 — 두 값을 동일하게 설정
REVALIDATE_SECRET=dev-secret                     # 서버 런타임 전용, build arg 아님
NEXT_PUBLIC_REVALIDATE_SECRET=dev-secret         # 클라이언트(에디터)가 헤더로 전송

# Firebase Web SDK (funq-auth 프로젝트 공용, /admin Google 로그인)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

프로덕션의 `NEXT_PUBLIC_*` 값은 GitHub Actions secrets → Docker build-args로 주입되어 이미지에 인라인됨 (`.github/workflows/deploy.yml`, `Dockerfile`). `REVALIDATE_SECRET`(접두사 없음)만 예외로, build-arg가 아니라 서버의 `~/dev/config/blog-nextjs/.env.prod`에 런타임 값으로 설정.

## Deployment (개인 서버)

```
Ubuntu Server
├── Docker (GHCR 이미지: ghcr.io/nasodev/blog-nextjs)
├── Nginx (80/443 → 3000 proxy)
├── Let's Encrypt HTTPS
└── ufw + fail2ban
```

### CI/CD

GitHub Actions (`main` 브랜치 push 시 자동 배포):
1. Lint 검사
2. Docker 이미지 빌드 (build-args로 `NEXT_PUBLIC_*` 주입) → GHCR push
3. SSH로 서버 배포

**필요 GitHub Secrets**: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`, `GHCR_TOKEN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_REVALIDATE_SECRET`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` (`REVALIDATE_SECRET`은 GitHub Secret이 아니라 서버 `.env.prod`에만 필요 — 아래 서버 초기 설정 참고)

### 수동 배포

```bash
cd ~/dev/blog-nextjs
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 서버 초기 설정

```bash
./deploy/docker-setup.sh
```

`~/dev/config/blog-nextjs/.env.prod` 템플릿을 생성 (없으면). `REVALIDATE_SECRET`은 여기서만 실제로 값이 읽힘 — 나머지 `NEXT_PUBLIC_*` 값은 이미지 빌드 시점에 인라인되므로 이 파일에 적어도 참고용일 뿐, 실제로 바꾸려면 이미지를 재빌드해야 함.

## Build Notes

- `next.config.ts`에 `output: "standalone"` 설정 (Docker 배포용)
- `next.config.ts`에 `outputFileTracingExcludes` 메모리 최적화 설정 (스탠드얼론 산출물 정리 — Contentlayer 제거 후에도 유지)
- SSG: `generateStaticParams()`가 빌드 중 backend-api(`NEXT_PUBLIC_API_URL`)를 호출해 모든 블로그/카테고리 페이지를 정적 생성 — 빌드 시점에 API가 응답 가능해야 함 (GitHub Actions 러너 → api.funq.kr 공인 도메인 접근은 문제없음; 로컬에서 `docker build`를 직접 실행할 때도 build-arg로 API URL을 넘기지 않으면 SSG가 실패함에 유의)
- Contentlayer 제거(Task 10) 이후 빌드는 메모리 집약적이지 않고 API 응답 속도에만 좌우됨 — 이전 Contentlayer+Shiki 조합(수 분, Vercel 무료티어 1GB 빌드 실패 원인) 대비 대폭 단축
- `NEXT_PUBLIC_*` 환경변수는 빌드 타임에 인라인되므로, 값을 바꾸려면 컨테이너 재시작이 아니라 이미지 재빌드가 필요
- Dockerfile은 빌더/러너 모두 `TZ=Asia/Seoul` 고정 — 날짜가 서버 로컬 타임존으로 포맷되므로 UTC면 09시 이전 KST 발행 글이 하루 전 날짜로 표시됨

## Project Structure (Docker 관련)

```
blog-nextjs/
├── Dockerfile               # Multi-stage build (deps/builder/runner/development)
├── docker-compose.yml       # 로컬 개발 환경 (port 23001)
├── docker-compose.prod.yml  # 프로덕션 환경 (GHCR 이미지)
├── .dockerignore
├── run-local.sh             # 로컬 실행 스크립트 (docker/npm)
├── scripts/
│   └── migration/           # 레거시 MDX→HTML 마이그레이션 도구 (완료된 일회성 작업, 보존용)
│       ├── convert.mjs      #   MDX → HTML + 메타 JSON 변환기
│       ├── load_posts.py    #   backend 컨테이너 내 DB 적재기 (upsert)
│       └── load_views.py    #   Supabase 조회수 이관기 (미사용 — 조회수 0부터 재시작 결정)
├── deploy/
│   └── docker-setup.sh      # 서버 초기 설정 스크립트
└── .github/
    └── workflows/
        └── deploy.yml       # CI/CD 파이프라인
```
