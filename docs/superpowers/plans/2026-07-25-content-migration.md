# Content Migration Implementation Plan (MDX → HTML 변환 + 적재 + 전환 완료)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 MDX 글 전체를 HTML로 변환해 backend-api DB에 적재하고, Supabase 조회수를 이관한 뒤, 프론트 브랜치를 머지해 새 파이프라인 전환을 완료한다. 신규 글 작성용 `blog-html` 스킬도 이 플랜에서 만든다.

**Architecture:** 기존 글 변환은 **결정적 스크립트**(현재와 동일한 remark/rehype/shiki 파이프라인 재사용)로 수행해 렌더링을 1:1 보존한다 — 스펙 §5.2는 "Claude로 변환"이라 했으나, 기존 글은 커스텀 디자인이 목적이 아니라 보존이 목적이므로 스크립트가 더 안전하다 (결정 근거: 성공 기준 2 "기존 글 그대로 렌더"). `blog-html` 스킬은 신규 글의 디자인 변환용. 적재는 backend 컨테이너 안에서 서비스 로직(process_content)을 재사용하는 Python 스크립트로.

**Tech Stack:** Node(unified/remark/rehype/shiki, gray-matter), Python(backend 컨테이너 내), Supabase CSV export.

**Spec:** `docs/superpowers/specs/2026-07-25-content-pipeline-design.md` (§4 HTML 규약, §5 스킬·마이그레이션, §7.2 롤아웃)

## Global Constraints

- **선행 조건**: backend-api `/blog` 배포 완료(플랜 1). 프론트 플랜(플랜 2)은 병행 가능하나 **최종 머지(Task 7)는 본 플랜의 적재 완료 후**
- slug = 기존 `content/` 폴더명 그대로 (URL 완전 보존)
- 기존 이미지(`public/blog-cover/*` 등)는 이동하지 않음 — URL 불변
- 변환 HTML은 스펙 §4 규약 준수: `.post-body` 스코프, h2/h3 id(rehype-slug와 동일 규칙), 코드 하이라이팅은 정적 HTML(github-dark)
- **콘텐츠 동결**: Task 6(프로덕션 적재) 시작부터 Task 7(머지) 완료까지 새 글 작성 금지
- `content/` 원본은 저장소에 보존 (삭제 금지)
- **에디터 이미지 URL 주의**: `/admin` 에디터로 본문에 이미지를 삽입하면(`PostEditor.tsx`) 업로드 URL 앞에 그 시점의 `NEXT_PUBLIC_API_URL`을 그대로 붙여 `content_html`에 절대경로로 굽는다 — 로컬 백엔드(`http://localhost:...`)를 띄운 채로 검증·수정하면 localhost URL이 그대로 저장되므로, 마이그레이션 산출물과 이후 에디터 작업은 프로덕션 절대경로(`https://api.funq.kr/blog/images/...`) 또는 사이트에서 서빙되는 경로만 남도록 해야 한다.

---

## Pre-flight

- [ ] backend-api 프로덕션에 `/blog` 배포 확인: `curl https://api.funq.kr/blog/posts` → `[]` 또는 목록
- [ ] 로컬 backend-api 기동: `cd C:\dev\funq\backend-api && docker compose up -d`
- [ ] blog-nextjs 작업 브랜치: 플랜 2의 `feat/content-pipeline` 브랜치에서 계속 (변환 스크립트/스킬 커밋도 이 브랜치)
- [ ] 글 개수 파악: `ls content | measure` → N개 기록 (적재 후 개수 대조 기준)

---

## File Structure

| Path | Action | Task |
|---|---|---|
| `.claude/skills/blog-html/SKILL.md` | create (신규 글 작성용 스킬) | 1 |
| `scripts/migration/package.json` | create (스크립트 전용 의존성) | 2 |
| `scripts/migration/convert.mjs` | create (MDX→HTML 일괄 변환) | 2 |
| `scripts/migration/out/*.html`, `out/*.json` | generate (변환 산출물, gitignore) | 2 |
| `scripts/migration/load_posts.py` | create (컨테이너 내 적재) | 3 |
| `scripts/migration/load_views.py` | create (조회수 이관) | 5 |
| `.gitignore` | modify (+`scripts/migration/out/`, `+scripts/migration/node_modules/`) | 2 |
| `.claude/skills/blog-frontmatter/` | modify (deprecated 표시) | 7 |

---

### Task 1: `blog-html` 스킬 생성 (신규 글 작성용)

**Files:**
- Create: `.claude/skills/blog-html/SKILL.md`

**Interfaces:**
- Produces: 신규 글 작성 워크플로우 — MD 초안 입력 → §4 규약 HTML 출력. 마이그레이션 변환(Task 2)과는 별개

- [ ] **Step 1: 스킬 작성** — `.claude/skills/blog-html/SKILL.md`:

````markdown
---
name: blog-html
description: MD 초안(또는 주제)을 받아 블로그 본문 HTML로 변환. 글별 커스텀 디자인(인포그래픽, 카드 레이아웃 등)을 HTML/CSS로 표현. /admin 에디터에 붙여넣을 최종 본문을 생성할 때 사용.
---

# blog-html: MD 초안 → 디자인된 본문 HTML

MD 초안을 블로그(blog.funq.kr) 본문 HTML로 변환한다. 출력은 `/admin` 에디터에 붙여넣는 **본문 조각**(전체 페이지 아님)이다.

## 출력 규약 (필수)

1. **구조**: `<style>` 블록 최대 1개(맨 앞) + 본문 마크업. `<script>` 금지. `<html>/<head>/<body>` 금지.
2. **CSS 스코프**: 모든 선택자는 `.post-body` 하위로 한정.
   - 올바름: `.post-body .stat-card { ... }`
   - 금지: `body { ... }`, `h2 { ... }`, `.stat-card { ... }` (스코프 없는 클래스 단독도 금지 아님 — 클래스명은 자유, 선택자에 `.post-body` 접두만 필수)
3. **다크모드**: `html.dark` 기반 — `.dark .post-body .stat-card { ... }`. 라이트/다크 모두 검증된 색으로.
4. **사이트 팔레트**: accent `#7B00D3`, accentDark `#ffdb4d`, dark `#1b1b1b`, light `#fff`. 포인트 컬러는 라이트=accent, 다크=accentDark 사용.
5. **제목**: 문서 구조는 h2/h3만 사용 (h1은 페이지 타이틀이 별도 렌더됨). 각 h2/h3에 kebab-case `id` 부여 (한글 유지 가능: `id="시작하기"`). id는 TOC와 앵커에 쓰인다.
6. **코드 블록**: `<pre class="code-block"><code>` + 인라인 `<span style="color:...">` 토큰으로 하이라이팅을 **정적으로** 완성 (github-dark 팔레트: 배경 `#24292e`, 키워드 `#f97583`, 문자열 `#9ecbff`, 주석 `#6a737d`, 함수 `#b392f0`, 상수 `#79b8ff`). 런타임 하이라이터 없음.
7. **이미지**: 아직 업로드 전인 로컬 이미지는 `<!-- TODO: 업로드 후 교체 --><img src="(로컬경로)" alt="..." />` 형태로 표시 — 에디터에서 업로드 후 교체된다.
8. **반응형**: 고정 px 폭 금지, `max-width:100%`. 가로 스크롤이 필요한 표/코드는 `overflow-x:auto` 컨테이너로 감싼다. 브레이크포인트 참고: 480px/1180px.
9. **기본 타이포는 사이트 prose가 처리** — 일반 문단/목록/인용은 스타일 없이 시맨틱 태그만 쓰면 사이트 스타일이 적용된다. `<style>`은 커스텀 요소(카드, 그리드, 인포그래픽)에만 사용.

## 산출물

- `{slug}.html` 파일 1개 (본문)
- 함께 제안: title, description(1~2문장), tags(3~5개), slug(`{topic}-{YYYYMMDD}-v01`)

## 예시 (커스텀 카드 + 일반 문단 혼합)

```html
<style>
.post-body .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 24px 0; }
.post-body .metric-card { border: 1px solid #7B00D3; border-radius: 12px; padding: 16px; text-align: center; }
.post-body .metric-card strong { display: block; font-size: 1.6em; color: #7B00D3; }
.dark .post-body .metric-card { border-color: #ffdb4d; }
.dark .post-body .metric-card strong { color: #ffdb4d; }
</style>

<h2 id="개요">개요</h2>
<p>일반 문단은 태그만 쓰면 사이트 타이포그래피가 적용된다.</p>

<div class="metric-grid">
  <div class="metric-card"><strong>75%</strong>빌드 시간 단축</div>
  <div class="metric-card"><strong>0건</strong>런타임 의존성</div>
</div>

<h3 id="세부-내용">세부 내용</h3>
<p>...</p>
```
````

- [ ] **Step 2: 스킬 동작 확인** — 새 Claude Code 세션 없이도 파일 존재로 등록됨. 짧은 MD 초안으로 1회 호출해 출력이 규약(스코프/다크모드/id)을 지키는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/blog-html/
git commit -m "feat: add blog-html skill for authoring designed post HTML"
```

---

### Task 2: 변환 스크립트 (MDX → HTML + 메타 JSON)

**Files:**
- Create: `scripts/migration/package.json`, `scripts/migration/convert.mjs`
- Modify: `.gitignore`
- Generate: `scripts/migration/out/{slug}.html` + `{slug}.json` (글 개수만큼)

**Interfaces:**
- Produces: 글마다 `out/{slug}.html`(본문 HTML)과 `out/{slug}.json`:

```json
{
    "slug": "docker-migration-20260124-v01",
    "title": "...",
    "description": "...",
    "author": "fundev",
    "tags": ["docker"],
    "cover_image_url": "/blog-cover/xxx.jpg",
    "is_published": true,
    "published_at": "2026-01-24T10:00:00"
}
```

- [ ] **Step 1: MDX 특이 사용처 사전 점검**

```bash
grep -rln "<Image\|import " content/ --include="*.mdx"
grep -rln "](\./" content/ --include="*.mdx"
```

- JSX(`<Image>`)나 import를 쓰는 글, 상대 경로 이미지를 쓰는 글 목록을 기록. 이 글들은 Step 5에서 변환 결과를 특히 꼼꼼히 검증하고, 스크립트가 처리 못 하면 해당 글만 blog-html 스킬로 수동 변환.

- [ ] **Step 2: 스크립트 의존성** — `scripts/migration/package.json`:

```json
{
    "name": "blog-migration",
    "private": true,
    "type": "module",
    "dependencies": {
        "gray-matter": "^4.0.3",
        "unified": "^11.0.5",
        "remark-parse": "^11.0.0",
        "remark-gfm": "^4.0.0",
        "remark-rehype": "^11.1.1",
        "rehype-raw": "^7.0.0",
        "rehype-slug": "^6.0.0",
        "rehype-pretty-code": "^0.14.0",
        "rehype-stringify": "^10.0.1",
        "shiki": "^1.24.0"
    }
}
```

```bash
cd scripts/migration && npm install
```

`.gitignore`에 추가:

```
scripts/migration/node_modules/
scripts/migration/out/
```

- [ ] **Step 3: 변환 스크립트 작성** — `scripts/migration/convert.mjs`:

```js
// 기존 Contentlayer 파이프라인과 동일한 플러그인 체인으로 MDX 본문을 정적 HTML로 변환.
// 실행: node convert.mjs  (scripts/migration 디렉터리에서)
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";

const CONTENT_DIR = path.resolve("../../content");
const OUT_DIR = path.resolve("./out");

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)               // MDX 내 인라인 HTML 보존
    .use(rehypeSlug)              // 기존과 동일한 heading id 규칙
    .use(rehypePrettyCode, { theme: "github-dark" })
    .use(rehypeStringify);

function toCoverUrl(imagePath) {
    if (!imagePath) return null;
    // "../../public/blog-cover/xxx.jpg" → "/blog-cover/xxx.jpg"
    return imagePath.replace(/^(\.\.\/)+public/, "");
}

function toIso(value) {
    // 따옴표 없는 YAML 타임스탬프는 js-yaml이 UTC Date로 파싱 → toISOString이 원래 벽시계 시각을 보존
    if (value instanceof Date) {
        return value.toISOString().replace(/\.\d{3}Z$/, "");
    }
    // 따옴표 문자열 "2025-12-14 10:00:00" → "2025-12-14T10:00:00"
    // 주의: new Date(문자열).toISOString()은 KST를 UTC로 바꿔 -9시간 시프트됨 — 문자열 치환만 한다
    return String(value).trim().replace(" ", "T");
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const slugs = fs.readdirSync(CONTENT_DIR).filter((d) =>
    fs.existsSync(path.join(CONTENT_DIR, d, "index.mdx"))
);

let failed = [];
for (const slug of slugs) {
    try {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, slug, "index.mdx"), "utf8");
        const { data, content } = matter(raw);
        const html = String(await processor.process(content));

        fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html);
        fs.writeFileSync(
            path.join(OUT_DIR, `${slug}.json`),
            JSON.stringify(
                {
                    slug,
                    title: data.title,
                    description: data.description,
                    author: data.author ?? "fundev",
                    tags: data.tags ?? [],
                    cover_image_url: toCoverUrl(data.image),
                    is_published: data.isPublished !== false,
                    published_at: toIso(data.publishedAt),
                },
                null,
                2
            )
        );
        console.log(`OK  ${slug}`);
    } catch (e) {
        failed.push(slug);
        console.error(`FAIL ${slug}: ${e.message}`);
    }
}

console.log(`\n변환 완료: ${slugs.length - failed.length}/${slugs.length}`);
if (failed.length) {
    console.log(`실패 (blog-html 스킬로 수동 변환 필요): ${failed.join(", ")}`);
    process.exit(1);
}
```

- [ ] **Step 4: 실행**

```bash
cd scripts/migration && node convert.mjs
```

Expected: `변환 완료: N/N` (Pre-flight에서 기록한 글 개수와 일치). 실패 글이 있으면 해당 글만 blog-html 스킬로 수동 변환해 같은 out/ 형식으로 저장.

- [ ] **Step 5: 산출물 스팟 검증**

- `out/` 파일 개수 = 글 개수 × 2
- 코드 블록이 있는 글 1개를 열어 `<pre>` 내부에 shiki 스타일(`style="color:..."` 또는 data 속성)이 박혀 있는지 확인
- Step 1에서 기록한 특이 글들의 HTML을 열어 이미지/컴포넌트가 온전한지 확인
- h2에 `id` 속성 존재 확인

- [ ] **Step 6: 커밋** (산출물은 gitignore — 스크립트만)

```bash
git add scripts/migration/package.json scripts/migration/convert.mjs .gitignore
git commit -m "feat: add MDX to HTML migration converter"
```

---

### Task 3: 적재 스크립트 (backend 컨테이너 내 실행)

**Files:**
- Create: `scripts/migration/load_posts.py`

**Interfaces:**
- Consumes: Task 2의 `out/*.html` + `out/*.json`
- Produces: DB `blog_posts` 레코드 (upsert — 재실행 안전). backend의 `process_content`를 재사용해 toc/reading_time 생성

- [ ] **Step 1: 스크립트 작성** — `scripts/migration/load_posts.py`:

```python
"""변환 산출물을 blog_posts에 적재 (backend-api 컨테이너 안에서 실행).

사용법:
  docker cp scripts/migration/out backend-api-dev:/tmp/blog-migration
  docker exec backend-api-dev python /tmp/blog-migration/load_posts.py /tmp/blog-migration
(load_posts.py도 out/과 함께 복사해 두고 경로 인자로 out 디렉터리를 넘긴다)
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from app.external.database import SessionLocal
from app.models.blog import BlogPost
from app.services.blog.content import process_content


def load(out_dir: Path) -> None:
    db = SessionLocal()
    created, updated = 0, 0
    try:
        for meta_path in sorted(out_dir.glob("*.json")):
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            html = (out_dir / f"{meta['slug']}.html").read_text(encoding="utf-8")
            processed = process_content(html)

            post = db.query(BlogPost).filter(BlogPost.slug == meta["slug"]).first()
            is_new = post is None
            if is_new:
                post = BlogPost(slug=meta["slug"])
                db.add(post)
                created += 1
            else:
                updated += 1

            post.title = meta["title"]
            post.description = meta["description"]
            post.author = meta["author"]
            post.content_html = processed.content_html
            post.cover_image_url = meta["cover_image_url"]
            post.tags = meta["tags"]
            post.toc = processed.toc
            post.reading_time_minutes = processed.reading_time_minutes
            post.is_published = meta["is_published"]
            post.published_at = datetime.fromisoformat(meta["published_at"])
            post.updated_at = datetime.utcnow()
            print(f"{'NEW' if is_new else 'UPD'} {meta['slug']}")

        db.commit()
        total = db.query(BlogPost).count()
        print(f"\n적재 완료: 신규 {created}, 갱신 {updated}, DB 총 {total}건")
    finally:
        db.close()


if __name__ == "__main__":
    load(Path(sys.argv[1]))
```

- [ ] **Step 2: 로컬 적재 실행**

```bash
docker cp scripts/migration/out backend-api-dev:/tmp/blog-migration
docker cp scripts/migration/load_posts.py backend-api-dev:/tmp/blog-migration/
docker exec backend-api-dev python /tmp/blog-migration/load_posts.py /tmp/blog-migration
```

Expected: `적재 완료: 신규 N, ...` — N = 글 개수 (플랜 2에서 만든 시드 글 제외 검증: `curl -s http://localhost:8000/blog/posts?size=1000` 결과 개수 확인 후 시드 글은 삭제).

- [ ] **Step 3: 재실행 안전성 확인** — 같은 명령 재실행 → `신규 0, 갱신 N`.

- [ ] **Step 4: 커밋**

```bash
git add scripts/migration/load_posts.py
git commit -m "feat: add post loader script for migration"
```

---

### Task 4: 로컬 전수 검증 (구 렌더 vs 신 렌더)

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 프론트 dev 기동** — 플랜 2 브랜치에서 `npm run dev` (`NEXT_PUBLIC_API_URL=http://localhost:8000`)

- [ ] **Step 2: 전수 육안 비교** — 글마다 `http://localhost:23001/blogs/{slug}` 확인:

| 확인 항목 | 기준 |
|---|---|
| 본문 렌더 | 문단/제목/목록/표 깨짐 없음 |
| 코드 블록 | github-dark 하이라이팅, 줄바꿈 보존 |
| 이미지 | 본문 이미지 + 커버 이미지 표시 (public/ 경로) |
| TOC | 사이드바 항목 = 본문 h2/h3, 앵커 이동 동작 |
| 다크모드 | 토글 시 본문 가독성 유지 |
| 메타 | 제목/설명/태그/날짜가 frontmatter와 일치 |

비교 기준이 필요하면 main 브랜치 워크트리(`git worktree add ../blog-old main`)를 다른 포트로 띄워 대조.

- [ ] **Step 3: 발견된 변환 결함 수정** — convert.mjs 수정 → 재변환 → 재적재(Task 3 Step 2 재실행, upsert라 안전) → 재확인. 스크립트로 해결 안 되는 글만 blog-html 스킬로 수동 보정.

- [ ] **Step 4: 홈/카테고리/검색/RSS/sitemap 확인** — 글 전체가 목록에 나오고 태그 필터·검색 결과·feed.xml 아이템 수가 맞는지.

---

### Task 5: 조회수 이관 스크립트

**Files:**
- Create: `scripts/migration/load_views.py`

**Interfaces:**
- Consumes: Supabase `views` 테이블 CSV (`slug,count` 컬럼)
- Produces: `blog_posts.view_count` 갱신

- [ ] **Step 1: Supabase에서 CSV export** — Supabase Dashboard → Table Editor → `views` → Export as CSV → `scripts/migration/views.csv` 저장 (gitignore 대상 — `.gitignore`에 `scripts/migration/views.csv` 추가).

- [ ] **Step 2: 스크립트 작성** — `scripts/migration/load_views.py`:

```python
"""Supabase views CSV를 blog_posts.view_count로 이관 (컨테이너 안에서 실행).

사용법:
  docker cp scripts/migration/views.csv backend-api-dev:/tmp/blog-migration/
  docker cp scripts/migration/load_views.py backend-api-dev:/tmp/blog-migration/
  docker exec backend-api-dev python /tmp/blog-migration/load_views.py /tmp/blog-migration/views.csv
"""

import csv
import sys
from pathlib import Path

from app.external.database import SessionLocal
from app.models.blog import BlogPost


def load(csv_path: Path) -> None:
    db = SessionLocal()
    matched, missing = 0, []
    try:
        with csv_path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                slug, count = row["slug"], int(row["count"])
                post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
                if post is None:
                    missing.append(slug)
                    continue
                post.view_count = count
                matched += 1
        db.commit()
        print(f"이관 완료: {matched}건")
        if missing:
            print(f"매칭 실패 slug (확인 필요): {missing}")
    finally:
        db.close()


if __name__ == "__main__":
    load(Path(sys.argv[1]))
```

- [ ] **Step 3: 로컬 리허설** — CSV를 로컬 컨테이너로 복사해 실행, `매칭 실패`가 있으면 원인 확인 (Supabase에만 있는 옛 slug는 무시 가능, 현존 글이 실패하면 STOP).

- [ ] **Step 4: 검증** — `curl -s http://localhost:8000/blog/posts?size=1000` 에서 view_count가 Supabase 수치와 일치하는 글 3개 표본 대조.

- [ ] **Step 5: 커밋**

```bash
git add scripts/migration/load_views.py .gitignore
git commit -m "feat: add Supabase views migration script"
```

---

### Task 6: 프로덕션 적재 (콘텐츠 동결 시작)

**Files:** 없음 (운영 작업)

**전제**: backend-api `/blog` 프로덕션 배포 완료, 서버 `.env.prod`에 `BLOG_ADMIN_UIDS` 설정 완료.

- [ ] **Step 1: 콘텐츠 동결 선언** — 이후 Task 7 머지까지 새 글/수정 금지.

- [ ] **Step 2: 산출물 서버 업로드 + 적재**

```bash
# 로컬에서 (out/ 최신 상태 확인 후)
scp -r scripts/migration/out scripts/migration/load_posts.py scripts/migration/load_views.py scripts/migration/views.csv <server>:/tmp/blog-migration/

# 서버에서
ssh <server>
docker cp /tmp/blog-migration <backend-api-container>:/tmp/blog-migration
docker exec <backend-api-container> python /tmp/blog-migration/load_posts.py /tmp/blog-migration/out
docker exec <backend-api-container> python /tmp/blog-migration/load_views.py /tmp/blog-migration/views.csv
```

(컨테이너 이름은 서버의 `docker ps`로 확인 — docker-compose.prod.yml 기준)

- [ ] **Step 3: 프로덕션 API 검증**

```bash
curl -s https://api.funq.kr/blog/posts?size=1000 | python -c "import json,sys; d=json.load(sys.stdin); print(len(d))"
curl -s https://api.funq.kr/blog/posts/<현존-slug-1개>
```

Expected: 글 개수 일치, 상세 응답에 content_html/toc 포함, view_count가 기존 수치.

---

### Task 7: 최종 전환 (프론트 머지 + 배포 + 정리)

**Files:**
- Modify: `.claude/skills/blog-frontmatter/SKILL.md` (deprecated 표시)

- [ ] **Step 1: 프론트 브랜치 최종 검증** — `feat/content-pipeline`에서 프로덕션 API로 빌드 리허설:

```bash
# .env.local을 프로덕션 값으로 임시 전환 (NEXT_PUBLIC_API_URL=https://api.funq.kr)
npm run build
```

- 빌드 통과 + 정적 페이지 수 = 글 개수 + 고정 페이지
- `npm run start`로 표본 글 3개 + 홈 + 검색 확인 후 `.env.local` 원복

- [ ] **Step 2: PR + 머지** — 플랜 2 Task 11까지의 모든 커밋 + 본 플랜 커밋 포함:

```bash
git push -u origin feat/content-pipeline
gh pr create --title "feat: API-driven content pipeline (HTML posts + admin editor)" --base main \
  --body "스펙: docs/superpowers/specs/2026-07-25-content-pipeline-design.md — 검증 체크리스트는 플랜 2 §Task 11, 플랜 3 §Task 4 참조"
```

**머지 전 확인**: GitHub Actions 빌드가 `NEXT_PUBLIC_*` 새 변수(API_URL, FIREBASE_*, REVALIDATE)를 받도록 secrets/build-args 설정 완료 (플랜 2 Task 11). 머지 → 자동 배포.

- [ ] **Step 3: 배포 후 스모크 (프로덕션)**

- https://blog.funq.kr 홈 + 글 3개 + /categories/all + /feed.xml + sitemap.xml + Cmd+K 검색
- 글 페이지: TOC/다크모드/Giscus/조회수(기존 수치에서 증가)
- /admin 로그인 → 표본 글 열기 → 사소한 수정 → 저장 → 공개 페이지 즉시 반영 → 원복
- 콘텐츠 동결 해제

- [ ] **Step 4: 스킬 정비**

- `.claude/skills/blog-frontmatter/SKILL.md` 상단에 추가: `> ⚠️ DEPRECATED: MDX 파이프라인 전용. 신규 글은 blog-html 스킬 + /admin 에디터 사용.`
- `blog-img`(프롬프트 생성)는 그대로 유지. `blog-img-apply`는 후속 정비 (커버 이미지를 `public/blog-cover/`에 넣고 URL을 출력하도록 — 별도 작은 커밋, 급하지 않음)

```bash
git checkout main && git pull
git add .claude/skills/
git commit -m "docs: deprecate blog-frontmatter skill for HTML pipeline"
git push
```

- [ ] **Step 5: Supabase 정리 (배포 안정 1주 후 권장)**

- 서버/CI의 `NEXT_PUBLIC_SUPABASE_*` 환경변수 제거
- Supabase 프로젝트 pause 또는 삭제 (views 테이블 CSV 백업은 이미 확보됨 — `views.csv` 보관)

---

## Stopping Conditions

1. 변환 실패 글이 전체의 30% 초과 → STOP (파이프라인 설계 재검토 — MDX 사용 패턴이 가정과 다름)
2. 적재 후 글 개수 불일치 → STOP (누락 조사)
3. 현존 글의 조회수 매칭 실패 → STOP (slug 불일치 조사)
4. 프로덕션 스모크에서 표본 글 렌더 깨짐 → 즉시 `git revert` + 재배포 (구 파이프라인 복귀), 원인 조사
