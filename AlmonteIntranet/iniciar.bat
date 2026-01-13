@echo off
chcp 65001 >nul
echo Iniciando proyecto local...
echo.

REM Buscar Node.js en ubicaciones comunes
set "NODE_PATH="
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_PATH=C:\Program Files\nodejs"
    echo Node.js encontrado en: C:\Program Files\nodejs
    goto :found
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "NODE_PATH=C:\Program Files (x86)\nodejs"
    echo Node.js encontrado en: C:\Program Files (x86)\nodejs
    goto :found
)
if exist "%USERPROFILE%\AppData\Roaming\npm\node.exe" (
    set "NODE_PATH=%USERPROFILE%\AppData\Roaming\npm"
    echo Node.js encontrado en: %USERPROFILE%\AppData\Roaming\npm
    goto :found
)

echo Node.js no encontrado
echo Por favor instala Node.js desde https://nodejs.org/
pause
exit /b 1

:found
REM Agregar Node.js al PATH temporalmente
set "PATH=%NODE_PATH%;%PATH%"

REM Verificar versiones
echo.
echo Verificando versiones...
"%NODE_PATH%\node.exe" --version
"%NODE_PATH%\npm.cmd" --version
echo.

REM Verificar dependencias
if not exist "node_modules" (
    echo Instalando dependencias (esto puede tardar 3-5 minutos)...
    "%NODE_PATH%\npm.cmd" install
    if errorlevel 1 (
        echo Error al instalar dependencias
        pause
        exit /b 1
    )
    echo Dependencias instaladas
    echo.
) else (
    echo Dependencias ya instaladas
    echo.
)

REM Iniciar servidor
echo Iniciando servidor de desarrollo...
echo    Abre http://localhost:3000 en tu navegador
echo    Presiona Ctrl+C para detener el servidor
echo.

"%NODE_PATH%\npm.cmd" run dev
