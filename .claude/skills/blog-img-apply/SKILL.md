---
description: 생성된 이미지를 블로그에 적용 (압축 + 이름 변경 + image 필드 업데이트)
---

# 블로그 이미지 적용기

생성된 헤더 이미지를 압축하고, 적절한 이름으로 변경한 뒤, MDX 파일의 image 필드를 업데이트합니다.

> **Tip**: frontmatter 전체 검증이 필요하면 `/blog-frontmatter`를 먼저 실행하세요.

## 입력 파싱

$ARGUMENTS에서 다음을 추출:
- **MDX 파일 경로**: `content/cicd-setup-20251216-v01/index.mdx`
- **이미지 경로**: 적용할 이미지 파일

사용 예시:
- `/blog-img-apply content/cicd-setup-20251216-v01/index.mdx /path/to/image.png`
- `/blog-img-apply @content/my-post/index.mdx ~/Downloads/header.png`

## 실행 단계

### 1. 입력 검증
- MDX 파일 존재 여부 (Read)
- 이미지 파일 존재 여부 (ls -lh)
- 이미지 형식 (png, jpg, jpeg, webp)

### 2. 이미지 정보 추출
```bash
ls -lh [이미지경로]
sips -g pixelWidth -g pixelHeight [이미지경로]
```

### 3. 이미지 처리

#### 파일명 생성
- 폴더: `content/cicd-setup-20251216-v01/` → slug: `cicd-setup-20251216-v01`
- 저장: `public/blog-cover/{slug}.jpg`

#### 압축 및 변환
```bash
# JPG 변환, 품질 80%, 최대 너비 1920px
sips -s format jpeg -s formatOptions 80 --resampleWidth 1920 [원본] --out public/blog-cover/{slug}.jpg
```

조건:
- 원본 너비 ≤ 1920px → 리사이즈 생략
- 원본 jpg + ≤ 1MB → 압축만

#### 원본 삭제
```bash
rm [원본이미지경로]
```

### 4. Frontmatter 업데이트
Edit 도구로 `image` 필드 수정:
```yaml
image: "../../public/blog-cover/{slug}.jpg"
```

### 5. 결과 검증
```bash
ls -lh public/blog-cover/{slug}.jpg
sips -g pixelWidth -g pixelHeight public/blog-cover/{slug}.jpg
```

## 출력 형식

```
## 이미지 처리 결과

| 항목 | 처리 전 | 처리 후 |
|------|---------|---------|
| 파일명 | header.png | cicd-setup-20251216-v01.jpg |
| 용량 | 2.4MB | 312KB |
| 해상도 | 2560x1440 | 1920x1080 |
| 형식 | png | jpg |

## 적용 완료

✅ 이미지가 `public/blog-cover/cicd-setup-20251216-v01.jpg`에 저장되었습니다.
✅ `content/cicd-setup-20251216-v01/index.mdx`의 image 필드가 업데이트되었습니다.
🗑️ 원본 이미지가 삭제되었습니다.
```

## 주의사항

- 원본 이미지는 처리 후 자동 삭제
- 같은 이름의 파일은 덮어씀
- 이미지 비율 유지 (너비 기준 리사이즈)
- sips는 macOS 전용 (Linux: ImageMagick)
