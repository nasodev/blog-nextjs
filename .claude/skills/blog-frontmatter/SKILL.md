---
description: 블로그 MDX 파일의 frontmatter 검증 및 수정
---

# 블로그 Frontmatter 검증기

블로그 MDX 파일의 frontmatter를 Contentlayer2 스키마에 맞게 검증하고 수정합니다.

## 입력 파싱

$ARGUMENTS에서 MDX 파일 경로를 추출:
- `content/cicd-setup-20251216-v01/index.mdx`
- `@content/my-post/index.mdx`

사용 예시:
- `/blog-frontmatter content/cicd-setup-20251216-v01/index.mdx`

## 필수 필드 스키마

```yaml
---
title: "글 제목"                           # required
description: "글 설명"                     # required
image: "../../public/blog-cover/xxx.jpg"  # required
publishedAt: "YYYY-MM-DD HH:MM:SS"         # required
updatedAt: "YYYY-MM-DD HH:MM:SS"           # required
author: "fundev"                           # required
isPublished: true                          # default: true
tags:                                      # optional
  - tag1
  - tag2
---
```

## 실행 단계

### 1. MDX 파일 읽기
Read 도구로 파일 읽고 frontmatter 추출 (첫 번째 `---` ~ 두 번째 `---`)

### 2. 필드 검증

| 필드 | 검증 | 자동 수정 |
|------|------|----------|
| `title` | 필수, 비어있지 않음 | ❌ 오류 |
| `description` | 필수, 비어있지 않음 | ❌ 오류 |
| `image` | `../../public/blog-cover/` 형식 | ⚠️ 경고 |
| `publishedAt` | `YYYY-MM-DD HH:MM:SS` 형식 | ✅ 수정 |
| `updatedAt` | `YYYY-MM-DD HH:MM:SS` 형식 | ✅ 수정 |
| `author` | 존재 여부 | ✅ `fundev` |
| `isPublished` | boolean | ✅ `true` |
| `tags` | 배열 형식 | ⚠️ 경고 |

### 3. 날짜 형식 수정
- `"2025-12-16"` → `"2025-12-16 00:00:00"`
- 누락 시 현재 날짜/시간으로 설정

### 4. 누락 필드 추가
Edit 도구로 누락된 필드 추가:
- `author: "fundev"`
- `isPublished: true`
- `publishedAt`/`updatedAt`: 현재 시간

## 출력 형식

```
## Frontmatter 검증 결과

| 필드 | 상태 | 값 |
|------|------|-----|
| title | ✅ | "서버로 옮긴 Next.js 블로그에 CI/CD 붙이기" |
| description | ✅ | "Next.js 블로그를 Ubuntu 서버로..." |
| image | ⚠️ 누락 | - |
| publishedAt | ✅ | "2025-12-16 10:00:00" |
| updatedAt | 🔄 추가됨 | "2025-12-21 14:30:00" |
| author | 🔄 추가됨 | "fundev" |
| isPublished | ✅ | true |
| tags | ✅ | [cicd, github-actions, devops] |

✅ Frontmatter 검증 완료
🔄 2개 필드가 자동 수정되었습니다
⚠️ image 필드가 누락되었습니다. /blog-img-apply로 이미지를 적용하세요.
```

## 오류 처리

### 필수 필드 누락
```
❌ Frontmatter 오류

다음 필수 필드가 누락되었습니다:
- title: 글 제목을 입력하세요
- description: 글 설명을 입력하세요

MDX 파일을 수정한 후 다시 실행하세요.
```
