@echo off
setlocal enabledelayedexpansion

set LOG_DIR=logs
set LOG_FILE=%LOG_DIR%\run-local.log

if not exist %LOG_DIR% (
  mkdir %LOG_DIR%
)

echo === Creative Construct bootstrap (%DATE% %TIME%) === > %LOG_FILE%

call :run "docker compose up -d" || exit /b 1
call :run "pnpm install" || exit /b 1
call :run "pnpm prisma:migrate" || exit /b 1
call :run "pnpm prisma:generate" || exit /b 1
call :run "pnpm scan:library" || exit /b 1
call :run "pnpm dev" || exit /b 1

exit /b 0

:run
set CMD=%~1
echo. >> %LOG_FILE%
echo [%DATE% %TIME%] Running: %CMD% >> %LOG_FILE%
echo Running: %CMD%
cmd /c "%CMD% >> %LOG_FILE% 2>&1"
if errorlevel 1 (
  echo FAILED: %CMD%
  echo [%DATE% %TIME%] FAILED: %CMD% >> %LOG_FILE%
  echo See log: %LOG_FILE%
  exit /b 1
)
exit /b 0
