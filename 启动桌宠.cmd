@echo off
setlocal
cd /d "%~dp0"

if exist "%~dp0MoonlitPet.exe" goto portable
if not exist "%~dp0package.json" goto incomplete
set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
if exist "%ELECTRON_EXE%" goto source
where npm.cmd >nul 2>nul
if errorlevel 1 goto missingNode
echo Installing source dependencies. Internet access is required...
call npm.cmd ci
if errorlevel 1 goto installFailed
if exist "%ELECTRON_EXE%" goto source
goto runtimeMissing

:portable
set "ELECTRON_RUN_AS_NODE="
start "" "%~dp0MoonlitPet.exe"
if errorlevel 1 goto launchFailed
exit /b 0

:source
set "ELECTRON_RUN_AS_NODE="
rem The trailing dot protects a quoted directory ending in a backslash.
start "" "%ELECTRON_EXE%" "%~dp0."
if errorlevel 1 goto launchFailed
exit /b 0

:missingNode
echo Source edition: Node.js LTS is required.
echo For direct use, download the Windows portable ZIP and extract ALL files.
echo Then double-click MoonlitPet.exe. No Node.js installation is needed.
goto failed

:incomplete
echo Missing application files. Extract the ENTIRE ZIP before launching.
echo Do not run inside a ZIP preview or copy the launcher by itself.
goto failed

:installFailed
echo Dependency installation failed. Check the error above and your network.
echo You can use the Windows portable edition without installing dependencies.
goto failed

:runtimeMissing
echo Electron was not installed correctly. Use the Windows portable edition.
goto failed

:launchFailed
echo Unable to start the application. Re-extract the complete portable ZIP.

:failed
echo See README.md for Chinese instructions.
pause
exit /b 1
