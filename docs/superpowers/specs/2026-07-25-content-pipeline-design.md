# 블로그 콘텐츠 파이프라인 개편 디자인 (MD → HTML → 사이트 내 에디터)

**작성일**: 2026-07-25
**대상 프로젝트**: blog-nextjs (https://blog.funq.kr) + backend-api (https://api.funq.kr)
**선행 작업**: Next.js 16 마이그레이션 (docs/superpowers/specs/2026-05-23-nextjs-16-migration-design.md) — 본 개편은 마이그레이션 완료 후 착수

---

## 1. 목표 & 스코프

### 1.1 목표

MDX + Contentlayer 기반 정적 콘텐츠 파이프라인을 **HTML + DB 기반 동적 파이프라인**으로 전환한다.

핵심 동기:
1. **글별 커스텀 디자인** — MDX/typography의 획일적 스타일을 벗어나 글마다 자유로운 HTML/CSS (인포그래픽, 커스텀 레이아웃)
2. **무배포 수정** — 사이트 내 에디터에서 저장 즉시 반영 (git 커밋 → CI/CD → 재빌드 불필요)
3. **이미지 삽입 편의** — 에디터에서 드래그앤드롭 업로드

새 작성 워크플로우:

```
MD 초안 → Claude Code 스킬(blog-html)로 디자인된 HTML 변환(수동, 로컬)
       → /admin 에디터에 붙여넣기 → 메타데이터 입력 → 저장 → 즉시 발행
```

### 1.2 In Scope

| 항목 | 액션 |
|---|---|
| backend-api | `/blog/*` 라우터 신규 (글 CRUD, 이미지 업로드, 조회수), BlogPost 모델 + Alembic 마이그레이션 |
| blog-nextjs 렌더링 | Contentlayer → API fetch + ISR + 온디맨드 재검증 |
| `/admin` 에디터 | CodeMirror 6 + iframe 실시간 프리뷰 + 이미지 업로드, Firebase 로그인 |
| Claude 스킬 | `blog-html` 스킬 신규 (MD → 규칙 준수 HTML 변환) |
| 기존 글 | MDX 20여 개 전량 HTML 변환 + DB 적재 (slug/URL 보존) |
| 조회수 | Supabase → backend-api PostgreSQL 이관 (데이터 포함) |
| 제거 | `contentlayer2`, `next-contentlayer2`, `RenderMdx`, `@supabase/*`, `lib/supabase/`, `next-sitemap` |

### 1.3 Out of Scope

- Next.js 16 마이그레이션 자체 (별도 스펙/플랜으로 선행)
- 2차 API 기능 확장 (본 스펙의 API는 최소 기능만: CRUD/이미지/조회수/인증)
- CLI 직접 업로드 (스킬 → API POST) — 2차에서 API 키 방식으로 검토
- WYSIWYG 편집, 초안(draft) 버전 관리, 다중 작성자
- Giscus, 다크모드, 검색 UI 등 기존 기능의 동작 변경 (데이터 소스만 교체)
- 배포 인프라 구조 변경 (Nginx, GHCR, GitHub Actions 유지)

### 1.4 Success Criteria

1. `/admin`에서 글 저장 → 수 초 내 공개 페이지에 반영 (재배포 없음)
2. 기존 글 20여 개가 기존 URL(`/blogs/{slug}`) 그대로 렌더링 (SEO·Giscus 스레드 보존)
3. 글별 커스텀 `<style>`이 해당 글에만 적용 (다른 페이지 오염 없음), 다크모드 연동
4. 에디터에서 이미지 드래그앤드롭 → 업로드 → `<img>` 자동 삽입
5. 조회수가 기존 수치를 이어받아 계속 집계
6. 목록/검색/태그/RSS/sitemap이 API 데이터 기반으로 동작
7. API 중단 시에도 공개 페이지는 ISR 캐시로 계속 서빙
8. Supabase·Contentlayer 의존성 0건, `npm run build` 통과 (빌드 메모리 사용량 감소)
9. backend-api `pytest` 통과 (기존 TDD 패턴의 unit/integration 테스트 포함)

---

## 2. 아키텍처

### 2.1 시스템 구성

```
[로컬 작성 환경]                      [운영 서버 (Ubuntu + Docker)]
                                    ┌─────────────────────────────────┐
MD 초안                             │  blog-nextjs (Next.js 16)       │
  │                                 │    ├─ 공개 페이지 (ISR 캐시)      │
  ▼                                 │    └─ /admin 에디터 (인증 필요)   │
Claude Code 스킬 (blog-html)        │         │                       │
  │  MD → 디자인된 HTML              │         ▼ REST                 │
  ▼                                 │  backend-api (FastAPI)          │
HTML 파일                           │    ├─ /blog/* 라우터 (신규)      │
  │                                 │    ├─ 이미지 볼륨 (신규)          │
  └── /admin 에디터에 붙여넣기 ──────▶│    └─ PostgreSQL (기존 공유)     │
                                    └─────────────────────────────────┘
```

- Supabase, Contentlayer 완전 제거. 글·조회수·이미지의 소유자는 backend-api
- 블로그 프론트는 API의 소비자. 2차 계획은 이 API의 기능 확장으로 이어짐
- backend-api의 CORS에 `https://blog.funq.kr` 이미 등록됨 (변경 불필요)

### 2.2 데이터 모델 (PostgreSQL)

**BlogPost 테이블** — 조회수는 별도 테이블 없이 컬럼 통합:

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | UUID PK | |
| slug | TEXT unique, not null | 기존 콘텐츠 폴더명 그대로 (`{topic}-{YYYYMMDD}-v01`) |
| title | TEXT not null | |
| description | TEXT not null | |
| author | TEXT not null | 기본 "fundev" |
| content_html | TEXT not null | 본문 HTML (스코프된 `<style>` 1개 포함 가능) |
| cover_image_url | TEXT | 헤더 이미지 URL (기존 글은 `/blog-cover/...`, 신규는 API URL) |
| tags | JSONB | 문자열 배열 |
| toc | JSONB | 저장 시 서버가 content_html의 h2/h3에서 자동 추출 `[{level, text, slug}]`. id가 없는 제목에는 서버가 kebab-case id를 부여해 content_html에 반영 (앵커 링크 보장) |
| reading_time_minutes | INT | 저장 시 서버가 텍스트 길이 기반 자동 계산 |
| view_count | INT not null default 0 | `UPDATE ... SET view_count = view_count + 1` (원자적) |
| is_published | BOOL not null default true | false면 공개 API에서 제외 |
| published_at | TIMESTAMPTZ not null | |
| updated_at | TIMESTAMPTZ not null | 저장 시 서버가 갱신 |

toc·reading_time을 서버가 계산하므로 에디터와 스킬은 본문 HTML만 책임진다 (단, 제목 id 부여는 스킬/작성자 몫 — §5.1 규칙 4).

이미지는 DB가 아닌 Docker 볼륨 파일시스템에 저장하고 메타데이터 테이블은 두지 않는다 (파일명 = UUID + 확장자, 목록 조회 불필요).

### 2.3 API 설계 (`app/routers/blog/`)

기존 컨벤션(APIRouter + prefix/tags, Pydantic 스키마 분리, Protocol 기반 서비스 + DI) 준수.

**공개 (인증 없음)**

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/blog/posts` | 발행 글 목록. 본문 제외한 요약 필드(slug/title/description/tags/cover/published_at/view_count/reading_time). 쿼리: `tag`, `page`, `size` |
| GET | `/blog/posts/{slug}` | 글 상세 (content_html, toc 포함). 비발행 글은 404 |
| POST | `/blog/posts/{slug}/view` | 조회수 +1. 응답으로 현재 count 반환 (기존 Supabase RPC 대체) |
| GET | `/blog/images/{filename}` | 업로드 이미지 서빙 (FastAPI StaticFiles, Nginx 프록시 캐싱) |

**관리자 (Firebase 인증 + 관리자 체크)**

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/blog/posts` | 글 생성 (slug 중복 시 409) |
| PUT | `/blog/posts/{slug}` | 글 수정 (메타데이터 + content_html) |
| DELETE | `/blog/posts/{slug}` | 글 삭제 |
| POST | `/blog/images` | 이미지 업로드 (multipart). 볼륨 저장 후 공개 URL 반환. 크기 제한 10MB, 확장자 화이트리스트(jpg/png/gif/webp/svg) |
| GET | `/blog/admin/posts` | 비발행 포함 전체 목록 (에디터 목록 화면용) |
| GET | `/blog/admin/posts/{slug}` | 비발행 포함 글 상세 (에디터 편집 화면용) |

**인증**: 기존 Firebase `get_current_user` 의존성 재사용 + 신규 `get_blog_admin` 의존성 (환경변수 `BLOG_ADMIN_UIDS`의 UID 목록에 포함된 사용자만 통과, 아니면 403).

**검증**: content_html은 sanitize하지 않는다 (관리자 본인만 작성하는 신뢰 콘텐츠, 커스텀 HTML이 목적). 크기 상한 2MB만 검증.

---

## 3. 프론트엔드 설계 (blog-nextjs)

### 3.1 렌더링 전략 — ISR + 온디맨드 재검증 (Approach A)

- 글 페이지 fetch: `fetch(API + "/blog/posts/" + slug, { next: { tags: ["post:" + slug] } })`
- 목록성 fetch(홈/카테고리/검색/RSS/sitemap): `{ next: { tags: ["posts"] } }`
- `generateStaticParams`: 빌드 시 API에서 slug 목록 조회 → 전체 프리렌더. 새 글은 `dynamicParams`(기본값 true)로 첫 요청 시 생성 후 캐시
- **재검증 라우트**: `app/api/revalidate/route.ts`
  - 요청 헤더의 공유 시크릿(`REVALIDATE_SECRET` 환경변수) 검증, 불일치 시 401
  - body의 slug로 `revalidateTag("post:" + slug)` + `revalidateTag("posts")`
  - 호출자: `/admin` 에디터 (저장 성공 직후)
- 시간 기반 revalidate는 두지 않는다 — 콘텐츠 변경은 항상 에디터를 통하므로 온디맨드로 충분. API 장애 시 stale 캐시가 무기한 서빙되는 것이 오히려 원하는 동작

### 3.2 글 페이지 (`app/blogs/[slug]/page.tsx`)

- 페이지 구조 유지: 히어로(커버 이미지 + 태그 + 제목), BlogDetails(날짜/조회수/읽기시간), TOC 사이드바, 본문, Giscus
- 데이터 소스만 교체: `allBlogs.find(...)` → API fetch. `generateMetadata`(OG/canonical)와 JSON-LD도 API 응답 필드로 동일하게 구성
- `RenderMdx` → **`PostBody` 컴포넌트**로 교체:
  ```tsx
  <div className="post-body col-span-12 lg:col-span-8 font-in prose ..."
       dangerouslySetInnerHTML={{ __html: post.content_html }} />
  ```
- 커버 이미지는 `next/image` 대신 일반 `<img>` (외부 URL·크기 미상 대응) 또는 `remotePatterns`에 api.funq.kr 등록 후 `next/image` — 구현 시 결정 (Open Question §8.2)

### 3.3 목록·검색·RSS·sitemap

| 기능 | 현재 | 변경 |
|---|---|---|
| 홈/카테고리 목록 | `allBlogs` 정렬/필터 | `GET /blog/posts` (tags: `posts`) |
| 검색 (Cmd+K) | Fuse.js + allBlogs | Fuse.js 유지, 인덱스만 목록 API 응답으로 구성 |
| `/feed.xml` | `force-static` | API fetch + tags: `posts` (재검증 시 갱신) |
| sitemap | `next-sitemap` (postbuild) | `app/sitemap.ts` (API 기반 동적 생성), `next-sitemap` 및 postbuild 스크립트 제거 |
| 조회수 | Supabase RPC | `lib/api/views.ts` → `POST /blog/posts/{slug}/view`. ViewCounter 컴포넌트 인터페이스 불변 |

### 3.4 `/admin` 에디터

- **인증**: Firebase Web SDK, Google 로그인. ID 토큰을 API 요청 `Authorization: Bearer`에 첨부. 프론트의 로그인 상태 체크는 UX용이며 실제 권한 검증은 전적으로 API(403) 담당
- **목록 화면** (`/admin`): `GET /blog/admin/posts` — 발행/비발행 전체, 새 글/편집 진입
- **편집 화면** (`/admin/posts/[slug]`, 새 글은 `/admin/posts/new`):
  - 좌측 **CodeMirror 6** (HTML 모드) — Monaco 대비 경량, 번들 부담 최소
  - 우측 **실시간 프리뷰** — `iframe srcDoc`에 사이트 CSS + `.post-body` 래퍼 + 다크모드 토글 포함. 실제 글 페이지와 동일 렌더 보장 + 스타일 격리
  - 메타데이터 폼: slug(새 글만 편집 가능)/제목/설명/태그/커버 이미지/발행 여부
  - **이미지 삽입**: 드래그앤드롭·붙여넣기 → `POST /blog/images` → 커서 위치에 `<img src="..." alt="" />` 삽입
  - **저장 흐름**: PUT/POST → 성공 시 `/api/revalidate` 호출 → 완료 표시 + "블로그에서 보기" 링크
  - **초안 보호**: 편집 내용을 localStorage에 주기 저장 (저장 실패·이탈 시 복구)
- 색인 제외: `/admin` 레이아웃에 `robots: noindex` 메타

---

## 4. 커스텀 HTML/CSS 규약

글 본문 HTML이 지켜야 하는 규칙 (스킬이 생성 시 준수, 에디터 수정 시에도 유지):

1. **구조**: `<style>` 블록 최대 1개 + 본문 마크업. `<script>` 사용하지 않음 (필요해지면 별도 논의)
2. **CSS 스코프**: 모든 선택자는 `.post-body` 하위로 한정 (`.post-body .my-card { ... }`). 전역 선택자(`body`, `h2` 단독 등) 금지
3. **다크모드**: `html.dark` 기반 — `.dark .post-body .my-card { ... }`. 사이트 팔레트 준수: `accent #7B00D3`, `accentDark #ffdb4d`, `dark #1b1b1b`, `light #fff`
4. **제목**: h2/h3에 고유 `id` 부여 (TOC 자동 추출·앵커 링크용, 기존 rehype-slug 규칙과 동일한 kebab-case)
5. **코드 블록**: 변환 시점에 하이라이팅 완료된 정적 HTML (github-dark 팔레트, 기존 rehype-pretty-code 룩 유지). 런타임 하이라이터 없음
6. **이미지**: 업로드 전 로컬 경로는 `<!-- TODO: 업로드 후 교체 -->` 주석 표시 → 에디터에서 업로드로 교체
7. **반응형**: 사이트 브레이크포인트(xs 480px, sxl 1180px) 존중, 가로 스크롤 유발 금지

---

## 5. Claude 스킬 & 마이그레이션

### 5.1 신규 스킬 `blog-html` (blog-nextjs `.claude/skills/`)

- 입력: MD 초안 (또는 주제 + 개요)
- 출력: §4 규약을 준수하는 본문 HTML 파일 + 메타데이터(제목/설명/태그 제안)
- 스킬 문서에 §4 규약 전문과 좋은 예시 1개를 포함해 일관된 출력 유도
- 기존 `blog-frontmatter`, `blog-img`, `blog-img-apply` 스킬은 MDX 전제이므로 HTML 파이프라인에 맞게 후속 정비 (구현 플랜에서 처리)

### 5.2 기존 글 마이그레이션 (일회성)

1. **변환**: Claude Code로 `content/*/index.mdx` 20여 개를 §4 규약 HTML로 일괄 변환. frontmatter → 메타데이터 JSON 추출. slug = 기존 폴더명 (URL 완전 보존)
2. **이미지**: 기존 `public/` 이미지(blog-cover 등)는 이동하지 않음 — URL 불변으로 호환성 유지. 신규 글부터 API 업로드 사용
3. **적재**: 변환 산출물(HTML + 메타 JSON)을 관리자 인증으로 API에 일괄 등록하는 스크립트
4. **조회수 이관**: Supabase `views` 테이블 export → slug 매칭으로 `view_count` 업데이트하는 일회성 스크립트
5. **검증**: 전 글 프리뷰/실페이지 육안 비교 (구 MDX 렌더와 대조)
6. **정리**: 검증 후 Contentlayer·Supabase 의존성 제거. `content/` 디렉터리는 원본 보존용 아카이브로 저장소에 유지 (빌드 대상에서만 제외)

### 5.3 제거 목록

| 대상 | 저장소 |
|---|---|
| `contentlayer2`, `next-contentlayer2`, `.contentlayer/`, `contentlayer.config.ts`, `withContentlayer` 래핑 | blog-nextjs |
| `components/Blog/RenderMdx.tsx` | blog-nextjs |
| `@supabase/ssr`, `@supabase/supabase-js`, `lib/supabase/` | blog-nextjs |
| `next-sitemap` + postbuild 스크립트 | blog-nextjs |
| Supabase 프로젝트 (`views` 테이블) | 외부 — 배포 안정 확인 후 정리 |

Contentlayer 제거로 빌드 메모리 문제의 근원이 사라진다 (MDX 컴파일 전체가 빌드에서 제외).

---

## 6. 에러 처리

| 상황 | 동작 |
|---|---|
| API 다운 (공개 페이지) | ISR 캐시 stale 서빙 지속 — 블로그 생존. 재검증은 다음 요청에서 재시도 |
| API 다운 (빌드 시) | `generateStaticParams` 실패 → 빌드 실패로 조기 감지 (기존 CI/CD 게이트 활용) |
| 조회수 API 실패 | 조용히 무시 (현 Supabase 방식과 동일, 글 표시 무영향) |
| 에디터 저장 실패 | 에러 표시 + 편집 내용 유지 + localStorage 초안 복구 |
| revalidate 실패 (저장 성공 후) | 에디터에 경고 + 재시도 버튼 (데이터 안전, 캐시만 구버전) |
| 이미지 업로드 실패 | 에러 토스트, 본문 변경 없음 |
| slug 중복 생성 | API 409 → 에디터에서 slug 수정 유도 |
| 잘못된/깨진 HTML | iframe 프리뷰라 에디터 자체는 안전. 저장은 크기 제한만 검증 (관리자 신뢰 콘텐츠) |

---

## 7. 테스트 & 롤아웃

### 7.1 테스트

- **backend-api**: 기존 TDD 패턴 — Protocol 기반 Fake + unit/integration
  - unit: TOC 추출, reading time 계산, 관리자 권한 체크
  - integration: CRUD 왕복, 비발행 글 공개 API 제외, 조회수 증가, 이미지 업로드 검증(크기/확장자), 401/403/404/409
- **blog-nextjs**: `npm run lint` + `npm run build` (CI 게이트) + 수동 체크리스트:
  - 전 페이지 렌더 (홈/글/카테고리/about/contact), 다크모드(글 커스텀 CSS 포함), 검색, RSS, sitemap, Giscus, 조회수, 에디터 로그인→편집→저장→반영 왕복, 이미지 업로드
- **마이그레이션**: 변환 글 전수 육안 비교

### 7.2 롤아웃 순서

```
0. Next.js 16 마이그레이션 실행 (기존 플랜, 선행)
1. backend-api: /blog 도메인 개발 + 배포 — 프론트 무영향, 안전
2. blog-nextjs: API 연동 + /admin 에디터 (feature branch)
3. 기존 글 변환 + 적재 + 조회수 이관 (콘텐츠 동결 시작)
4. 브랜치 전수 검증 → 머지 → 배포 (콘텐츠 동결 해제)
5. 배포 안정 확인 후 Supabase 프로젝트 정리
```

- 2~4단계 동안 새 글 작성만 멈추면 정합성 문제 없음 (1인 블로그)
- 롤백: 프론트는 이전 GHCR 이미지로 `docker compose up`, API는 라우터 추가라 기존 기능(캘린더/AI) 무영향. 4단계 배포 전까지 main은 항상 구버전으로 동작

### 7.3 환경변수 추가

| 변수 | 위치 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | blog-nextjs | API 베이스 URL (https://api.funq.kr) |
| `REVALIDATE_SECRET` | blog-nextjs | 재검증 라우트 보호 |
| `NEXT_PUBLIC_FIREBASE_*` | blog-nextjs | Firebase Web SDK 설정 (관리자 로그인) |
| `BLOG_ADMIN_UIDS` | backend-api | 관리자 Firebase UID 목록 |
| `BLOG_IMAGE_DIR` | backend-api | 이미지 볼륨 경로 |

Supabase 환경변수(`NEXT_PUBLIC_SUPABASE_*`)는 5단계에서 제거.

---

## 8. Open Questions (구현 단계로 미룸)

1. **CodeMirror 프리뷰 디바운스/성능** — 긴 글에서 srcDoc 갱신 주기 (구현하며 조정)
2. **커버 이미지 렌더링** — 일반 `<img>` vs `remotePatterns` 등록 후 `next/image` (blur placeholder 유지 여부 포함)
3. **이미지 서빙 경로** — FastAPI StaticFiles 직접 vs Nginx location 직접 서빙 (성능 필요 시)
4. **프리뷰용 사이트 CSS 주입 방식** — Tailwind 빌드 산출물을 iframe에 넣는 구체 방법
5. **`blog-frontmatter`/`blog-img` 스킬 정비 범위** — HTML 파이프라인 대응 수정 vs 폐기

---

## 9. Approach 선정 근거

렌더링 전략 3안 중 **A (ISR + 온디맨드 재검증)** 선택:

| 항목 | **A. ISR+재검증 ⭐** | B. 동적 SSR+짧은 캐시 | C. 저장 시 재빌드 |
|---|---|---|---|
| 수정 반영 속도 | **즉시** | 즉시(캐시 TTL 내 지연) | 수 분 (빌드+배포) |
| 방문자 응답 속도 | **정적 수준** | API 왕복 의존 | 정적 수준 |
| API 장애 내성 | **캐시로 생존** | 블로그 동반 장애 | 무관 |
| 빌드 메모리 문제 | 해소 | 해소 | 그대로 |
| 구현 복잡도 | 중 (revalidate 연동) | 낮음 | 높음 (웹훅+CI) |
| "무배포 수정" 달성 | **달성** | 달성 | 사실상 미달성 |

C는 목표와 모순되어 탈락, B는 서비스 간 결합(API 장애 = 블로그 장애)으로 탈락.

에디터 위치는 별도 관리자 앱 대신 **블로그 앱 내 `/admin`** — 프리뷰가 실제 사이트 CSS·레이아웃을 재사용해 "프리뷰 = 실제 화면"을 보장하고 배포 단위도 하나로 유지.

백엔드는 신규 서버 대신 **기존 backend-api 확장** — 인증(Firebase)·DB(PostgreSQL)·CI/CD·Nginx가 이미 갖춰져 있고, 2차 API 계획과 같은 코드베이스로 수렴.

---

## 참고

- 선행 스펙: [Next.js 16 마이그레이션](2026-05-23-nextjs-16-migration-design.md)
- backend-api 컨벤션: `C:\dev\funq\backend-api\CLAUDE.md`
- Next.js 캐싱/재검증: https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration
