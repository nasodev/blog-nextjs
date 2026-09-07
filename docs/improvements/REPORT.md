# 블로그 개선 완료 보고서

완료일: 2026-09-07 (Asia/Seoul).

보안, UI·UX, 기능, 일반 개선, SEO의 분석 문서와 구현을 각각 독립 워크트리에 커밋했다. 검증용 통합 워크트리에는 다섯 영역을 모두 반영했다. 원격 push, main 병합, 운영 배포는 수행하지 않았다.

## 작업 위치

공통 경로: `/Users/hklee03/dev/funq/blog-nextjs-audit-20260907/`.
통합 브랜치: `codex/blog-integrated-20260907` · 통합 워크트리: `integration`.

| 문서 | 워크트리 | 브랜치 | 최종 커밋 | 주요 구현 |
|---|---|---|---|---|
| [보안](security.md) | `security` | `codex/blog-security-20260907` | `9387b3c` | 공개 비밀값 제거·관리자 검증·미리보기 격리·의존성 갱신 |
| [UI·UX](ui-ux.md) | `ui-ux` | `codex/blog-ui-ux-20260907` | `82e89d5` | 검색 모달·키보드·모바일 메뉴·본문/문의 레이아웃·아이콘 |
| [기능](features.md) | `features` | `codex/blog-features-20260907` | `87b4355` | 문의 이메일 초안·글 링크 복사·RSS 구독 링크 |
| [일반 개선](maintenance.md) | `maintenance` | `codex/blog-maintenance-20260907` | `c797b30` | 서버 글 목록·조회수 중복 방지·테마 동기화·실제 사이트 테스트/CI |
| [SEO](seo.md) | `seo` | `codex/blog-seo-20260907` | `7e0d5ac` | RSS XML·호출 상한·페이지별 카드·카테고리 언어 링크·manifest |

각 문서는 발견 근거·우선순위·구현 내용·검증·후속 항목을 포함한다. 영역별 워크트리는 서로 독립적인 변경을 담으므로, 전체 개선본 확인과 실행은 통합 워크트리를 사용한다.

## 검증 결과

| 검사 | 결과 | 범위 |
|---|---|---|
| 각 영역 ESLint·Next route typegen·TypeScript | 통과 | 5개 워크트리의 개별 변경 |
| 최종 통합 ESLint | 통과 | 최종 애플리케이션 소스 |
| 단위 회귀 | 4/4 통과 | 기존 한·영문 규약, 재검증 인증/입력, 문의 인코딩, RSS 예약문자/조회 상한 |
| 브라우저 회귀 | 11/11 통과 | 검색·모바일·테마·조회수·클립보드·문의·권한·iframe 격리·메타데이터·XML |
| 마지막 UI 수정 후 재검사 | 4/4, 이후 2/2 통과 | 모바일 문의 레이아웃과 테마 아이콘 회귀 |
| 프로덕션 빌드 | 통과 | Next.js 16.3.4 Turbopack + TypeScript, 35개 페이지 생성 |
| standalone 실행 | 통과 | 11개 정상 URL, 존재하지 않는 글의 404, JS 정적 파일, 보안 헤더, 관리자 noindex |
| npm audit | **8개 → 0개** | 최초 high 7/low 1 → 알려진 취약점 0건 |
| Git diff 공백 검사 | 통과 | 작업 기준 대비 변경 |

빌드·E2E는 테스트용 localhost API/Firebase 설정을 사용했다. 실제 Firebase 로그인/관리자 권한 정책이나 실제 이메일 발송을 시험한 결과가 아니다. 초기 실행에서 발견된 테스트 변환/개발 서버 manifest 경합을 정리했고, 초기 테마 변경 누락·검색 Esc 처리·아이콘 클래스 누락은 제품 코드에서 수정한 뒤 재검증했다.

실제 운영 홈페이지는 읽기 요청으로 HTTP 200을 확인했다. 검색 순위, Search Console 데이터, 실사용자 Core Web Vitals는 측정하지 않았다.

## 원본 변경 보존

작업 기준은 2026-09-07 18:23:54 KST의 `52c54e3fc37ea9e5146888e3a9eeb5e91ed6f564`다. 원본 main의 당시 미커밋 한·영문 변경을 별도 임시 인덱스로 스냅샷했으며, 원본 인덱스를 stage/stash/reset하지 않았다.

원본 폴더에서는 작업 중 번역 JSON 추가·수정과 번역 검증 스크립트가 별도로 생긴 것을 확인했다. 이 후속 변경을 덮어쓰거나 통합 브랜치로 임의 이동하지 않았다. 따라서 통합본을 최종 반영할 때는 스냅샷 이후 번역 변경도 함께 보존해야 한다.

## 운영 적용 전에 필요한 항목

1. **기존 공개 재검증 비밀값 폐기/교체**: 브라우저 빌드 변수는 제거했다. webhook 사용 시 새 서버 전용 `REVALIDATE_SECRET`을 설정해야 한다.
2. 실제 backend가 `/blog/admin/posts`에서 Firebase 토큰과 관리자 UID를 검증하는지, frontend 서버에서 접근 가능한지 확인한다.
3. backend의 HTML 정화·이미지 업로드 제한·rate limit과 Nginx 정책은 별도 저장소/운영 설정이어서 이번 검증 범위 밖이다. 공개 글 HTML은 신뢰된 관리자 콘텐츠라는 기존 계약을 유지한다.
4. 문의는 이메일 앱에서 초안을 작성하는 기능이다. 사이트 내 직접 발송이 필요하면 backend 접수 API를 별도로 구현한다.

나머지 기능 제안과 우선순위는 각 영역 문서의 후속 목록에 정리했다.

## 재현

```sh
cd /Users/hklee03/dev/funq/blog-nextjs-audit-20260907/integration
npm ci
npm run lint
npm run typecheck
npm run test:unit
npx playwright install chromium
npm run test:e2e
```

테스트 포트는 23002/28001이다. 일반 개발/프로덕션 빌드는 `.env.example`에 맞춘 실제 환경 설정을 사용한다. 이번 검증의 빌드 산출물은 테스트 API를 가리키므로 운영에 그대로 배포할 이미지가 아니다.
