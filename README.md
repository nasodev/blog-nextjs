# blog-nextjs

기술 블로그 [blog.funq.kr](https://blog.funq.kr) — Next.js 16 기반, backend-api 콘텐츠 파이프라인.

| Stack | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, TypeScript |
| Content | backend-api `/blog` REST API (tag 기반 on-demand ISR) |
| Styling | Tailwind CSS, @tailwindcss/typography |
| Admin Auth | Firebase Auth (Google 로그인) |
| Comments | Giscus (GitHub Discussions) |
| Hosting | Ubuntu Server + Docker + Nginx + HTTPS |

## Architecture

```
/admin (Firebase 로그인) → PostEditor (CodeMirror, HTML 본문)
        │ 저장
        ▼
backend-api /blog (Postgres) ──fetch(tags)──▶ 공개 페이지 (SSG + on-demand ISR)
        ▲                                          ▲
        └── POST /api/revalidate ◀── 저장/삭제 시 태그 즉시 만료 (재빌드 불필요)
```

글은 저장소의 MDX 파일이 아니라 backend-api DB에 HTML로 저장되며, `/admin` 에디터에서 저장하면 재배포 없이 수 초 내 공개 페이지에 반영된다. 레거시 MDX 원본(`content/`)은 2026-07 마이그레이션 완료 후 참고용으로만 보존.

## Local Development

backend-api가 로컬(포트 28000)에서 떠 있어야 한다. 환경변수는 `.env.example` 참고해 `.env.local` 작성.

```bash
# Docker
./run-local.sh          # 또는 docker compose up --build

# npm
./run-local.sh npm      # 또는 npm run dev -- -p 23001
```

→ http://localhost:23001

```bash
npm run build     # 프로덕션 빌드 (빌드 중 backend-api 호출 — SSG)
npm run lint      # ESLint
```

## Writing Posts

`/admin`에서 작성 (Google 로그인 + 관리자 UID 필요). 본문은 HTML 직접 작성이며, Claude Code의 `blog-html` 스킬로 MD 초안을 디자인된 HTML로 변환해 붙여넣는 흐름을 권장. 상세 규약은 `.claude/skills/blog-html/SKILL.md`.

## Deployment

`main` push 시 GitHub Actions가 자동 배포: lint → Docker 이미지 빌드(GHCR) → SSH 배포. 상세는 `.github/workflows/deploy.yml`과 `CLAUDE.md`의 Deployment 섹션 참고.
