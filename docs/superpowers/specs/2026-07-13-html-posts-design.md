# HTML 포스트 지원 설계

- 작성일: 2026-07-13
- 상태: 승인됨 (구현 전)

## 배경과 목표

이 블로그는 `content/{slug}/index.mdx` → Contentlayer2 → SSG 파이프라인으로 글을 발행한다.
앞으로 AI가 자료를 기반으로 블로그 글을 **HTML로 생성**하게 되며(생성 스킬은 별도 작업),
이 설계는 그 HTML 글이 기존 MDX 글과 동등하게 발행·수정될 수 있도록 블로그 파이프라인을 확장한다.

핵심 결정 (사용자 확정):

1. **편집 방식**: 로컬 파일 수정 + git push → CI 자동 배포. 웹 관리자 UI/인증/런타임 편집은 만들지 않는다.
2. **HTML 형태**: 본문 HTML. 기존 블로그 레이아웃(헤더/푸터/목차/댓글/조회수/다크모드/prose 스타일)으로 감싼다. 완성형 독립 HTML 페이지는 지원하지 않는다.
3. **파일 규격**: frontmatter + HTML 본문을 한 파일(`content/{slug}/index.html`)에 담는다. frontmatter 스키마는 기존 MDX와 동일.
4. **접근안**: Contentlayer를 건드리지 않는 별도 빌드타임 HTML 파이프라인 + 통합 포스트 레이어 (contentlayer2의 `contentType`은 `markdown | mdx | data`뿐이라 HTML을 네이티브 지원하지 않음을 확인).

## 파일 규격 (AI 생성 스킬과의 출력 계약)

```
content/{topic}-{YYYYMMDD}-v01/index.html    ← 폴더명 = slug (기존 규칙 동일)
public/blog-cover/{이름}.jpg                  ← 커버 이미지 (기존 규칙 동일)
public/blog-images/{slug}/*.png               ← 본문 이미지 (신규 규칙)
```

`index.html` 구조:

```html
---
title: "글 제목"                            # 필수
description: "글 설명"                      # 필수
image: "../../public/blog-cover/xxx.jpg"   # 필수, 파일이 실제로 존재해야 함
publishedAt: "2026-07-13 10:00:00"          # 필수
updatedAt: "2026-07-13 10:00:00"            # 필수
author: "fundev"                            # 필수
isPublished: true                           # 선택, 기본 true
tags:                                       # 선택
  - ai
---
<h2>섹션 제목</h2>
<p>본문…</p>
<img src="/blog-images/my-post-20260713-v01/diagram.png" alt="설명">
<pre><code class="language-typescript">const x = 1;</code></pre>
```

본문 규칙:

- 시맨틱 HTML 조각(fragment)을 권장: `h2`~`h4`, `p`, `ul/ol/li`, `pre > code.language-*`, `img`, `blockquote`, `table`, `a`, `strong/em/code` 등. `<html>`, `<head>`, `<body>` 래퍼 없이 본문만 작성한다. 태그 화이트리스트를 빌드에서 강제하지는 않는다.
- `<script>`와 `<style>` 태그는 빌드 시 제거된다(`<script>`는 AI 생성 콘텐츠 안전 기본값, `<style>`은 사이트 전역 스타일 오염 방지). 인터랙티브 콘텐츠가 필요해지면 별도 결정.
- 본문 이미지는 `/blog-images/{slug}/` 절대 경로로 참조하고 파일은 `public/blog-images/{slug}/`에 둔다.
- 코드 하이라이팅은 `<pre><code class="language-xxx">` 형식을 따르면 MDX와 동일하게 적용된다(github-dark).

## 아키텍처

### 빌드 파이프라인 (신규)

```
content/*/index.html
      ↓  scripts/build-html-posts.mjs  (npm prebuild/predev 훅으로 자동 실행)
      ├─ gray-matter: frontmatter 파싱 + 필수 필드/날짜/이미지 존재 검증
      ├─ rehype 파이프라인 (MDX와 동일 플러그인·설정):
      │    rehype-parse(fragment) → rehype-slug → rehype-autolink-headings
      │    → rehype-pretty-code(github-dark) → <script>/<style> 제거 → <img> lazy loading 부여
      │    → rehype-stringify
      ├─ 계산 필드:
      │    url          = /blogs/{slug}
      │    toc          = HTML 헤딩(h1~h6)에서 추출, 기존과 동일한 {level, text, slug} 형태
      │                   (level: 1→"one", 2→"two", 3+→"three", slug는 rehype-slug가 부여한 id 재사용)
      │    readingTime  = 태그 제거한 순수 텍스트 기준 (reading-time 패키지)
      │    image        = 커버 이미지 크기 + blurhash 계산, Contentlayer image 필드와 동일 shape
      │                   ({filePath: "../public/...", width, height, blurhashDataUrl, ...})
      ↓
.generated/html-posts.json   (gitignore, 글이 없으면 빈 배열)
```

- 생성된 JSON은 `lib/posts.ts`가 **정적 import**한다. 웹팩 번들에 포함되므로 Contentlayer 글과 마찬가지로
  프로덕션 standalone 컨테이너(런타임에 `content/` 없음, 휘발성 FS)에서 그대로 동작한다.
- `prebuild`/`predev`/`prelint` 훅으로 실행되므로 Docker 빌드·CI·로컬 dev 어디서도 워크플로우 변경이 없다. (`prelint`는 gitignore된 JSON이 없는 클린 체크아웃에서 CI lint 단계의 import 해석이 깨지지 않게 하기 위함)
- Contentlayer 설정과 MDX 글 처리 경로는 변경하지 않는다.

### 통합 포스트 레이어

```
[Contentlayer allBlogs (MDX)]     [.generated/html-posts.json (HTML)]
              └──────────┬──────────────┘
                   lib/posts.ts
        공통 Post 타입: 기존 필드 동일 + body만 구분
        body: { kind: "mdx", code: string } | { kind: "html", html: string }
                         ↓
      홈 / 상세 / 카테고리 / RSS / 검색 / sitemap 전부 이 레이어 사용
```

- `getAllPosts()`: 두 소스를 공통 타입으로 매핑·병합·정렬해 반환. 리스트 소비처는 기존 `BlogSummary` 변환(`toBlogSummary`)을 그대로 사용할 수 있도록 shape을 맞춘다.
- 상세 페이지(`app/blogs/[slug]/page.tsx`)는 `kind`로 분기: MDX → 기존 `RenderMdx`, HTML → 신규 `RenderHtml`.
- `RenderHtml`은 서버 컴포넌트로, RenderMdx와 **동일한 prose 스타일 클래스**(상수로 추출해 공유)를 적용하고 `dangerouslySetInnerHTML`로 렌더링한다.
- 목차·댓글(Giscus)·조회수(ViewCounter)·다크모드·generateMetadata·JSON-LD는 두 종류 모두 동일하게 적용된다.
- sitemap(next-sitemap postbuild)과 RSS(feed.xml)는 통합 레이어를 쓰는 순간 HTML 글을 자동 포함한다.
- 상세 페이지가 `isPublished`를 필터하지 않는 기존 동작(리스트에만 필터)은 그대로 유지한다.

## 변경/신규 파일

신규:

| 파일 | 역할 |
|------|------|
| `scripts/build-html-posts.mjs` | HTML 글 스캔 → 검증 → 가공 → JSON 생성 |
| `lib/posts.ts` | MDX+HTML 통합 레이어 (`getAllPosts()`, 공통 `Post` 타입) |
| `components/Blog/RenderHtml.tsx` | HTML 본문 렌더러 (서버 컴포넌트) |
| `.generated/html-posts.json` | 빌드 산출물 (gitignore) |

수정:

| 파일 | 변경 내용 |
|------|----------|
| `app/page.tsx`, `app/categories/[slug]/page.tsx`, `app/feed.xml/route.ts`, `components/Search/index.tsx` | `allBlogs` 직접 사용 → 통합 레이어로 교체 |
| `app/blogs/[slug]/page.tsx` | 통합 레이어 조회 + `kind`별 렌더러 분기 |
| `components/Blog/RenderMdx.tsx` | prose 클래스 상수 추출 (RenderHtml과 공유) |
| `package.json` | `prebuild`/`predev`/`prelint` 스크립트, rehype 계열·gray-matter 등 직접 의존성 추가 |
| `.gitignore` | `.generated/` 추가 |

## 에러 처리

모든 검증은 빌드 타임에 수행되어 문제가 있으면 배포 전에 CI가 실패한다. 빌드 실패 조건:

- frontmatter 필수 필드 누락 또는 날짜 형식 오류 → slug와 필드명을 명시한 에러
- 커버 이미지 파일이 존재하지 않음
- 같은 폴더에 `index.mdx`와 `index.html` 공존 (slug 충돌)
- HTML 본문이 비어 있음

런타임 신규 실패 지점은 없다. HTML 글도 정적 데이터로 번들되므로 기존 MDX 글과 동일한 안정성을 가진다.

## 테스트

- **단위 테스트** (`node:test`, 신규 의존성 없음): 빌드 스크립트의 frontmatter 검증, toc 추출, `<script>` 제거, readingTime 계산
- **픽스처 글**: 테스트용 HTML 글 1개를 `content/`에 추가해 실제 빌드로 검증
- **회귀 확인**: `npm run build` 통과 + 로컬 실행으로 (1) HTML 글이 홈/상세/카테고리/RSS/검색에 노출, (2) 기존 MDX 글 렌더링 무변화 확인 (Playwright 스모크)

## 범위 제외

- AI 글 생성 스킬 (별도 작업 — 본 문서의 파일 규격이 그 스킬의 출력 계약)
- 웹 관리자 UI / 인증 / 런타임 편집
- dev 서버 실행 중 HTML 글 핫리로드 (수정 후 dev 재시작 또는 `node scripts/build-html-posts.mjs` 수동 실행)
- 기존 MDX 글의 HTML 마이그레이션
- 본문 `<img>`의 next/image 최적화 (lazy loading만 부여)
