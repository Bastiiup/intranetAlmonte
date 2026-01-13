# Script para iniciar el proyecto localmente
# Ejecuta este script con: .\iniciar-local.ps1

Write-Host "🚀 Iniciando proyecto local..." -ForegroundColor Green
Write-Host ""

# Navegar al directorio del proyecto
Set-Location $PSScriptRoot

# Buscar Node.js en ubicaciones comunes
$nodePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:USERPROFILE\AppData\Roaming\npm\node.exe"
)

$nodeExe = $null
foreach ($path in $nodePaths) {
    if (Test-Path $path) {
        $nodeExe = $path
        $nodeDir = Split-Path $path
        Write-Host "✅ Node.js encontrado en: $nodeDir" -ForegroundColor Green
        break
    }
}

# Si no se encuentra, intentar con where.exe
if (-not $nodeExe) {
    $whereResult = where.exe node 2>$null
    if ($whereResult) {
        $nodeExe = $whereResult | Select-Object -First 1
        $nodeDir = Split-Path $nodeExe
        Write-Host "✅ Node.js encontrado en: $nodeDir" -ForegroundColor Green
    }
}

# Si aún no se encuentra, mostrar error
if (-not $nodeExe) {
    Write-Host "❌ Node.js no encontrado. Por favor:" -ForegroundColor Red
    Write-Host "   1. Instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   2. Reinicia PowerShell" -ForegroundColor Yellow
    Write-Host "   3. Ejecuta este script nuevamente" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Agregar Node.js al PATH temporalmente
$env:PATH = "$nodeDir;$env:PATH"

# Verificar versiones
Write-Host ""
Write-Host "📦 Verificando versiones..." -ForegroundColor Cyan
$nodeVersion = & "$nodeExe" --version
$npmVersion = & "$nodeDir\npm.cmd" --version
Write-Host "   Node.js: $nodeVersion" -ForegroundColor Gray
Write-Host "   npm: $npmVersion" -ForegroundColor Gray
Write-Host ""

# Verificar que .env.local existe
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  Advertencia: .env.local no encontrado" -ForegroundColor Yellow
    Write-Host "   El proyecto puede no funcionar correctamente sin variables de entorno" -ForegroundColor Yellow
    Write-Host ""
}

# Instalar dependencias si no existen
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Instalando dependencias (esto puede tardar 3-5 minutos)..." -ForegroundColor Cyan
    & "$nodeDir\npm.cmd" install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit 1
    }
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
    Write-Host ""
}

# Iniciar servidor de desarrollo
Write-Host "🚀 Iniciando servidor de desarrollo..." -ForegroundColor Cyan
Write-Host "   Abre http://localhost:3000 en tu navegador" -ForegroundColor Gray
Write-Host "   Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
Write-Host ""

& "$nodeDir\npm.cmd" run dev
