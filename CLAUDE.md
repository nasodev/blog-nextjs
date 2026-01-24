# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 14 기반 기술 블로그 (https://blog.funq.kr)

| Stack | Technology |
|-------|------------|
| Framework | Next.js 14.2.35, React 18, TypeScript |
| Content | Contentlayer2, MDX, remark-gfm |
| Styling | Tailwind CSS, @tailwindcss/typography |
| Database | Supabase (PostgreSQL) |
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
npm run build     # 프로덕션 빌드 + sitemap 생성
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
content/{slug}/index.mdx → Contentlayer2 빌드 → .contentlayer/generated/
                                                      ↓
                                              allBlogs (타입 안전한 데이터)
                                                      ↓
                                              app/blogs/[slug]/page.tsx
```

- **Contentlayer2**: 빌드 타임에 MDX → 타입이 있는 JSON 변환
- **Computed Fields**: `url`, `readingTime`, `toc` 자동 생성 (`contentlayer.config.ts`)
- **MDX Plugins**: remark-gfm, rehype-slug, rehype-autolink-headings, rehype-pretty-code (github-dark)

### Data Flow

```
[Supabase]                    [Contentlayer]
    │                              │
    ▼                              ▼
lib/supabase/api/views.ts    allBlogs (generated)
    │                              │
    ▼                              ▼
ViewCounter.tsx              RenderMdx.tsx (useMDXComponent)
```

### Key Integration Points

- **조회수**: `lib/supabase/api/views.ts` - Supabase RPC `increment()` 호출
- **댓글**: `components/Comments/index.tsx` - Giscus (GitHub Discussions)
- **SEO**: `app/blogs/[slug]/page.tsx` - generateMetadata() + JSON-LD

## Blog Post Format

### Frontmatter Schema

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

### Code Block Syntax

```markdown
```typescript showLineNumbers {2-4} title="파일명.ts"
// 코드
```
```

- `showLineNumbers`: 라인 번호 표시
- `{2-4}`: 2-4번 라인 하이라이팅
- `title="..."`: 파일명 표시

### 새 글 생성

경로: `content/{topic}-{YYYYMMDD}-v01/index.mdx`

## Styling

Tailwind CSS custom tokens:

```typescript
colors: { dark: "#1b1b1b", light: "#fff", accent: "#7B00D3", accentDark: "#ffdb4d" }
fonts: { "font-mr": Manrope, "font-in": Inter }
screens: { xs: "480px", sxl: "1180px" }
```

Dark mode: `darkMode: "class"`, localStorage 기반

## Supabase

### Views 테이블

```sql
CREATE TABLE views (
    slug TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
);

CREATE FUNCTION increment(slug_text TEXT)
RETURNS void AS $$
    UPDATE views SET count = count + 1 WHERE slug = slug_text;
$$ LANGUAGE sql;
```

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

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
2. Docker 이미지 빌드 → GHCR push
3. SSH로 서버 배포

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

## Build Notes

- Contentlayer + MDX 빌드는 메모리 집약적 → Vercel 무료티어(1GB) 빌드 실패로 개인 서버 사용
- `next.config.js`에 `output: "standalone"` 설정 (Docker 배포용)
- `next.config.js`에 `outputFileTracingExcludes` 메모리 최적화 설정
- SSG: `generateStaticParams()`로 빌드 시 모든 블로그 페이지 정적 생성

## Project Structure (Docker 관련)

```
blog-nextjs/
├── Dockerfile               # Multi-stage build (deps/builder/runner/development)
├── docker-compose.yml       # 로컬 개발 환경 (port 23001)
├── docker-compose.prod.yml  # 프로덕션 환경 (GHCR 이미지)
├── .dockerignore
├── run-local.sh             # 로컬 실행 스크립트 (docker/npm)
├── deploy/
│   └── docker-setup.sh      # 서버 초기 설정 스크립트
└── .github/
    └── workflows/
        └── deploy.yml       # CI/CD 파이프라인
```
