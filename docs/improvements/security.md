# 보안 개선

분석일: 2026-09-07 · 기준: `52c54e3` (기존 미커밋 한·영문 변경 포함).
브랜치: `codex/blog-security-20260907` · 워크트리: `blog-nextjs-audit-20260907/security`.

## 확인된 문제와 조치

| 우선순위 | 근거 | 문제 | 구현 |
|---|---|---|---|
| 높음 | `lib/api/admin.ts`, `app/api/revalidate/route.ts`, Docker/CI | 재검증 비밀값을 NEXT_PUBLIC 변수로 배포해 방문자가 재검증을 호출할 수 있음 | 브라우저는 Firebase ID 토큰만 전송. 서버는 backend의 관리자 전용 조회 API에서 토큰과 권한을 검사. webhook 비밀값은 서버 전용으로 분리 |
| 높음 | `components/Admin/EditorPreview.tsx`, 기존 `/admin/preview` | 작성 중인 HTML이 로그인된 관리자와 같은 출처에서 실행되어 이벤트 핸들러 등이 부모 DOM·저장소에 접근 가능 | `sandbox=""` + 스크립트 금지 CSP의 srcDoc iframe으로 격리. 기존 미리보기 페이지·postMessage 통신 제거. 문서 스타일은 재사용 |
| 높음/낮음 | `package-lock.json`, npm audit | 취약 패키지 8개: high 7, low 1. 개발 도구의 전이 의존성과 이미지 처리 런타임을 포함 | Next.js/eslint-config-next 16.3.4 및 호환 범위 전이 의존성 갱신. 변경 후 npm audit: 0건 |
| 중간 | `app/api/revalidate/route.ts` | 잘못된 JSON을 전체 캐시 무효화 요청처럼 처리, slug 길이 제한 없음 | JSON 객체 검증·200자 제한. 인증 서비스 장애는 503으로 종료. 외부 요청에 5초 제한 |
| 보강 | `next.config.ts` | object/base/frame 정책 미설정 | CSP의 object-src/base-uri/frame-ancestors, 불필요한 기기 권한 차단, X-Powered-By 제거 |

## 검증

- `npm run lint`, `npx next typegen`, `npx tsc --noEmit` 통과.
- `npx playwright test tests/security.spec.ts tests/i18n.spec.ts --project=chromium --reporter=line`: 2건 통과.
- `tests/security.browser.spec.ts`: 실제 HTTP 권한 검사와 미리보기 악성 script/onerror·부모 접근 차단 회귀 검사. 통합 실행 결과는 아래 최종 검증 결과 참조.
- 의존성 검사는 알려진 패키지 취약점 검사이며, 서비스 전체가 안전하다는 보장은 아님.

## 운영 적용 및 남은 확인

1. 기존 `NEXT_PUBLIC_REVALIDATE_SECRET`은 노출된 값으로 간주하고 폐기한다. webhook을 쓴다면 새로운 `REVALIDATE_SECRET`을 서버 런타임에만 설정한다. 에디터에는 이 값이 필요 없다.
2. 배포 환경에서 frontend 서버가 backend `/blog/admin/posts`에 접근 가능해야 한다. backend가 Firebase 토큰과 관리자 UID를 모두 검사하는 계약을 재사용했다. 실제 관리자 로그인·권한 정책은 로컬 mock으로 대체했으므로 운영 검증이 필요하다.
3. 공개 `PostBody`는 기존의 신뢰된 관리자가 작성한 HTML을 출력한다. backend의 저장 시 HTML 정화·이미지 업로드 검증·조회수 rate limit은 이 저장소에 구현이 없어 검증 범위 밖이다. 다중 작성자/외부 HTML 수집을 도입하기 전에 허용 목록 기반 정화와 관리자 권한 검사를 backend에서 확인해야 한다.
4. CSP는 기존 Next 부트스트랩·Firebase·Giscus와의 호환을 지키는 부분 정책이다. 스크립트 nonce 기반 전체 CSP나 Nginx rate limit까지 적용했다고 주장하지 않는다.

## 근거 자료

- [Next.js 공개 환경변수](https://nextjs.org/docs/app/guides/environment-variables): NEXT_PUBLIC 값은 브라우저 번들에 포함된다.
- [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe): 미리보기 출처와 스크립트를 격리한다.
- [Next.js 16.3.4 릴리스](https://github.com/vercel/next.js/releases/tag/v16.3.4), [sharp 보안 공지](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [PostCSS 보안 공지](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).

## 최종 검증 결과 (2026-09-07)

- 다섯 영역의 변경을 합친 `codex/blog-integrated-20260907`에서 단위 검사 4건, 브라우저 회귀 검사 11건 통과.
- 마지막 모바일 문의 레이아웃 변경 후 관련 4건, 테마 아이콘 수정 후 UI 2건을 다시 검사해 통과.
- 최종 소스의 ESLint 및 Next.js 16.3.4 프로덕션 빌드(TypeScript 검사 포함) 통과. 로컬 mock API와 테스트용 Firebase 설정을 사용해 35개 페이지를 생성했다.
- standalone 서버에서 공개 페이지·피드·사이트맵·관리자 noindex·JS 정적 파일과 잘못된 글 주소의 404를 확인했다.
- 운영 배포·실제 관리자 계정·이메일 발송·검색엔진 제출은 수행하지 않았다. 운영 환경에만 적용 가능한 항목은 위 후속 목록에 남겼다.
