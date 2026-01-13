@echo off
echo Iniciando proyecto local...
echo.

REM Buscar Node.js
set "NODEJS="
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODEJS=C:\Program Files\nodejs\node.exe"
    set "NPM=C:\Program Files\nodejs\npm.cmd"
    goto :found
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "NODEJS=C:\Program Files (x86)\nodejs\node.exe"
    set "NPM=C:\Program Files (x86)\nodejs\npm.cmd"
    goto :found
)
if exist "%USERPROFILE%\AppData\Roaming\npm\node.exe" (
    set "NODEJS=%USERPROFILE%\AppData\Roaming\npm\node.exe"
    set "NPM=%USERPROFILE%\AppData\Roaming\npm\npm.cmd"
    goto :found
)

echo Node.js no encontrado. Por favor instala Node.js desde https://nodejs.org/
pause
exit /b 1

:found
REM Verificar dependencias
if not exist "node_modules" (
    echo Instalando dependencias...
    "%NPM%" install
    if errorlevel 1 (
        echo Error al instalar dependencias
        pause
        exit /b 1
    )
)

REM Iniciar servidor
echo.
echo Iniciando servidor...
echo Abre http://localhost:3000 en tu navegador
echo Presiona Ctrl+C para detener
echo.

"%NPM%" run dev
