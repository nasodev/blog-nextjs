# Giscus 댓글 시스템 설정 가이드

> GitHub Discussions 기반의 무료 댓글 시스템

## 📋 개요

이 블로그는 **Giscus**를 사용하여 댓글 시스템을 구현했습니다.

- **비용**: 100% 무료
- **저장소**: `nasodev/blog-nextjs-comments` (Public)
- **프라이버시**: 블로그 코드는 Private 유지, 댓글만 Public
- **인증**: GitHub 계정 필요

---

## 🏗️ 아키텍처

```
블로그 저장소 (Private)
└── nasodev/blog-nextjs
    ├── 소스코드 (비공개)
    └── Giscus 컴포넌트
        ↓
        연결
        ↓
댓글 저장소 (Public)
└── nasodev/blog-nextjs-comments
    └── GitHub Discussions (댓글 저장)
```

---

## 🚀 초기 설정 (완료됨)

### 1. GitHub 저장소 생성
- ✅ `nasodev/blog-nextjs-comments` Public 저장소 생성
- ✅ Discussions 활성화
- ✅ Giscus 앱 설치

### 2. 패키지 설치
```bash
npm install @giscus/react
```

### 3. 컴포넌트 생성
파일: `components/Comments/index.tsx`

```typescript
"use client";

import Giscus from "@giscus/react";
import useThemeSwitch from "@/components/Hook/useThemeSwitch";

interface CommentsProps {
    slug: string;
}

export default function Comments({ slug }: CommentsProps) {
    const { theme, mounted } = useThemeSwitch();

    if (!mounted) {
        return null;
    }

    const giscusTheme = theme === "dark" ? "dark" : "light";

    return (
        <div className="mt-16 mb-8">
            <div className="border-t border-gray/30 pt-8">
                <h2 className="text-2xl font-bold mb-8 text-dark dark:text-light">
                    댓글
                </h2>
                <Giscus
                    id="comments"
                    repo="nasodev/blog-nextjs-comments"
                    repoId="R_kgDOQWjVAA"
                    category="Announcements"
                    categoryId="DIC_kwDOQWjVAM4Cx1qT"
                    mapping="pathname"
                    strict="0"
                    reactionsEnabled="1"
                    emitMetadata="0"
                    inputPosition="bottom"
                    theme={giscusTheme}
                    lang="ko"
                    loading="lazy"
                />
            </div>
        </div>
    );
}
```

### 4. 블로그 포스트 페이지에 통합
파일: `app/blogs/[slug]/page.tsx`

```typescript
import Comments from "@/components/Comments";

export default function BlogPage({ params }: { params: { slug: string } }) {
    // ... 기존 코드 ...

    return (
        <section>
            <article>
                {/* ... 기존 콘텐츠 ... */}

                <div className="px-5 md:px-10">
                    <Comments slug={params.slug} />
                </div>
            </article>
        </section>
    );
}
```

---

## 🔧 설정 옵션 설명

### Giscus Props

| 속성 | 값 | 설명 |
|-----|-----|-----|
| `repo` | `nasodev/blog-nextjs-comments` | 댓글을 저장할 GitHub 저장소 |
| `repoId` | `R_kgDOQWjVAA` | GitHub 저장소 고유 ID |
| `category` | `Announcements` | Discussion 카테고리 |
| `categoryId` | `DIC_kwDOQWjVAM4Cx1qT` | 카테고리 고유 ID |
| `mapping` | `pathname` | URL 경로를 Discussion과 매핑 |
| `strict` | `0` | 엄격한 매칭 비활성화 |
| `reactionsEnabled` | `1` | 반응(👍, ❤️ 등) 활성화 |
| `emitMetadata` | `0` | 메타데이터 이벤트 비활성화 |
| `inputPosition` | `bottom` | 댓글 입력창 위치 (하단) |
| `theme` | `dark` / `light` | 테마 (자동 동기화) |
| `lang` | `ko` | UI 언어 (한국어) |
| `loading` | `lazy` | 지연 로딩 (성능 최적화) |

---

## 🎨 테마 동기화

블로그의 다크/라이트 모드가 자동으로 댓글 시스템에 반영됩니다.

```typescript
const { theme, mounted } = useThemeSwitch();
const giscusTheme = theme === "dark" ? "dark" : "light";
```

---

## 📱 사용 방법

### 독자 입장

1. 블로그 포스트 하단으로 스크롤
2. GitHub 계정으로 로그인
3. 댓글 작성 (Markdown 지원)
4. 반응 추가 가능 (👍, ❤️, 😄, 🎉, 😕, 🚀, 👀)
5. 답글 및 스레드 지원

### 관리자 입장

- **댓글 관리**: https://github.com/nasodev/blog-nextjs-comments/discussions
- **카테고리**: Announcements
- **각 포스트**: URL 경로별로 자동 생성된 Discussion
- **알림**: GitHub 알림으로 새 댓글 수신
- **모더레이션**: GitHub Discussion 기능 활용

---

## 🔄 설정 변경 방법

### 저장소 변경

1. 새 Public 저장소 생성
2. Discussions 활성화
3. Giscus 앱 설치
4. https://giscus.app/ko 에서 새 설정값 가져오기
5. `components/Comments/index.tsx`의 `repo`, `repoId`, `categoryId` 업데이트

### 카테고리 변경

1. GitHub Discussions에서 새 카테고리 생성
2. https://giscus.app/ko 에서 새 `categoryId` 가져오기
3. `components/Comments/index.tsx` 업데이트

### 매핑 방식 변경

현재: `pathname` (URL 경로로 매핑)

다른 옵션:
- `url`: 전체 URL
- `title`: 포스트 제목
- `og:title`: Open Graph 제목
- `specific`: `term` 프로퍼티로 수동 지정

---

## 🐛 문제 해결

### 댓글이 표시되지 않음

1. **저장소 확인**
   - `nasodev/blog-nextjs-comments`가 Public인지 확인
   - Discussions가 활성화되어 있는지 확인

2. **Giscus 앱 설치 확인**
   - https://github.com/apps/giscus 에서 설치 확인
   - 저장소 권한 확인

3. **설정값 확인**
   - `repoId`와 `categoryId`가 정확한지 확인
   - https://giscus.app/ko 에서 재확인

### 테마가 동기화되지 않음

- 브라우저 캐시 삭제
- 페이지 새로고침
- `useThemeSwitch` hook이 제대로 작동하는지 확인

### 댓글 로딩이 느림

- `loading="lazy"` 설정이 적용되어 있어 스크롤 시 로드됨
- 네트워크 속도 확인
- GitHub API 상태 확인: https://www.githubstatus.com/

---

## 📊 모니터링

### 댓글 활동 확인

1. **GitHub Discussions**
   - https://github.com/nasodev/blog-nextjs-comments/discussions
   - 모든 댓글을 Discussion으로 확인

2. **알림 설정**
   - Watch 저장소 설정
   - 새 댓글 시 GitHub 알림 수신

3. **통계**
   - Discussion insights
   - 참여자 수, 댓글 수 확인

---

## 🚀 향후 개선 아이디어

- [ ] 댓글 개수 표시 (포스트 카드에)
- [ ] 인기 댓글 하이라이트
- [ ] 댓글 검색 기능
- [ ] 이메일 알림 통합
- [ ] 댓글 분석 대시보드

---

## 🔗 참고 자료

- **Giscus 공식 문서**: https://giscus.app/ko
- **GitHub Discussions**: https://docs.github.com/en/discussions
- **설정 페이지**: https://giscus.app/ko
- **댓글 저장소**: https://github.com/nasodev/blog-nextjs-comments

---

**마지막 업데이트**: 2025-11-16
**담당자**: Claude Code AI
