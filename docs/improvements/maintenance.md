# 일반 개선 및 유지보수

분석일: 2026-09-07 · 기준: `52c54e3`.
브랜치: `codex/blog-maintenance-20260907` · 워크트리: `blog-nextjs-audit-20260907/maintenance`.

## 확인된 문제와 조치

| 우선순위 | 근거 | 문제 | 구현 |
|---|---|---|---|
| 중간 | `hooks/useInfiniteScroll.ts` | 처음부터 전체 글을 표시하므로 hasMore가 항상 false. observer·상태·가짜 지연만 유지 | 훅 제거, 서버 `BlogGrid`로 단순화. 홈/카테고리의 전체 글 링크를 서버 HTML에 유지 |
| 중간 | `components/Blog/ViewCounter.tsx` | 요청이 끝난 뒤 중복 방지 플래그를 설정해 Strict Mode에서 두 번 증가 가능. 처음에 항상 0 표시 | 진행 중 Promise를 재사용하고 언마운트된 응답은 무시. 초기값은 서버 조회수 사용 |
| 중간 | `components/Hook/useThemeSwitch.tsx`, 헤더·댓글 | 훅마다 테마 상태가 독립적이고 초기 시스템 테마를 저장해 이후 OS 변경을 막음. localStorage 예외 미처리 | useSyncExternalStore로 DOM 테마 상태 구독. 탭 간 저장소·OS 변경 반영, 사용자 선택 때만 저장, 저장소 차단 시도 정상 작동 |
| 중간 | `tests/example.spec.ts`, Playwright 설정 | 실제 블로그 대신 playwright.dev를 검사. 기본 URL·테스트 서버 없음 | 예제 삭제. 기존 Playwright로 단위/E2E 구분, localhost 전용 mock API와 Next 서버 구성 |
| 중간 | `package.json`, CI | lint 이후 바로 배포 빌드 진행 | typecheck/test 명령 추가, CI에서 타입·단위·실제 페이지 회귀 검사. Node를 Docker와 같은 22로 맞춤 |

## 실행

```sh
npm run lint
npm run typecheck
npm run test:unit
npx playwright install chromium
npm run test:e2e
```

E2E는 23002/28001 포트를 사용하며 실제 backend·Firebase 관리자 계정이 필요 없다. mock은 tests 폴더에만 있고 127.0.0.1에 바인딩한다. 프로덕션 Docker 산출물에 테스트 API를 추가하지 않는다.

## 검증 및 남은 개선

- lint·route typegen·TypeScript 검사 통과. 서버 HTML의 모든 글 링크, 404, 시스템/사용자 테마, 저장소 차단, Strict Mode 조회수를 E2E로 검사한다.
- 전체 결과는 통합 워크트리 최종 보고서에 기록한다.
- 게시글 목록 API의 `size=1000` 상한은 남아 있다. 글 수가 상한에 근접하면 backend 페이지네이션 계약과 링크 기반 페이지를 함께 구현해야 한다.
- API 장애 화면/관측, 에디터 초안의 저장공간 초과·다중 탭 충돌, 배포 중단 시간과 자동 롤백은 후속 작업이다. 이번에 확인한 코드 경로 외 운영 장애 대응까지 완료했다고 주장하지 않는다.
