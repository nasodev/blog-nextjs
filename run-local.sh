#!/bin/bash

# 로컬 개발 서버 실행 스크립트
# PORT: 23001

PORT=23001

# 해당 포트를 사용 중인 프로세스 확인 및 종료
PID=$(lsof -ti:$PORT)
if [ -n "$PID" ]; then
    echo "⚠️  포트 $PORT 사용 중인 프로세스 종료 (PID: $PID)"
    kill -9 $PID 2>/dev/null
    sleep 1
fi

echo "🚀 블로그 개발 서버 시작 (http://localhost:$PORT)"
npm run dev -- -p $PORT
