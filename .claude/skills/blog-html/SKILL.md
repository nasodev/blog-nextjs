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
   - 금지: `body { ... }`, `h2 { ... }`, `.stat-card { ... }` (클래스명 자체는 자유 — 단, 어떤 선택자든 .post-body 접두 없이 단독 사용은 금지)
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
