\
@echo off
setlocal
echo === Starting Creative Construct (DEV) ===
docker compose up -d
pnpm dev
pause
