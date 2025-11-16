# Vercel 배포 가이드

> AWS 프리티어 대신 Vercel 영구 무료 호스팅으로 마이그레이션

## 🎯 왜 Vercel인가?

### AWS 프리티어 vs Vercel 비교

| 항목 | AWS 프리티어 | Vercel 무료 (Hobby) |
|-----|------------|-------------------|
| **기간** | 1년 (계정 갱신 필요) | **영구 무료** ✅ |
| **대역폭** | 제한적 | 100GB/월 |
| **배포** | 수동 설정 | **GitHub 자동 배포** ✅ |
| **SSL** | 수동 설정 (Let's Encrypt) | **자동 (무료)** ✅ |
| **CDN** | CloudFront 별도 설정 | **자동 엣지 캐싱** ✅ |
| **관리** | 복잡 | **원클릭** ✅ |
| **Next.js 최적화** | 직접 설정 | **자동** ✅ |
| **프리뷰 배포** | 없음 | **PR마다 자동** ✅ |
| **빌드 시간** | 제한적 | 6,000분/월 |
| **프로젝트 수** | 제한적 | **무제한** ✅ |

---

## ✅ Vercel 무료 티어 상세

### 포함 사항 (100% 무료)
- ✅ 100GB 대역폭/월
- ✅ 6,000 빌드 분/월
- ✅ 무제한 프로젝트
- ✅ 자동 SSL (HTTPS)
- ✅ 엣지 네트워크 (전세계 CDN)
- ✅ GitHub/GitLab/Bitbucket 연동
- ✅ 브랜치별 프리뷰 배포
- ✅ 커스텀 도메인 (무제한)
- ✅ Serverless Functions
- ✅ 환경 변수 관리
- ✅ 분석 (Analytics) - 2,500 이벤트/월

### 제한 사항
- 상업적 용도 불가 (개인 프로젝트만)
- 팀 협업 불가 (1인 사용)

**개인 블로그는 Hobby 플랜으로 충분합니다!**

---

## 🚀 Vercel 배포 방법 (3가지)

### 방법 1: Vercel Dashboard (가장 쉬움) ⭐ 추천

**소요 시간: 3분**

#### 1. Vercel 계정 생성
1. https://vercel.com/signup 접속
2. **GitHub 계정으로 로그인**
3. Hobby 플랜 선택 (무료)

#### 2. 프로젝트 Import
1. Vercel Dashboard → **Add New** → **Project**
2. **Import Git Repository** 선택
3. **GitHub** 연결 (권한 승인)
4. `nasodev/blog-nextjs` 저장소 선택
5. **Import** 클릭

#### 3. 프로젝트 설정
```
Project Name: blog-nextjs (자동 입력됨)
Framework Preset: Next.js (자동 감지)
Root Directory: ./
Build Command: npm run build (자동)
Output Directory: .next (자동)
Install Command: npm install (자동)
```

#### 4. 환경 변수 추가
**Environment Variables** 섹션에서:

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

> `.env.local` 파일에서 복사하세요!

#### 5. 배포
- **Deploy** 버튼 클릭
- 3-5분 대기
- 완료! 🎉

**배포 URL**: `https://blog-nextjs-[random].vercel.app`

---

### 방법 2: Vercel CLI (개발자용)

**소요 시간: 5분**

#### 1. Vercel CLI 설치
```bash
npm i -g vercel
```

#### 2. 로그인
```bash
vercel login
```

GitHub 계정으로 인증

#### 3. 프로젝트 초기화
```bash
cd c:\dev\blog-nextjs
vercel
```

질문에 답변:
```
? Set up and deploy "C:\dev\blog-nextjs"? [Y/n] y
? Which scope do you want to deploy to? [Your Account]
? Link to existing project? [y/N] n
? What's your project's name? blog-nextjs
? In which directory is your code located? ./
? Want to override the settings? [y/N] n
```

#### 4. 환경 변수 추가
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

각 값을 입력하고 **Production** 선택

#### 5. 배포
```bash
vercel --prod
```

---

### 방법 3: GitHub Actions (자동화)

**소요 시간: 10분**

`.github/workflows/deploy.yml` 생성:

```yaml
name: Vercel Production Deployment

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

on:
  push:
    branches:
      - main

jobs:
  Deploy-Production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

GitHub Secrets 추가 필요:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## 🔧 커스텀 도메인 연결

### Vercel에서 도메인 설정

1. **Vercel Dashboard** → 프로젝트 선택
2. **Settings** → **Domains**
3. **Add** 클릭
4. 도메인 입력 (예: `blog.funq.kr`)

### DNS 설정

도메인 제공업체에서 다음 레코드 추가:

#### A Record
```
Type: A
Name: @ (또는 blog)
Value: 76.76.21.21
TTL: 3600
```

#### CNAME Record (권장)
```
Type: CNAME
Name: blog
Value: cname.vercel-dns.com
TTL: 3600
```

### 확인
- 10-30분 대기 (DNS 전파)
- Vercel에서 자동 SSL 인증서 발급
- HTTPS 자동 적용

---

## 🐛 트러블슈팅

### 1. 빌드 실패 - `package-lock.json` 에러

**에러:**
```
npm ci can only install packages when package.json and package-lock.json are in sync
```

**해결:**
```bash
# 로컬에서
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

✅ **이미 해결됨!**

---

### 2. 환경 변수 누락

**증상:** Supabase 연결 실패, 조회수 안보임

**해결:**
1. Vercel Dashboard → 프로젝트 → **Settings** → **Environment Variables**
2. 추가:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
3. **Redeploy** 클릭

---

### 3. Contentlayer 빌드 타임아웃

**증상:** 빌드가 10분 이상 걸림

**해결:**

`next.config.js` 수정:
```javascript
const { withContentlayer } = require('next-contentlayer');

module.exports = withContentlayer({
  reactStrictMode: true,
  swcMinify: true,
  // Vercel 빌드 타임아웃 증가
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
  },
});
```

---

### 4. 이미지 최적화 에러

**증상:** 이미지가 로드되지 않음

**해결:**

이미 `next.config.js`에 설정되어 있어야 함:
```javascript
images: {
  domains: ['blog.funq.kr'],
  formats: ['image/avif', 'image/webp'],
}
```

---

### 5. 빌드는 성공하지만 페이지 404

**원인:** Dynamic routes 문제

**확인:**
- `app/blogs/[slug]/page.tsx`의 `generateStaticParams()` 확인
- `allBlogs`가 제대로 import 되는지 확인

**해결:**
```typescript
export async function generateStaticParams() {
  return allBlogs.map((blog) => ({
    slug: blog._raw.flattenedPath
  }));
}
```

✅ **이미 올바르게 설정됨!**

---

## 📊 배포 후 체크리스트

### 1. 기능 테스트
- [ ] 홈페이지 로드 확인
- [ ] 블로그 포스트 열기
- [ ] 댓글 시스템 작동 (Giscus)
- [ ] 다크/라이트 모드 전환
- [ ] 조회수 카운터 작동 (Supabase)
- [ ] 카테고리 페이지 작동
- [ ] About/Contact 페이지

### 2. SEO 확인
- [ ] robots.txt: `https://your-domain.com/robots.txt`
- [ ] sitemap.xml: `https://your-domain.com/sitemap.xml`
- [ ] Open Graph 메타 태그
- [ ] JSON-LD 구조화 데이터

### 3. 성능 확인
- [ ] Lighthouse 점수 (목표: 90+)
- [ ] Core Web Vitals
- [ ] 이미지 최적화 (WebP/AVIF)
- [ ] 폰트 로딩

### 4. Analytics 설정
- [ ] Vercel Analytics 활성화 (무료 2,500 이벤트/월)
- [ ] Google Analytics 추가 (선택)
- [ ] Google Search Console 등록

---

## 🔄 자동 배포 워크플로우

### 현재 설정

1. **코드 수정** (로컬)
2. **Git commit & push**
   ```bash
   git add .
   git commit -m "포스트 추가"
   git push
   ```
3. **Vercel 자동 배포** ✨
   - main 브랜치 푸시 감지
   - 자동 빌드 시작
   - 빌드 성공 시 자동 배포
   - 슬랙/이메일 알림 (선택)

### 브랜치별 프리뷰 배포

```bash
# feature 브랜치 생성
git checkout -b feature/new-post
git push origin feature/new-post
```

→ Vercel이 프리뷰 URL 자동 생성!
→ PR에 댓글로 프리뷰 링크 추가

---

## 💰 비용 계산 (무료 범위)

### 현재 블로그 예상 사용량

**월간 추정:**
- 방문자: 1,000명
- 페이지뷰: 5,000
- 대역폭: ~5GB (포스트 11개, 이미지 포함)
- 빌드: ~50분 (주 2회 포스트 작성)

**Vercel 무료 범위:**
- ✅ 대역폭: 5GB / 100GB (5% 사용)
- ✅ 빌드: 50분 / 6,000분 (0.8% 사용)

**결론: 100% 무료로 운영 가능!** 🎉

---

## 🚀 다음 단계

### 배포 후 즉시
1. **커스텀 도메인 연결** (blog.funq.kr)
2. **Google Search Console** 등록
3. **Vercel Analytics** 활성화

### 1주일 내
4. **검색 기능 추가** (Fuse.js)
5. **RSS 피드 생성**
6. **소셜 공유 버튼**

### 1개월 내
7. **Google Analytics 연동**
8. **Newsletter 구독** (Resend)
9. **관련 포스트 추천**

---

## 📚 참고 자료

- **Vercel 공식 문서**: https://vercel.com/docs
- **Next.js 배포**: https://nextjs.org/docs/deployment
- **Vercel CLI**: https://vercel.com/docs/cli
- **커스텀 도메인**: https://vercel.com/docs/concepts/projects/domains

---

## ✅ 최종 체크

배포 전 확인:
- [x] `package-lock.json` 최신 상태
- [x] 환경 변수 준비 (.env.local)
- [x] GitHub 저장소 업데이트
- [x] Giscus 댓글 저장소 생성
- [x] 빌드 로컬 테스트 성공

**모든 준비 완료!** 이제 Vercel에 배포하세요! 🚀

---

**작성일**: 2025-11-16
**담당자**: Claude Code AI
**업데이트**: 패키지 동기화 이슈 해결 완료
