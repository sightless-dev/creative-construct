\
@echo off
setlocal

echo === Creative Construct: install ===

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js 20+ and re-run.
  pause
  exit /b 1
)

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker not found. Install Docker Desktop and re-run.
  pause
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm not found. Installing pnpm globally...
  npm i -g pnpm
  if errorlevel 1 (
    echo [ERROR] Failed to install pnpm.
    pause
    exit /b 1
  )
)

echo Starting database containers...
docker compose up -d
if errorlevel 1 (
  echo [ERROR] docker compose up failed.
  pause
  exit /b 1
)

echo Installing dependencies...
pnpm install
if errorlevel 1 (
  echo [ERROR] pnpm install failed.
  pause
  exit /b 1
)

if not exist "apps\api\.env" (
  copy "apps\api\.env.example" "apps\api\.env" >nul
)

echo Running Prisma migrate...
cd apps\api
pnpm prisma generate
pnpm prisma migrate dev --name init
cd ..\..

echo === Done. Run start-dev.bat ===
pause
