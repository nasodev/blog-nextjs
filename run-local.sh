#!/bin/bash

# 로컬 개발 서버 실행 스크립트
# PORT: 23001

PORT=23001

echo "🚀 블로그 개발 서버 시작 (http://localhost:$PORT)"
npm run dev -- -p $PORT
