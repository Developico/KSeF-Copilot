@echo off
setlocal enabledelayedexpansion

:: stop-ksef.cmd - Stop KSeF development servers
:: Usage:
::   stop-ksef               Stop all (api, web, code)
::   stop-ksef api           Stop only API (port 7071)
::   stop-ksef web           Stop only Web (port 3001)
::   stop-ksef code          Stop only Code App (port 3002)
::   stop-ksef api web       Stop API + Web

set "STOP_API=0"
set "STOP_WEB=0"
set "STOP_CODE=0"

if "%~1"=="" (
    set "STOP_API=1"
    set "STOP_WEB=1"
    set "STOP_CODE=1"
    goto :run
)

:parse_args
if "%~1"=="" goto :run
if /i "%~1"=="api"  set "STOP_API=1"
if /i "%~1"=="web"  set "STOP_WEB=1"
if /i "%~1"=="code" set "STOP_CODE=1"
shift
goto :parse_args

:run
echo.
echo  ========================================
echo   KSeF - Stopping servers
echo  ========================================
echo.

set "STOPPED=0"

if "%STOP_API%"=="1" call :kill_port 7071 "API"
if "%STOP_WEB%"=="1" call :kill_port 3001 "Web"
if "%STOP_CODE%"=="1" call :kill_port 3002 "Code App"

echo.
if "%STOPPED%"=="0" (
    echo  No running servers found.
) else (
    echo  Done. Stopped %STOPPED% server^(s^).
)
echo.
exit /b 0

:kill_port
set "FOUND=0"
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr "LISTENING" ^| findstr ":%~1 "') do (
    if "%%p" neq "0" (
        taskkill /PID %%p /T /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo  [%~2]  Stopped ^(port %~1, PID %%p^)
            set "FOUND=1"
            set /a STOPPED+=1
        ) else (
            echo  [%~2]  Could not stop PID %%p on port %~1
        )
    )
)
if "%FOUND%"=="0" (
    echo  [%~2]  Not running ^(port %~1^)
)
exit /b
