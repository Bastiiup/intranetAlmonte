#!/bin/bash
# Script para probar el endpoint de logs desde bash/linux

echo "🔍 Probando endpoint /api/logs/usuarios..."

# Probar el endpoint
response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/logs/usuarios)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "✅ Status Code: $http_code"
echo "📊 Respuesta:"
echo "$body" | jq '.'

if [ "$http_code" -eq 200 ]; then
    success=$(echo "$body" | jq -r '.success')
    if [ "$success" = "true" ]; then
        count=$(echo "$body" | jq '.data | length')
        echo ""
        echo "✅ Éxito! Usuarios encontrados: $count"
        if [ "$count" -gt 0 ]; then
            echo ""
            echo "📋 Primer usuario:"
            echo "$body" | jq '.data[0]'
        fi
    else
        error=$(echo "$body" | jq -r '.error')
        echo "❌ Error: $error"
    fi
else
    echo "❌ Error HTTP: $http_code"
    echo "💡 Asegúrate de que el servidor esté corriendo en http://localhost:3000"
fi


