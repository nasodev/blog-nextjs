# SEO 및 배포 피드 개선

분석일: 2026-09-07 · 기준: `52c54e3`.
브랜치: `codex/blog-seo-20260907` · 워크트리: `blog-nextjs-audit-20260907/seo`.

## 확인된 문제와 구현

| 우선순위 | 근거 | 문제 | 구현 |
|---|---|---|---|
| 중간 | `lib/feed.ts` | 작성자·URL·채널 문자열의 XML 예약문자 처리 불완전. 이미지 파일 크기를 0으로 단정 | 텍스트/속성 XML escape와 CDATA 종료문 처리. 실제 길이를 모르는 enclosure는 Media RSS 이미지로 교체 |
| 중간 | 같은 파일 | 피드마다 전체 글 상세를 동시에 조회. 생성할 때마다 lastBuildDate 변경 | 최신 20개 전문만 조회, 실제 최신 수정일 사용. 전체 글은 사이트맵에 유지 |
| 중간 | 카테고리·소개·문의 metadata | Twitter 카드가 상위 레이아웃의 블로그 전체 제목/설명을 상속 | 각 페이지의 제목·설명·이미지를 명시 |
| 낮음 | `components/Blog/CategoryPage.tsx` | URL slug를 제목으로 사용, 카테고리 x-default 누락 | 원래 태그 이름과 언어별 제목 사용, 존재하는 언어로 x-default 지정 |
| 낮음 | `app/manifest.ts` | 존재하지 않는 apple-touch-icon URL을 선언 | 잘못된 항목 제거, 짧은 이름·언어·색상 보강 |
| 낮음 | `app/robots.ts` | API 경로에 대한 크롤링 제한 없음 | `/api/` 제외. robots는 인증이나 비공개 보장의 수단이 아님 |

기준 코드에 이미 있던 언어별 canonical/hreflang, BlogPosting/BreadcrumbList, 공개 글 기반 사이트맵, RSS 전문, 404, 관리자 noindex는 유지한다. 구현 중인 한·영문 지원을 덮어쓰지 않았다.

## 검증

- lint·route typegen·TypeScript 검사 통과.
- `tests/seo.spec.ts`: 예약문자·CDATA·이미지 MIME·최신 20개 제한·실제 수정일 회귀 검사.
- `tests/seo.browser.spec.ts`: 서버 메타데이터, 언어별 canonical, x-default, JSON-LD, RSS/사이트맵 XML 파싱, manifest 아이콘 HTTP 응답 검증.
- 기존 `tests/i18n.spec.ts`도 함께 실행한다. 최종 결과는 통합 보고서에 기록한다.

## 운영 확인 및 후속 제안

- Google Search Console/Bing Webmaster의 실제 색인·크롤링·검색 성과는 연결된 데이터가 없어 확인하지 않았다. 배포 후 사이트맵 제출과 대표 한/영 URL 검사를 수행한다.
- robots에서 막은 관리자 URL은 noindex 메타를 읽지 못할 수 있다. 이미 검색 결과에 남은 관리자 URL이 있다면 Search Console 제거와 크롤링 정책을 함께 검토한다.
- 날짜에서 시간대가 생략된 기존 API 응답은 Docker의 Asia/Seoul 환경에 의존한다. backend가 명시적 오프셋을 제공하도록 개선할 여지가 있다.
- 검색 순위 상승이나 Core Web Vitals 점수를 보장하거나 추정하지 않았다.

## 근거 자료

- [RSS 2.0 명세](https://www.rssboard.org/rss-specification): XML 문법, enclosure 실제 바이트 길이, lastBuildDate 의미.
- [Next.js metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata): 페이지별 메타데이터 생성과 상속.
- [Google 다국어 페이지](https://developers.google.com/search/docs/specialty/international/localized-versions): 언어별 URL과 상호 참조.

## 최종 검증 결과 (2026-09-07)

- 다섯 영역의 변경을 합친 `codex/blog-integrated-20260907`에서 단위 검사 4건, 브라우저 회귀 검사 11건 통과.
- 마지막 모바일 문의 레이아웃 변경 후 관련 4건, 테마 아이콘 수정 후 UI 2건을 다시 검사해 통과.
- 최종 소스의 ESLint 및 Next.js 16.3.4 프로덕션 빌드(TypeScript 검사 포함) 통과. 로컬 mock API와 테스트용 Firebase 설정을 사용해 35개 페이지를 생성했다.
- standalone 서버에서 공개 페이지·피드·사이트맵·관리자 noindex·JS 정적 파일과 잘못된 글 주소의 404를 확인했다.
- 운영 배포·실제 관리자 계정·이메일 발송·검색엔진 제출은 수행하지 않았다. 운영 환경에만 적용 가능한 항목은 위 후속 목록에 남겼다.
