한국어 블로그 전체 영문 초안 번역 작업 핸드오프

작성일: 2026-09-08 KST. 작업 경로: `/Users/hklee03/dev/funq/blog-nextjs`.

**현재 상태: 발행된 한국어 글 27편의 영문 초안 파일 작성과 검증을 완료했다. DB 저장 및 캐시 재검증은 관리자 인증을 사용할 수 없어 수행하지 않았다. 다음 담당자는 번역을 처음부터 다시 만들 필요 없이, 인증 후 기존 비발행 영문 레코드까지 대조하고 누락분만 초안으로 저장하면 된다.**

원격 API와 운영 사이트 상태는 2026-09-07 작업 당시 확인한 결과다. 최종 전체 번역 검증 시각은 2026-09-07 18:53:21 KST다. 2026-09-08 핸드오프 작성 시에는 로컬 파일·작업 트리·API 클라이언트 코드를 재확인했으며 원격 상태를 다시 조회하거나 DB에 쓰지 않았다.

| 항목 | 인계 상태 |
| --- | --- |
| 공개 API 발행 목록 | 한국어 27편, 영문 0편 |
| 대응 영문 공개 상세 조회 | `en-{원문 slug}` 27개 모두 404 |
| 기존 비발행 영문 레코드 | 관리자 인증이 없어 존재 여부 미확인 |
| 영문 초안 파일 | 27개, 전부 `is_published: false` |
| DB 초안 저장 / 캐시 재검증 | 각각 0건 |
| 운영 영문 경로 | 확인 당시 `/en`, `/en/feed.xml` 모두 404 |
| 커밋 / 푸시 / 배포 | 이 세션에서 수행하지 않음 |

사용자는 글별 확인 없이 전체 대상의 번역 파일 작성과 검증을 요청했다. 사용 가능한 관리자 인증이 있으면 기존 API로 영문 초안을 저장하고 캐시를 재검증하는 작업도 이미 요청했다. 기존 영문 글의 중복 생성·임의 덮어쓰기와 한국어 원본 변경은 금지했다. 실제 발행은 이번 작업에 포함되지 않는다.

**산출물과 읽을 파일**

| 경로 — 저장소 루트 기준 | 내용 |
| --- | --- |
| `content/{원문 slug}/en.json` | 27편의 실제 생성 API용 JSON |
| [content/english-drafts-report.md](content/english-drafts-report.md) | 원문 slug·영문 제목·번역 파일 경로·DB 저장 여부를 정리한 전체 27편 표와 검증 결과 |
| [scripts/validate-translations.py](scripts/validate-translations.py) | Python 표준 라이브러리 기반 읽기 전용 검증기, 자체 검사 포함 |
| [README.md](README.md), [CLAUDE.md](CLAUDE.md) | 프로젝트 구성과 기존 작업 지침. 작업 시작 시 모두 읽음 |
| [lib/i18n.ts](lib/i18n.ts) | 한국어/영문 slug 및 URL 변환 규칙 |
| [lib/api/posts.ts](lib/api/posts.ts) | 공개 글 조회, API 기본 주소와 캐시 처리 |
| [lib/api/admin.ts](lib/api/admin.ts) | Firebase ID 토큰을 쓰는 관리자 조회·생성·수정 및 캐시 재검증 클라이언트 |
| [app/api/revalidate/route.ts](app/api/revalidate/route.ts) | 재검증 인증, 글·목록 캐시 무효화, 운영 IndexNow 처리 |

초안 JSON의 필드는 정확히 `slug`, `title`, `description`, `content_html`, `author`, `cover_image_url`, `tags`, `is_published`다. `slug`는 `en-{원문 slug}`이고 `is_published`는 반드시 `false`다. 작성자·커버 이미지·태그는 공개 API 원문 값을 그대로 사용했다. `published_at`은 넣지 않았다.

**원본과 번역 처리 기준**

- 최신 원본은 backend-api DB다. `content/`의 기존 MDX는 참고 자료이며 번역 원본으로 사용하지 않았다. 공개 목록을 받은 뒤 한국어 상세 API 27개에서 제목·설명·`content_html`·메타데이터를 가져왔다.
- 제목·검색용 설명·본문 전체·표·캡션·콜아웃·이미지 alt·접근성 설명을 번역했다. 원문의 어조·주장·경험·수치를 유지했고 최신 사실을 추가하거나 원문의 사실을 임의로 수정하지 않았다.
- HTML 요소 순서, CSS, 클래스, id, 목차 앵커, 링크 URL, 이미지 데이터, 코드·명령어·파일 경로를 보존했다. 본문 최상위 독자용 요소에 `lang="en"`을 적용했다.
- `pre`, `code`, `style`, `script`는 원문 문자열 그대로다. 코드 안의 한국어 주석·프롬프트·예시·텍스트 도표도 의도적으로 남겼다. AI 채팅 글의 실제 입력 문자열 `말랑아`, `루팡아`, `푸딩아`, `마이콜아`는 기능 보존을 위해 유지하고 영어 설명을 붙였다.
- 발행된 영문 대상이 없었으므로 내부 글 링크는 현재 발행된 한국어 URL로 유지했다. 서로 다른 내부 글 대상 9개는 모두 HTTP 200이었다. 영문 초안만 생성된 상태에서는 영문 공개 URL로 바꾸지 않는다.

**검증 내역과 재실행**

검증기는 실제 공개 API 원문을 기준으로 27편 모두 통과했다. JSON 필드·자료형·slug·비발행 설정·메타데이터 일치, HTML 구조와 불변 속성, 본문 블록 누락, 독자용 속성의 미번역, 목차 대상, 내부 글의 발행 상태를 검사한다. 코드와 CSS는 원문 문자열과 대조한다. 의미·어조·수치는 번역 과정에서 직접 대조했으며, 자동 검사는 의미 검토를 대신하지 않는다.

원문과 번역에서 제목 요소 679개, 표 87개, 목록 198개, 목록 항목 592개, 이미지 2개, 링크 81개, `pre` 407개, 인라인을 포함한 `code` 837개가 일치했다. 검증기 자체 검사는 잘못된 발행 설정·slug·코드 변경·미번역·본문 누락을 거부했다. `git diff --check`도 통과했다. 브라우저 연결을 사용할 수 없어 렌더링 시각 검사는 수행하지 않았다. 애플리케이션 코드를 변경하지 않았으므로 빌드나 전체 앱 테스트를 실행한 것으로 간주하면 안 된다.

```sh
cd /Users/hklee03/dev/funq/blog-nextjs
python3 scripts/validate-translations.py --self-test
python3 scripts/validate-translations.py
```

두 번째 명령은 현재 공개 API를 조회하므로 원문이 이후 수정되거나 글이 추가되면 새 차이가 발견될 수 있다. 핸드오프 작성 시 27개 JSON의 유효성·slug 대응·비발행 설정을 다시 확인했고, 모든 파일의 SHA-256이 마지막 성공 검증 당시 값과 같았다.

**API와 인증**

API 기본 주소는 `https://api.funq.kr`, 프런트엔드 운영 주소는 `https://blog.funq.kr`다.

| 용도 | 요청 / 규칙 |
| --- | --- |
| 발행 목록 | `GET https://api.funq.kr/blog/posts?size=1000` |
| 공개 상세 | `GET https://api.funq.kr/blog/posts/{slug}` |
| 비발행 포함 관리자 목록 | `GET https://api.funq.kr/blog/admin/posts` |
| 비발행 포함 관리자 상세 | `GET https://api.funq.kr/blog/admin/posts/{slug}` |
| 영문 초안 생성 | `POST https://api.funq.kr/blog/posts`, JSON 본문, 관리자 Bearer 토큰 필요 |
| 캐시 재검증 | `POST https://blog.funq.kr/api/revalidate`, JSON 본문 `{"slug":"en-{원문 slug}"}`, `x-revalidate-secret` 필요 |
| 한국어 공개 URL | `/blogs/{원문 slug}` |
| 영문 공개 URL | `/en/blogs/{원문 slug}` |
| 영문 API 레코드 slug | `en-{원문 slug}` |

`lib/api/admin.ts`의 `adminFetch()`는 `lib/firebase`의 `getIdToken()`으로 Firebase ID 토큰을 얻어 `Authorization: Bearer ...`를 붙인다. 인증 없는 관리자 목록 요청은 403이었다. 확인한 로컬 설정에는 사용 가능한 관리자 ID 토큰이나 재검증 시크릿이 없었고, 연결된 인증 브라우저도 없었다. 비밀 값은 문서에 기록하지 않았다.

캐시 재검증은 백엔드 API가 아닌 프런트엔드의 `/api/revalidate`를 호출한다. 현재 로컬 클라이언트는 `NEXT_PUBLIC_REVALIDATE_SECRET`을 헤더에 넣고, 로컬 서버 경로는 `REVALIDATE_SECRET` 또는 해당 공개 환경 변수와 비교한다. 로컬 구현은 한국어·영문 상세 캐시 및 목록 캐시를 무효화한다. 운영 배포 버전의 실제 동작은 다시 확인해야 한다.

핸드오프 작성 중 기존 결과 보고서의 생성 경로 오기를 수정했다. 생성은 `POST /blog/posts`이며, `/blog/admin/posts`는 관리자 목록 조회 경로다.

**작업 트리 보존**

현재 브랜치는 `main`, HEAD는 `974ee5067910285530830924a0ae0c95b5e87a05`다. 작업 시작 전부터 영문 지원 관련 수정·삭제·미추적 파일이 많았다. 기존 `app/` 페이지 삭제와 `app/(ko)/`, `app/(en)/` 추가, `lib/i18n.ts`, `lib/feed.ts`, `tests/i18n.spec.ts`, 여러 컴포넌트 변경 등은 이번 번역 작업이 만든 변경이 아니다. 최신 글 폴더의 기존 파일도 사용자 작업이다.

번역 작업이 추가한 파일은 `en.json` 27개, 결과 보고서 1개, 검증 스크립트 1개다. 이번 인계 요청으로 이 핸드오프 파일을 추가했고, 앞서 작성한 결과 보고서의 API 경로 한 곳을 바로잡았다. 기존 파일 307개의 작업 전후 SHA-256이 일치하며 2026-09-08에도 같음을 확인했다. 변경사항은 커밋하지 않았다. 후속 작업에서도 기존 변경을 되돌리거나 다른 작업 파일까지 일괄 스테이징하지 말고 대상 파일을 구분해야 한다.

**다음 담당자의 진행 순서**

1. 이 문서와 결과 보고서, 위의 구현 파일을 읽고 작업 트리를 확인한다. 공개 목록과 상세를 다시 조회해 이후 새 글·원문 변경·발행된 영문 글이 있는지 확인한다.
2. 관리자 인증이 가능해지면 관리자 전체 목록과 필요한 상세를 조회한다. 공개 영문 404만으로 기존 비발행 영문도 없다고 판단하지 않는다. 이미 존재하는 영문 레코드는 중복 생성하거나 임의로 덮어쓰지 않는다.
3. 검증을 재실행한 뒤 DB에 없는 영문 글만 대응 `en.json`으로 `POST /blog/posts`에 생성한다. 응답의 영문 slug와 `is_published: false`를 확인하고 글별 저장 결과를 보고서에 기록한다.
4. 재검증 시크릿을 사용할 수 있으면 저장된 영문 slug로 기존 `/api/revalidate`를 호출하고 성공 여부를 기록한다. 일부 저장 뒤 실패하면 관리자 목록을 다시 조회해 저장된 글을 건너뛰고 누락분부터 재개한다.
5. 운영 영문 지원 배포 여부를 다시 확인한다. 기존 영문 구현의 배포와 브라우저 시각 검사는 후속 릴리스 작업으로 남아 있다. 실제 발행은 별도 편집·발행 단계이며, 이 작업의 초안 생성에서 `is_published`를 `true`로 바꾸지 않는다.
6. 영문 글이 실제 발행되고 URL이 정상 제공될 때 대상별로 내부 링크를 영문 URL로 전환한다.

**이전 작업의 원본 스냅샷과 증거**

다음 임시 디렉터리는 핸드오프 작성 시 존재했다. 영구 산출물이 아니므로 사라져도 작업은 저장소의 초안·보고서·검증기로 이어갈 수 있다. 이후 원문과 과거 번역의 차이를 조사할 때는 남아 있는 스냅샷이 도움이 된다.

```text
/var/folders/mf/33b_kn391y56k433jrm6bvt80000gp/T/funq-english-s_60rwcm
```

- `source/{slug}.json`: 번역 원본으로 사용한 공개 API 상세 27개.
- `validation.json`: 성공한 검증 결과, 원문 수정 시각, 원문 HTML·초안 파일 SHA-256, 요소별 개수.
- `public-posts.json`, `public-posts-final.json`: 작업 당시 공개 목록.
- `internal-link-checks.json`: 내부 대상 9개의 HTTP 응답 결과.
- `worktree-before.json`, `git-status-before`: 작업 전 파일 해시와 Git 상태.
- `translations/`, `prepare.py`, `finish.py`: 번역 중 사용한 임시 자료. 최종 산출물은 저장소의 `en.json`이며 이 임시 도구를 재실행할 필요는 없다.

저장한 API 원본으로 검증하려면 다음 명령을 사용할 수 있다.

```sh
python3 scripts/validate-translations.py --source-dir /var/folders/mf/33b_kn391y56k433jrm6bvt80000gp/T/funq-english-s_60rwcm/source
```
