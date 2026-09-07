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
npm run typecheck # Next route types + TypeScript
npm run test:unit # API/피드/언어 등 단위 회귀 검사
npm run test:e2e  # 로컬 mock API + Chromium 회귀 검사
```

## Writing Posts

`/admin`에서 작성 (Google 로그인 + 관리자 UID 필요). 본문은 HTML 직접 작성이며, Claude Code의 `blog-html` 스킬로 MD 초안을 디자인된 HTML로 변환해 붙여넣는 흐름을 권장. 상세 규약은 `.claude/skills/blog-html/SKILL.md`.

### English posts

- 기존 한국어 주소는 `/blogs/{slug}`, 영문은 `/en/blogs/{slug}`. `/en`에서 영문 목록·검색을 제공한다.
- `/admin`의 한국어 글 옆 **영문 작성**을 선택해 영문 제목·설명·HTML 본문을 입력한다. 태그·커버·작성자는 원문을 재사용하며 번역은 기본적으로 초안이다. **발행** 후 저장하면 공개된다. 자동 번역은 수행하지 않는다.
- 현재 API를 그대로 사용하며 영문 글은 `en-{원문 slug}`라는 별도 DB 레코드로 저장한다. `en-`는 영문 전용 접두사이고 원문 slug는 변경하지 않는다. 두 글의 발행·삭제·조회수·댓글은 독립적이다.
- 발행된 글만 언어 전환, `hreflang`, 사이트맵에 포함한다. 각 언어의 canonical은 자기 주소를 가리키고 번역이 없는 영문 주소는 404다. 번역이 0개인 영문 목록은 `noindex` 처리한다.
- RSS는 `/feed.xml`(한국어), `/en/feed.xml`(영문). 저장·삭제 시 양쪽 글의 캐시를 갱신한다.

언어별 URL과 상호 `hreflang`은 [Google 다국어 페이지 지침](https://developers.google.com/search/docs/specialty/international/localized-versions)을 따른다. 루트 레이아웃은 `app/(ko)`와 `app/(en)/en`으로 나누어 서버 HTML의 `lang`도 맞춘다.

```bash
npm run test:unit
```

## Deployment

`main` push 시 GitHub Actions가 자동 배포: lint → Docker 이미지 빌드(GHCR) → SSH 배포. 상세는 `.github/workflows/deploy.yml`과 `CLAUDE.md`의 Deployment 섹션 참고.

## Regression tests

처음에는 `npx playwright install chromium`으로 브라우저를 설치한다. `npm run test:e2e`는 127.0.0.1의 23002(Next)/28001(mock API) 포트를 사용하고, 실제 관리자 계정이나 backend가 필요 없다. 영역별 분석은 `docs/improvements/`에 기록한다.
