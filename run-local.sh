#!/bin/bash
# 로컬 개발 서버 실행 스크립트
# 사용법:
#   ./run-local.sh              # Docker로 실행 (기본)
#   ./run-local.sh docker       # Docker로 실행
#   ./run-local.sh npm          # npm으로 실행 (기존 방식)
#   ./run-local.sh restart      # Docker 재시작
#   ./run-local.sh restart npm  # npm 재시작

set -e

cd "$(dirname "$0")"

MODE="${1:-docker}"
PORT=23001

case "$MODE" in
    docker)
        echo "=== Docker 모드로 실행 ==="

        # Docker 네트워크 생성 (없으면)
        if ! docker network ls | grep -q "funq-network"; then
            echo "Creating funq-network..."
            docker network create funq-network
        fi

        # 기존 컨테이너 정리
        docker compose down 2>/dev/null || true

        echo "Starting blog with Docker on port $PORT..."
        docker compose up --build
        ;;

    npm)
        echo "=== npm 모드로 실행 ==="

        # 해당 포트를 사용 중인 프로세스 확인 및 종료
        PID=$(lsof -ti:$PORT 2>/dev/null)
        if [ -n "$PID" ]; then
            echo "포트 $PORT 사용 중인 프로세스 종료 (PID: $PID)"
            kill -9 $PID 2>/dev/null
            sleep 1
        fi

        echo "Starting blog on http://localhost:$PORT"
        npm run dev -- -p $PORT
        ;;

    restart)
        RESTART_MODE="${2:-docker}"
        echo "=== 재시작 ($RESTART_MODE 모드) ==="

        if [ "$RESTART_MODE" = "docker" ]; then
            echo "Docker 컨테이너 재시작 중..."
            docker compose down
            docker compose up --build
        elif [ "$RESTART_MODE" = "npm" ]; then
            # npm 프로세스 종료 후 재시작
            PID=$(lsof -ti:$PORT 2>/dev/null)
            if [ -n "$PID" ]; then
                echo "포트 $PORT 프로세스 종료 (PID: $PID)"
                kill -9 $PID 2>/dev/null
                sleep 1
            fi
            echo "npm 서버 재시작 중..."
            npm run dev -- -p $PORT
        else
            echo "잘못된 재시작 모드: $RESTART_MODE"
            echo "사용법: ./run-local.sh restart [docker|npm]"
            exit 1
        fi
        ;;

    *)
        echo "사용법: ./run-local.sh [docker|npm|restart]"
        echo "  docker       - Docker Compose로 실행 (기본)"
        echo "  npm          - npm run dev로 실행 (기존 방식)"
        echo "  restart      - Docker 재시작"
        echo "  restart npm  - npm 재시작"
        exit 1
        ;;
esac
