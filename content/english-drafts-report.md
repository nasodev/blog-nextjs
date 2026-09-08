영문 초안 작업 결과 — 2026-09-07 18:53:21 KST

[공개 목록 API](https://api.funq.kr/blog/posts?size=1000)에서 발행된 한국어 글 27편, 영문 글 0편을 확인했다. 각 한국어 상세 API의 최신 `content_html`을 번역 원본으로 사용했고, 기존 MDX를 원본으로 사용하지 않았다. 대응하는 `en-{원문 slug}` 공개 상세 API 27개도 모두 404였다. 관리자 인증 없이 비발행 영문 레코드의 존재 여부는 확인할 수 없다.

27편의 제목·검색용 설명·본문·독자용 속성 번역을 `content/{원문 slug}/en.json`에 저장했다. 모든 JSON은 생성 API에 필요한 `slug`, `title`, `description`, `content_html`, `author`, `cover_image_url`, `tags`, `is_published`만 포함하며, `slug`는 `en-{원문 slug}`, `is_published`는 `false`다. 작성자·커버 이미지·태그는 원문과 같다.

사용 가능한 Firebase 관리자 인증을 찾지 못했고, 인증 없는 관리자 API는 403을 반환했다. 따라서 DB 초안 생성과 캐시 재검증은 수행하지 않았다. 한국어 DB 레코드나 기존 영문 레코드를 수정하지 않았다.

| 원문 slug | 영문 제목 | 번역 파일 경로 | DB 초안 저장 |
| --- | --- | --- | --- |
| `okf-real-service-180runs-20260907-v01` | OKF: I Couldn't Find a Reason to Adopt It Yet | [content/okf-real-service-180runs-20260907-v01/en.json](okf-real-service-180runs-20260907-v01/en.json) | 미저장 — 인증 없음 |
| `codex-in-claude-code-20260906-v01` | Using Codex Alongside Claude Code: Plugin Comparison and Three Use Cases | [content/codex-in-claude-code-20260906-v01/en.json](codex-in-claude-code-20260906-v01/en.json) | 미저장 — 인증 없음 |
| `last30days-skill-20260906-v01` | last30days: Reading the Past Month's Community Discussions with an AI Agent | [content/last30days-skill-20260906-v01/en.json](last30days-skill-20260906-v01/en.json) | 미저장 — 인증 없음 |
| `orca-ade-20260729-v01` | An ADE, Not an IDE: Orca, a Command Center for Multiple Agents | [content/orca-ade-20260729-v01/en.json](orca-ade-20260729-v01/en.json) | 미저장 — 인증 없음 |
| `okf-open-knowledge-format-20260729-v01` | Google's OKF Knowledge Standard for AI Agents: Checking the Original Specification | [content/okf-open-knowledge-format-20260729-v01/en.json](okf-open-knowledge-format-20260729-v01/en.json) | 미저장 — 인증 없음 |
| `jira-workflow-automation-20260401-v01` | Building a Jira-Driven Development Harness: From One Issue Key to Verified Code | [content/jira-workflow-automation-20260401-v01/en.json](jira-workflow-automation-20260401-v01/en.json) | 미저장 — 인증 없음 |
| `harness-engineer-20260309-v01` | Harness Engineering: The Developer's New Role in the Age of AI Agents | [content/harness-engineer-20260309-v01/en.json](harness-engineer-20260309-v01/en.json) | 미저장 — 인증 없음 |
| `aiforge-20260309-v01` | AIForge: An Unattended Automation Workflow System for Claude Code | [content/aiforge-20260309-v01/en.json](aiforge-20260309-v01/en.json) | 미저장 — 인증 없음 |
| `sonar-claude-workflow-20260214-v01` | Automatically Handling Tens of Thousands of SonarQube Issues with AI Agents | [content/sonar-claude-workflow-20260214-v01/en.json](sonar-claude-workflow-20260214-v01/en.json) | 미저장 — 인증 없음 |
| `clawdbot-setup-20260131-v01` | Using an AI Agent from Telegram with Clawdbot | [content/clawdbot-setup-20260131-v01/en.json](clawdbot-setup-20260131-v01/en.json) | 미저장 — 인증 없음 |
| `docker-migration-20260124-v01` | Automating Deployment with Docker, GHCR, and GitHub Actions | [content/docker-migration-20260124-v01/en.json](docker-migration-20260124-v01/en.json) | 미저장 — 인증 없음 |
| `claude-code-plugin-20260118-v01` | Building a Claude Code Plugin: Automating Git Workflows | [content/claude-code-plugin-20260118-v01/en.json](claude-code-plugin-20260118-v01/en.json) | 미저장 — 인증 없음 |
| `react-vite-pwa-timer-20260116-v01` | Building a Precision Timer App with React 19, Vite 7, and PWA | [content/react-vite-pwa-timer-20260116-v01/en.json](react-vite-pwa-timer-20260116-v01/en.json) | 미저장 — 인증 없음 |
| `warp-terminal-20260110-v01` | Claude Code Keeps Crashing? Try Switching to Warp Terminal | [content/warp-terminal-20260110-v01/en.json](warp-terminal-20260110-v01/en.json) | 미저장 — 인증 없음 |
| `ai-playwright-agents-20260109-v01` | Playwright Agents: AI Plans, Writes, and Repairs Tests | [content/ai-playwright-agents-20260109-v01/en.json](ai-playwright-agents-20260109-v01/en.json) | 미저장 — 인증 없음 |
| `ai-claude-calendar-tech-20260104-v01` | Full-Stack Calendar Development: Recurring Events with FastAPI and Next.js | [content/ai-claude-calendar-tech-20260104-v01/en.json](ai-claude-calendar-tech-20260104-v01/en.json) | 미저장 — 인증 없음 |
| `ai-claude-calendar-20260104-v01` | Building a Calendar with Claude Code and Superpowers: Brainstorm → Plan → Execute | [content/ai-claude-calendar-20260104-v01/en.json](ai-claude-calendar-20260104-v01/en.json) | 미저장 — 인증 없음 |
| `tdd-20260101-v01` | Development and Testing: A Practical TDD Guide for Full-Stack Developers | [content/tdd-20260101-v01/en.json](tdd-20260101-v01/en.json) | 미저장 — 인증 없음 |
| `chat-claudecode-20251222-v01` | Building AI Chat with Four Distinct Personalities Using Claude Code | [content/chat-claudecode-20251222-v01/en.json](chat-claudecode-20251222-v01/en.json) | 미저장 — 인증 없음 |
| `chrome-devtools-mcp-20251221-v01` | E2E Testing in Natural Language: Trying Chrome DevTools MCP | [content/chrome-devtools-mcp-20251221-v01/en.json](chrome-devtools-mcp-20251221-v01/en.json) | 미저장 — 인증 없음 |
| `fastapi-firebase-auth-20251221-v01` | Implementing Firebase Authentication in FastAPI | [content/fastapi-firebase-auth-20251221-v01/en.json](fastapi-firebase-auth-20251221-v01/en.json) | 미저장 — 인증 없음 |
| `fastapi-setup-20251220-v01` | Setting Up a FastAPI Backend API Project | [content/fastapi-setup-20251220-v01/en.json](fastapi-setup-20251220-v01/en.json) | 미저장 — 인증 없음 |
| `kid-chat-20251218-v01` | Building and Deploying a Serverless Firebase Web Chat with Vite and TypeScript | [content/kid-chat-20251218-v01/en.json](kid-chat-20251218-v01/en.json) | 미저장 — 인증 없음 |
| `cicd-setup-20251216-v01` | Adding CI/CD to a Self-Hosted Next.js Blog | [content/cicd-setup-20251216-v01/en.json](cicd-setup-20251216-v01/en.json) | 미저장 — 인증 없음 |
| `server-setup-20251214-v01` | Setting Up a Blog Server: Ubuntu Server, Supabase, Nginx, HTTPS, and Fail2ban | [content/server-setup-20251214-v01/en.json](server-setup-20251214-v01/en.json) | 미저장 — 인증 없음 |
| `seo-20250202-v01-cg` | Applying SEO to Your Website | [content/seo-20250202-v01-cg/en.json](seo-20250202-v01-cg/en.json) | 미저장 — 인증 없음 |
| `supabase-20250202-v01-cg` | Getting Started with Supabase | [content/supabase-20250202-v01-cg/en.json](supabase-20250202-v01-cg/en.json) | 미저장 — 인증 없음 |

검증 결과: **27편 통과, 실패 0편**. JSON 필드·자료형·영문 slug 대응·비발행 설정을 확인했고, 원문과 번역의 HTML 요소 순서 및 독자용 번역 속성을 제외한 속성값을 대조했다. 본문 블록 누락, 미번역 문구, 이미지 alt·접근성 설명 누락, 목차 앵커와 대상 id 손상을 검사했다. 의미·어조·수치는 원문을 읽으며 대조했으며 최신 정보를 추가하거나 원문의 주장을 수정하지 않았다.

| 원문과 번역에서 일치한 요소 | 개수 |
| --- | ---: |
| 제목 요소 (`h1`–`h6`) | 679 |
| 표 (`table`) | 87 |
| 목록 (`ul` + `ol`) | 198 |
| 목록 항목 (`li`) | 592 |
| 이미지 (`img`) | 2 |
| 링크 (`a`) | 81 |
| 코드·서식 블록 (`pre`) | 407 |
| 코드 요소 (`code`, 인라인 포함) | 837 |

`pre`, `code`, `style`, `script`는 원본 문자열과 바이트 단위로 대조했다. 코드에 포함된 한국어 주석·프롬프트·예시·텍스트 도표는 코드 보존 기준에 따라 유지했다. AI 채팅 글의 실제 호출 문자열 `말랑아`, `루팡아`, `푸딩아`, `마이콜아`도 기능 보존을 위해 유지하고 영어 설명을 붙였다. 그 외 본문과 독자용 속성에는 미번역 한국어가 없다. 본문 최상위 독자용 요소에 `lang="en"`을 적용했다.

영문 대상이 아직 발행되지 않았으므로 내부 글 링크는 현재 발행된 한국어 URL로 유지했다. 서로 다른 내부 글 대상 9개는 모두 HTTP 200을 반환했다. 운영 사이트의 `/en`과 `/en/feed.xml`은 확인 시점에 404를 반환했다. 로컬 영문 지원 구현은 존재하지만 운영 영문 경로는 아직 제공되지 않는다. 브라우저 연결이 없어 실제 렌더링의 시각 검사는 수행하지 않았다.

기존 작업 트리의 파일 307개를 작업 전후 SHA-256으로 대조했고 변경된 파일은 없었다. `git diff --check`도 통과했다. 이번 작업은 영문 초안 27개, 이 보고서, 검증 스크립트만 추가한다.

[검증 스크립트](../scripts/validate-translations.py)는 Python 표준 라이브러리만 사용하고 공개 API를 읽으며 DB에 쓰지 않는다. 자체 검사에서는 정상 초안을 허용하고 발행 설정·slug·코드 변경·미번역·본문 누락 오류를 거부하는지 확인했다.

```sh
python3 scripts/validate-translations.py --self-test
python3 scripts/validate-translations.py
```

남은 작업:

1. 관리자 인증이 가능한 환경에서 비발행 영문 글까지 조회해 중복을 확인한다. 기존 영문 글을 덮어쓰지 않고 누락된 글만 이 JSON으로 `POST /blog/posts`에 초안 생성한 뒤 기존 캐시 재검증 경로를 호출한다. 관리자 전체 목록 조회 경로는 `GET /blog/admin/posts`다.
2. 운영에 기존 영문 지원 구현을 배포하고 `/en` 및 `/en/blogs/{원문 slug}` 경로를 확인한다.
3. 편집 검토 후 별도 발행 시점에 대상 영문 글의 발행 상태를 다시 확인하고 내부 링크를 해당 영문 URL로 전환한다.
