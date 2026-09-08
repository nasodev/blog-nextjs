# 블로그 개선 작업 핸드오프

작성일: 2026-09-08 (Asia/Seoul)  
구현·검증 완료일: 2026-09-07  
원본 저장소: `/Users/hklee03/dev/funq/blog-nextjs`

## 현재 상태와 다음 시작점

요청한 보안, UI·UX, 기능 추가, 일반 개선, SEO의 분석 문서와 코드 수정을 각각 독립 워크트리에 작성하고 커밋했다. 다섯 영역을 합친 통합 워크트리에서 회귀 테스트와 프로덕션 빌드까지 완료했다. 원격 push, main 병합, 운영 배포는 수행하지 않았다.

**후속 작업은 `/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration`에서 시작한다.** 이 브랜치에는 다섯 영역의 변경이 이미 모두 들어 있으므로 영역별 커밋을 다시 적용할 필요가 없다. main에 반영하기 전에는 아래의 원본 변경 보존 항목을 먼저 확인해야 한다.

2026-09-08 문서 작성 시 재확인한 결과, 개선 워크트리 6개는 모두 미커밋 변경 없이 깨끗하다. 원본 main에는 기존 한·영문 라우팅 작업과 별도로 진행된 번역 파일 등의 미커밋 변경이 남아 있다. 이번 핸드오프 요청에서는 이 문서만 새로 작성하며 원본 소스나 인덱스를 변경하지 않는다.

## 워크트리와 커밋

아래의 워크트리 경로는 모두 `/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/` 기준이다. 커밋은 각 브랜치의 최종 HEAD이며, 해당 영역의 모든 변경을 담은 단일 커밋이라는 뜻은 아니다.

| 영역 | 워크트리 | 브랜치 | 최종 HEAD |
|---|---|---|---|
| 보안 | `security` | `codex/blog-security-20260907` | `9387b3c75600ad487db6806070b05a17c3d6fbce` |
| UI·UX | `ui-ux` | `codex/blog-ui-ux-20260907` | `82e89d539e315f36637d1693e9ea1c86545a8e0d` |
| 기능 | `features` | `codex/blog-features-20260907` | `87b435529152aa6ff29c95bea99c87126fa44213` |
| 일반 개선 | `maintenance` | `codex/blog-maintenance-20260907` | `c797b30da917fd1f43142352193d9f602184ddf1` |
| SEO | `seo` | `codex/blog-seo-20260907` | `7e0d5ac4f94d69602723474c28d659dce3e9ea30` |
| 전체 통합 | `integration` | `codex/blog-integrated-20260907` | `46af8f93215d718be1f3322cba036c860b4119df` |

원본 main HEAD는 `974ee5067910285530830924a0ae0c95b5e87a05`다. 개선 작업의 공통 기준은 원본의 당시 미커밋 변경까지 포함한 아래 스냅샷이다.

- 기준 시각: **2026-09-07 18:23:54 KST**.
- 기준 브랜치: `codex/blog-audit-baseline-20260907`.
- 기준 커밋: `52c54e3fc37ea9e5146888e3a9eeb5e91ed6f564`.
- 별도 임시 Git 인덱스로 스냅샷을 만들었다. 원본 인덱스에 stage, stash, reset을 수행하지 않았다.

## 상세 산출물

각 영역의 원본 보고서는 해당 워크트리의 `docs/improvements/`에 있다. 전체를 한곳에서 읽을 수 있도록 통합 워크트리에도 모두 포함했다.

- [전체 완료 보고서](/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration/docs/improvements/REPORT.md)
- [보안 분석·개선 보고서](/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration/docs/improvements/security.md)
- [UI·UX 분석·개선 보고서](/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration/docs/improvements/ui-ux.md)
- [기능 분석·개선 보고서](/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration/docs/improvements/features.md)
- [일반 개선 보고서](/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration/docs/improvements/maintenance.md)
- [SEO 분석·개선 보고서](/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration/docs/improvements/seo.md)
- [구조화된 검증 결과](/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration/docs/improvements/validation.json)

## 구현 내용과 주의할 동작

### 보안

- 브라우저에 노출되는 `NEXT_PUBLIC_REVALIDATE_SECRET` 의존을 제거했다. 관리자 재검증 요청은 Firebase Bearer ID 토큰을 사용한다.
- 서버는 backend의 `/blog/admin/posts`를 호출해 기존 관리자 권한 검증을 재사용한다. 별도 서버 간 webhook은 서버 전용 `REVALIDATE_SECRET`과 `x-revalidate-secret`을 사용할 수 있다.
- 재검증 API의 JSON·slug 입력을 검증하고 외부 요청에 제한 시간을 적용했다.
- 관리자 HTML 미리보기를 `sandbox=""`인 `srcDoc` iframe으로 격리했다. 스크립트 실행과 부모 문서 접근을 막고, 이전 미리보기 경로와 메시지 연결을 제거했다.
- 보안 헤더를 보강하고 `X-Powered-By`를 제거했다. CSP는 일부 방어 지시문이며 전체 스크립트 nonce 정책을 구현한 것은 아니다.
- Next.js와 eslint-config-next를 16.3.4로 갱신하고 의존성을 정리했다. `.env` 계열은 Git에서 제외하며 `.env.example`은 유지한다.
- 핵심 위치: `lib/revalidation.ts`, `lib/api/admin.ts`, `app/api/revalidate/route.ts`, `components/Admin/EditorPreview.tsx`, Next 설정 및 배포·환경 설정 파일.

공개 게시글은 기존처럼 신뢰된 관리자 HTML을 렌더링한다. 미리보기 격리가 backend의 HTML 정화까지 대신하지는 않는다. 운영에서 이미 노출된 비밀값의 폐기·교체는 수행하지 않았다.

### UI·UX

- 검색을 네이티브 `<dialog>`로 구성하고 포커스 이동·복귀, 키보드 선택, 한글 IME 입력, Escape 닫기를 수정했다.
- 검색 로딩·오류·재시도·빈 결과 상태를 구분하고, 검색 인덱스를 불러오는 동안 입력한 검색어도 결과에 반영한다.
- 모바일 메뉴의 닫기와 포커스 복귀, 터치 영역, 다크 모드 표시를 개선했다.
- 본문 바로가기, 포커스 표시, 동작 줄이기 설정, 긴 본문·표의 가로 넘침 처리를 추가했다.
- 모바일 문의 화면에서 폼을 먼저 보여주고 장식을 숨겼다. 테마 아이콘이 전달받은 스타일을 적용하지 않던 문제도 수정했다.
- 핵심 위치: `components/Search/index.tsx`, `components/Header/`, `components/SiteLayout.tsx`, 문의 화면과 전역 스타일.

### 기능 추가

- 작동하지 않던 문의 제출을 입력 검증 후 이메일 앱에서 초안을 여는 `mailto:` 동작으로 구현했다. 제목·본문의 공백과 특수문자를 올바르게 인코딩한다.
- 메일은 사용자가 이메일 앱에서 직접 보낸다. 사이트 내 발송 API나 문의 저장 기능은 추가하지 않았다. 대체 연락처 `funqdev@gmail.com`을 항상 표시한다.
- 게시글 링크 복사, 복사 결과 안내, 복사 실패 시 직접 선택할 수 있는 URL을 추가했다.
- Footer에 한국어·영어 RSS 링크를 추가하고 저작권 연도를 현재 연도로 표시한다.
- 핵심 위치: `lib/contact.ts`, 문의 폼, `SharePost`, Footer.

### 일반 개선

- 실제로 추가 로딩하지 않던 무한 스크롤 코드와 불필요한 클라이언트 경계를 제거했다. 글 목록은 서버에서 렌더링해 링크를 HTML에 포함한다.
- 조회수 요청을 글별로 공유해 Strict Mode의 중복 호출을 막고, 언마운트 후 응답을 무시한다. 통신 실패 시 기존 표시값을 유지한다.
- 테마 상태를 DOM·OS·다른 탭과 동기화하고, 저장소 접근이 거부되어도 동작하도록 했다. 초기 실행과 hydration 사이의 변경도 반영한다.
- 외부 예제 사이트만 검사하던 테스트를 실제 블로그 회귀 테스트로 교체했다. localhost mock API와 테스트용 Firebase 설정을 사용한다.
- lint, 타입 검사, 단위·브라우저 테스트 명령과 CI 검사를 추가했다. CI는 Docker와 같은 Node 22를 사용한다.
- E2E worker를 1개로 제한해 공유 Next 개발 서버의 manifest 쓰기 경합을 피했다.
- 핵심 위치: `BlogGrid`, `AllPostsSection`, `ViewCounter`, `useThemeSwitch`, `tests/`, `playwright.config.ts`, `package.json`, CI 설정.

### SEO

- RSS XML의 예약문자와 속성값을 이스케이프하고 최신 20개 게시글만 상세 조회한다. `lastBuildDate`는 실제 갱신일을 사용한다.
- 길이 0인 enclosure 대신 Media RSS 이미지 정보를 사용하고, URL 쿼리와 관계없이 이미지 유형을 판별한다.
- 카테고리·소개·문의 페이지의 공유 메타데이터, 카테고리 언어 링크와 `x-default`, manifest와 robots 설정을 개선했다.
- 기존 canonical, 게시된 번역 간 hreflang, 구조화 데이터, sitemap, 없는 글의 404, 관리자 noindex 동작을 유지·검증했다.
- 핵심 위치: `lib/feed.ts`, 한·영 RSS 경로, 페이지 메타데이터, manifest·robots 설정.

## 검증 결과와 한계

아래는 **2026-09-07 구현 시 수행한 결과**다. 핸드오프 문서를 작성하면서 애플리케이션 테스트나 취약점 조회를 다시 실행하지는 않았다.

| 검사 | 결과 |
|---|---|
| 5개 개별 워크트리 ESLint·Next route typegen·TypeScript | 모두 통과 |
| 최종 통합 ESLint | 통과 |
| 단위 회귀 테스트 | 4/4 통과 |
| 브라우저 회귀 테스트 | 11/11 통과 |
| 이후 모바일 문의 수정 관련 재검사 | 4/4 통과 |
| 이후 테마 아이콘 수정 관련 재검사 | 2/2 통과 |
| Next.js 16.3.4 Turbopack 프로덕션 빌드·TypeScript | 통과, 35개 페이지 생성 |
| standalone 실행 확인 | 정상 URL 11개 200, 없는 글 404, JS 정적 파일·보안 헤더·관리자 noindex 확인 |
| npm audit | 최초 high 7/low 1에서 알려진 취약점 0개로 감소 |
| Git diff 공백 검사 | 통과 |

브라우저 테스트는 Chromium과 localhost mock API를 사용했다. 실제 Firebase 로그인과 운영 관리자 권한 정책, 실제 이메일 발송은 검증하지 않았다. 운영 홈페이지는 읽기 요청으로 HTTP 200만 확인했다. Search Console, 검색 순위, 실사용자 Core Web Vitals와 접근성 적합성 인증은 측정·평가하지 않았다.

**남아 있는 `.next` 빌드 산출물은 테스트 API와 테스트용 Firebase 설정으로 생성했다. 운영 환경 설정으로 다시 빌드해야 한다.** 별도로 띄웠던 mock API와 standalone 서버는 구현 작업 종료 시 중지했다.

## 검증 재현

전체 검증은 독립된 의존성 설치를 가진 통합 워크트리에서 수행하는 것이 좋다. CI·Docker와 맞추려면 Node 22를 사용한다.

```sh
cd /Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration
git status --short --branch
npm ci
npm run lint
npm run typecheck
npm run test:unit
npx playwright install chromium
npm run test:e2e
```

E2E 명령은 Playwright 설정을 통해 mock API `127.0.0.1:28001`과 Next 개발 서버 `127.0.0.1:23002`를 실행한다. 실제 계정 정보가 필요하지 않다. 같은 포트에 다른 프로세스가 있으면 먼저 소유자를 확인한다.

일반 개발·운영 빌드는 통합 워크트리의 `.env.example`과 README를 따라 해당 환경의 API·Firebase 값을 설정한 후 `npm run build`를 실행한다. 비밀값 자체를 문서나 커밋에 넣지 않는다.

## 원본 변경 보존과 통합 시 유의점

원본 `/Users/hklee03/dev/funq/blog-nextjs`에는 스냅샷 이전의 한·영문 라우팅 재구성과 이후의 번역 JSON·검증 스크립트 등이 함께 미커밋 상태로 남아 있다. `(ko)`·`(en)` 경로로 옮긴 파일들이 기존 경로의 삭제로 표시되는 것은 이 별도 작업의 일부다.

스냅샷 이후에도 여러 `content/*/en.json`, `content/english-drafts-report.md`, `scripts/validate-translations.py` 등이 추가·수정된 것을 확인했다. 문서 작성 시 원본에 `HANDOFF-english-blog-drafts-20260908.md`도 존재한다. 이들은 이번 개선 작업의 산출물로 간주하거나 덮어쓰지 않는다.

통합 브랜치는 기준 스냅샷을 포함하지만 **그 이후 번역 작업을 자동으로 포함하지 않는다.** 원본을 통합 워크트리 내용으로 통째로 교체하거나 미커밋 변경을 지우는 방식으로 반영하면 안 된다. 기존 변경과 추적되지 않은 파일을 먼저 보존한 다음, 스냅샷 대비 개선 변경과 이후 번역 변경을 함께 검토해 반영한다.

검토에 사용할 읽기 전용 명령:

```sh
cd /Users/hklee03/dev/funq/blog-nextjs
git status --short --branch
git worktree list
git diff --stat 52c54e3fc37ea9e5146888e3a9eeb5e91ed6f564 codex/blog-integrated-20260907
```

마지막 diff는 개선 작업의 범위를 보여준다. 원본의 미커밋·미추적 파일 전체가 이 diff에 나타나는 것은 아니므로 앞의 `git status`도 함께 확인한다.

## 다음 담당자가 할 일

1. 통합 완료 보고서와 보안 보고서를 읽고, 원본의 후속 번역 작업을 보존하면서 최종 반영 범위를 정한다. 통합 브랜치에 영역별 변경을 중복 적용하지 않는다.
2. 운영에 노출되었던 재검증 비밀값을 폐기·교체한다. webhook을 사용한다면 새 서버 전용 `REVALIDATE_SECRET`을 설정한다.
3. 실제 backend의 `/blog/admin/posts`가 Firebase 토큰과 관리자 권한을 검증하는지, frontend 서버에서 접근할 수 있는지 확인한다. 실제 로그인 후 관리자 저장·재검증 흐름도 확인한다.
4. 운영 API·Firebase 환경으로 새로 빌드하고, 실제 배포 절차에 맞춰 릴리스한다. 이번 세션에서는 원격 push·main 병합·배포를 수행하지 않았다.
5. 후속 개선은 각 보고서의 우선순위를 참고한다. backend HTML 정화·업로드 제한·rate limit, 문의 직접 접수 API, 게시글 1,000개 초과 시 API 페이지 처리, 시간대 없는 날짜 처리, 장애 관측·편집기 백업, Search Console·실사용자 성능 확인이 남아 있다.

## 이번 핸드오프 요청의 변경

이 파일을 원본 저장소에 새로 작성했다. 기존 개선 커밋, 원본 소스, 원본의 다른 미커밋 파일은 수정하지 않았다. 이 핸드오프 파일은 커밋하지 않은 상태로 전달한다.

절대경로: `/Users/hklee03/dev/funq/blog-nextjs/docs/handoffs/2026-09-08-blog-improvements-handoff.md`
