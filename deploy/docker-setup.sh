#!/bin/bash
# 서버 초기 설정 스크립트
# 프로덕션 서버에서 최초 1회 실행

set -e

echo "=== Blog Docker 초기 설정 ==="

# 1. Docker 네트워크 생성
if ! docker network ls | grep -q "funq-network"; then
    echo "Creating funq-network..."
    docker network create funq-network
else
    echo "funq-network already exists"
fi

# 2. 설정 디렉토리 생성
CONFIG_DIR="/home/funq/dev/config/blog-nextjs"
if [ ! -d "$CONFIG_DIR" ]; then
    echo "Creating config directory..."
    mkdir -p "$CONFIG_DIR"
fi

# 3. .env.prod 템플릿 생성
ENV_FILE="$CONFIG_DIR/.env.prod"
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env.prod template..."
    cat > "$ENV_FILE" << 'EOF'
# Blog Production Environment
#
# NEXT_PUBLIC_* 값은 이미 Docker 이미지 빌드 시점에 인라인되어 있음 (GitHub Actions
# build-args, .github/workflows/deploy.yml 참고). 아래에 다시 적어도 실행 중인 컨테이너의
# 동작은 바뀌지 않음 (참고용 문서화 목적) — 값을 바꾸려면 새 이미지를 빌드해야 함.
# REVALIDATE_SECRET(NEXT_PUBLIC_ 접두사 없음)만 유일하게 런타임에 실제로 읽힘.
NEXT_PUBLIC_API_URL=https://api.funq.kr
REVALIDATE_SECRET=your_random_secret
NEXT_PUBLIC_REVALIDATE_SECRET=your_random_secret
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EOF
    echo "Created $ENV_FILE - please update with actual values"
else
    echo ".env.prod already exists"
fi

echo ""
echo "=== 설정 완료 ==="
echo ""
echo "다음 단계:"
echo "1. $ENV_FILE 파일에 실제 값 입력"
echo "2. GitHub Secrets 설정:"
echo "   - SSH_HOST, SSH_USER, SSH_KEY, SSH_PORT"
echo "   - GHCR_TOKEN (read:packages 권한)"
echo "   - NEXT_PUBLIC_API_URL"
echo "   - NEXT_PUBLIC_REVALIDATE_SECRET"
echo "   - NEXT_PUBLIC_FIREBASE_API_KEY"
echo "   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "   - NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "   - NEXT_PUBLIC_FIREBASE_APP_ID"
