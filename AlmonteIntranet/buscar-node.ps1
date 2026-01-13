# Script para buscar y configurar Node.js
Write-Host "🔍 Buscando Node.js en tu sistema..." -ForegroundColor Cyan
Write-Host ""

$foundPaths = @()

# Buscar en ubicaciones comunes
$searchPaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:ProgramFiles\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\npm",
    "$env:ProgramData\nvm"
)

foreach ($path in $searchPaths) {
    if (Test-Path "$path\node.exe") {
        $foundPaths += $path
        Write-Host "✅ Encontrado: $path" -ForegroundColor Green
    }
}

# Buscar en nvm-windows
if (Test-Path "$env:ProgramData\nvm") {
    $nvmVersions = Get-ChildItem "$env:ProgramData\nvm" -Directory -ErrorAction SilentlyContinue
    foreach ($version in $nvmVersions) {
        if (Test-Path "$($version.FullName)\node.exe") {
            $foundPaths += $version.FullName
            Write-Host "✅ Encontrado (nvm): $($version.FullName)" -ForegroundColor Green
        }
    }
}

# Buscar en el PATH actual
$env:PATH -split ';' | ForEach-Object {
    if ($_ -and (Test-Path "$_\node.exe")) {
        if ($foundPaths -notcontains $_) {
            $foundPaths += $_
            Write-Host "✅ Encontrado (PATH): $_" -ForegroundColor Green
        }
    }
}

Write-Host ""

if ($foundPaths.Count -eq 0) {
    Write-Host "❌ Node.js no encontrado en tu sistema" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "1. Descarga Node.js desde: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "2. Instala la versión LTS (Long Term Support)" -ForegroundColor Yellow
    Write-Host "3. Durante la instalación, asegúrate de marcar 'Add to PATH'" -ForegroundColor Yellow
    Write-Host "4. Reinicia PowerShell completamente después de instalar" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O si ya está instalado:" -ForegroundColor Yellow
    Write-Host "- Reinicia PowerShell completamente" -ForegroundColor Yellow
    Write-Host "- Verifica en Configuración de Windows > Variables de entorno" -ForegroundColor Yellow
} else {
    $firstPath = $foundPaths[0]
    Write-Host "✅ Usando Node.js de: $firstPath" -ForegroundColor Green
    Write-Host ""
    
    # Agregar al PATH temporalmente
    $env:PATH = "$firstPath;$env:PATH"
    
    # Verificar versiones
    Write-Host "📦 Versiones:" -ForegroundColor Cyan
    $nodeVersion = & "$firstPath\node.exe" --version
    $npmVersion = & "$firstPath\npm.cmd" --version
    Write-Host "   Node.js: $nodeVersion" -ForegroundColor Gray
    Write-Host "   npm: $npmVersion" -ForegroundColor Gray
    Write-Host ""
    
    # Verificar si estamos en el directorio correcto
    $currentDir = Get-Location
    if ($currentDir.Path -notlike "*AlmonteIntranet*") {
        Write-Host "⚠️  No estás en el directorio del proyecto" -ForegroundColor Yellow
        Write-Host "   Ejecuta: cd C:\Users\mati\Desktop\intranet\AlmonteIntranet" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Directorio correcto: $currentDir" -ForegroundColor Green
        Write-Host ""
        
        # Instalar dependencias si es necesario
        if (-not (Test-Path "node_modules")) {
            Write-Host "📥 Instalando dependencias..." -ForegroundColor Cyan
            & "$firstPath\npm.cmd" install
        } else {
            Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "🚀 Para iniciar el servidor, ejecuta:" -ForegroundColor Cyan
        Write-Host "   & `"$firstPath\npm.cmd`" run dev" -ForegroundColor Yellow
    }
}
