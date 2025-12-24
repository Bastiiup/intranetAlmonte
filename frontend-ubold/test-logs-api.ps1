# Script para probar el endpoint de logs desde PowerShell

Write-Host "🔍 Probando endpoint /api/logs/usuarios..." -ForegroundColor Cyan

try {
    # Probar el endpoint (puerto 3001 si 3000 está ocupado)
    $port = 3001
    $uri = "http://localhost:$port/api/logs/usuarios"
    Write-Host "🔗 Probando: $uri" -ForegroundColor Cyan
    
    $response = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing
    
    Write-Host "✅ Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📊 Respuesta:" -ForegroundColor Yellow
    
    $data = $response.Content | ConvertFrom-Json
    $data | ConvertTo-Json -Depth 10
    
    if ($data.success) {
        Write-Host "`n✅ Éxito! Usuarios encontrados: $($data.data.Count)" -ForegroundColor Green
        if ($data.data.Count -gt 0) {
            Write-Host "`n📋 Primer usuario:" -ForegroundColor Cyan
            $data.data[0] | ConvertTo-Json -Depth 5
        }
    } else {
        Write-Host "❌ Error: $($data.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error al conectar:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`n💡 Asegúrate de que el servidor esté corriendo en http://localhost:3000" -ForegroundColor Yellow
}

