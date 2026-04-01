@echo off
setlocal enabledelayedexpansion

:: start-ksef.cmd - Start KSeF development servers
:: Usage:
::   start-ksef              Start all (api, web, code)
::   start-ksef api          Start only API (port 7071)
::   start-ksef web          Start only Web (port 3001)
::   start-ksef code         Start only Code App (port 3002)
::   start-ksef api web      Start API + Web

set "ROOT=%~dp0"
set "START_API=0"
set "START_WEB=0"
set "START_CODE=0"

if "%~1"=="" (
    set "START_API=1"
    set "START_WEB=1"
    set "START_CODE=1"
    goto :run
)

:parse_args
if "%~1"=="" goto :run
if /i "%~1"=="api"  set "START_API=1"
if /i "%~1"=="web"  set "START_WEB=1"
if /i "%~1"=="code" set "START_CODE=1"
shift
goto :parse_args

:run
echo.
echo  ========================================
echo   KSeF Development Environment
echo  ========================================
echo.

if "%START_API%"=="1" (
    call :check_port 7071 PORT_BUSY
    if "!PORT_BUSY!"=="1" (
        echo  [API]  Already running on port 7071 - skipping
    ) else (
        echo  [API]  Starting on port 7071...
        start "[KSeF] API - port 7071" /d "%ROOT%api" cmd /k "npm run clean && npm run build && func start"
    )
)

if "%START_WEB%"=="1" (
    call :check_port 3001 PORT_BUSY
    if "!PORT_BUSY!"=="1" (
        echo  [WEB]  Already running on port 3001 - skipping
    ) else (
        echo  [WEB]  Starting on port 3001...
        start "[KSeF] Web - port 3001" /d "%ROOT%web" cmd /k "npm run dev"
    )
)

if "%START_CODE%"=="1" (
    call :check_port 3002 PORT_BUSY
    if "!PORT_BUSY!"=="1" (
        echo  [CODE] Already running on port 3002 - skipping
    ) else (
        echo  [CODE] Starting on port 3002...
        start "[KSeF] Code App - port 3002" /d "%ROOT%code-app" cmd /k "npm run dev"
    )
)

echo.
echo  Done. Servers started in separate windows.
echo.
exit /b 0

:check_port
set "%~2=0"
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr "LISTENING" ^| findstr ":%~1 "') do (
    set "%~2=1"
)
exit /b
