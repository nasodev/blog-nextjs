# React Best Practices Optimization

Next.js 14 블로그 프로젝트에 Vercel React Best Practices 가이드라인을 적용하여 번들 사이즈, 서버 직렬화, 리렌더 성능을 개선한다.

## Background

React best practices 검토에서 10개 개선 항목을 식별했다. CRITICAL 3건, HIGH 2건, MEDIUM 4건, LOW 1건. 프로젝트 규모가 크지 않으므로 한 번에 진행한다.

## Section 1: Bundle Size Optimization

### 1-1. icons.tsx 미사용 아이콘 제거

**파일**: `components/icons.tsx` (471줄)

미사용 export 3개를 삭제한다:
- `TwitterIcon` — 어디에서도 import하지 않음
- `DribbbleIcon` — 어디에서도 import하지 않음
- `SunIcon3` — 어디에서도 import하지 않음

barrel import 구조는 유지한다. 아이콘이 11개 → 8개 수준이라 개별 파일 분리 대비 이점이 적다.

### 1-2. Dynamic Import 적용

세 곳에 정적 import를 동적 import로 전환한다.

**Search/index.tsx — Fuse.js 지연 로드**
- `import Fuse from "fuse.js"` 제거, 모듈 스코프의 Fuse 인스턴스 제거
- Fuse 인스턴스를 `useRef`에 저장
- 모달 open 시 `const Fuse = (await import("fuse.js")).default`로 지연 로드 후 인스턴스 생성하여 ref에 저장
- `handleSearch`에서 `fuseRef.current?.search()` 사용

**Comments/index.tsx — Giscus 동적 로드**
- `import Giscus from "@giscus/react"` 제거
- `next/dynamic`으로 `dynamic(() => import("@giscus/react").then(m => m.default))`
- loading fallback 추가

**Contact/LottieAnimation.tsx — DotLottie 동적 로드**
- `next/dynamic`으로 `dynamic(() => import(...), { ssr: false })`
- loading fallback 추가

### 1-3. Footer 서버 컴포넌트 전환

**파일**: `components/Footer/index.tsx`

이전 버그 수정에서 `react-hook-form`과 이메일 구독 폼을 제거하여 hooks가 없는 상태다. `"use client"` 지시어를 제거하여 서버 컴포넌트로 전환한다.

## Section 2: Server-Side Serialization Optimization

### 경량 타입 도입

**새 파일**: `utils/blogData.ts`

```typescript
export type BlogSummary = {
  title: string;
  description: string;
  image: { filePath: string; blurhashDataUrl: string; width: number; height: number };
  tags: string[];
  url: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;  // blog.readingTime.text 값을 추출하여 저장
  _id: string;
};

export function toBlogSummary(blog: Blog): BlogSummary {
  // body.code, toc 등 제외하고 필요한 필드만 반환
  // readingTime: blog.readingTime.text 로 문자열 추출
  // isPublished 필드는 포함하지 않음 — 필터링은 app/page.tsx에서 toBlogSummary 호출 전에 수행
}
```

**주의**: `isPublished` 필터링은 `app/page.tsx`에서 `toBlogSummary()` 호출 전에 수행한다. `AllPostsSection`의 `.filter(blog => blog.isPublished)` 로직은 제거한다.

### 적용 범위

| 파일 | 변경 |
|------|------|
| `app/page.tsx` | `allBlogs.map(toBlogSummary)` 후 컴포넌트에 전달 |
| `types/Home.ts` | `BlogsProp`의 blogs 타입을 `BlogSummary[]`로 변경 |
| `components/Home/HomeCoverSection.tsx` | `BlogSummary` 타입 사용 |
| `components/Home/FeaturePosts.tsx` | `BlogSummary` 타입 사용 |
| `components/Home/AllPostsSection.tsx` | `BlogSummary` 타입 사용, `isPublished` 필터 제거 (상위에서 처리), 로컬 `AllPostsSectionProps` 인터페이스도 업데이트 |
| `components/Blog/BlogLayoutOne.tsx` | `BlogSummary` 타입 사용 |
| `components/Blog/BlogLayoutTwo.tsx` | `BlogSummary` 타입 사용 |
| `components/Blog/BlogLayoutThree.tsx` | `BlogSummary` 타입 사용 |
| `components/Blog/BlogGridInfinite.tsx` | `BlogSummary` 타입 사용 |
| `components/Blog/BlogDetails.tsx` | `blog: any` → `BlogSummary` |
| `components/Search/index.tsx` | 검색에 필요한 필드(title, description, tags, url)만 사용 |
| `utils/index.ts` | `sortBlogs` 함수가 `BlogSummary[]`도 수용하도록 |

## Section 3: Re-render Optimization + Code Quality

### 3-1. ViewCounter useEffect 통합

**파일**: `components/Blog/ViewCounter.tsx`

두 개의 `useEffect`를 하나로 통합한다:
1. `noCount`가 아닌 경우 increment 호출
2. increment 완료 후 (또는 noCount인 경우 바로) getViewCount로 최신 count 가져오기
3. 하나의 `useEffect`에서 순차 실행

### 3-2. Header inline style 외부 상수화

**파일**: `components/Header/index.tsx`

햄버거 메뉴 버튼의 `style={{transform: ...}}` 객체 3개를 컴포넌트 외부 상수로 추출한다.

```typescript
const HAMBURGER_TOP_OPEN = { transform: "rotate(-45deg) translateY(0)" };
const HAMBURGER_TOP_CLOSED = { transform: "rotate(0deg) translateY(6px)" };
// etc.
```

### 3-3. BlogDetails console.log 제거

**파일**: `components/Blog/BlogDetails.tsx`

디버그용 `console.log(blog)` 제거. `BlogDetails`는 `readingTime`을 직접 문자열로 받으므로 `.text` 접근을 제거한다.

### 3-4. BlogDetails 타입 수정

**파일**: `components/Blog/BlogDetails.tsx`

`blog: any` → `BlogSummary` 타입 적용. Section 2에서 도입하는 타입을 재활용한다.

## Scope Exclusions

- `React.memo()` on BlogLayout components — 22개 블로그 규모에서 체감 효과 미미 (YAGNI)
- Suspense boundaries — 데이터가 빌드타임 정적 생성이므로 streaming 이점 없음
- `React.cache()` — 동일 이유로 불필요
- passive event listener — 변경 빈도 낮은 MediaQueryList에 적용 불필요

## Verification

- `npm run lint` 통과
- `npm run build` 성공
- 로컬 서버 실행 후 주요 페이지 수동 확인 (홈, 블로그 상세, 카테고리, 연락처, 검색)
