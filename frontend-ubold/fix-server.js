#!/usr/bin/env node

// Script post-build para modificar el servidor standalone de Next.js
// Asegura que escuche en 0.0.0.0 y copia archivos estáticos necesarios

const fs = require('fs')
const path = require('path')

// Manejo de errores mejorado
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason)
  process.exit(1)
})

const serverPath = path.join(__dirname, '.next/standalone/server.js')

if (!fs.existsSync(serverPath)) {
  console.error('Servidor standalone no encontrado. Asegúrate de ejecutar npm run build primero.')
  process.exit(1)
}

// 1. Modificar el servidor para escuchar en 0.0.0.0
let serverCode = fs.readFileSync(serverPath, 'utf8')
const originalCode = serverCode

console.log('📝 Modificando servidor standalone...')

// Buscar y reemplazar cualquier patrón de listen() para forzar 0.0.0.0
// Patrón 1: .listen(port) -> .listen(port, '0.0.0.0')
serverCode = serverCode.replace(/\.listen\((\d+)\)/g, ".listen($1, '0.0.0.0')")

// Patrón 2: .listen(port, hostname) -> .listen(port, '0.0.0.0')
serverCode = serverCode.replace(/\.listen\((\d+),\s*['"][^'"]+['"]\)/g, ".listen($1, '0.0.0.0')")

// Patrón 3: .listen(parseInt(process.env.PORT || ...)) -> .listen(parseInt(...), '0.0.0.0')
serverCode = serverCode.replace(/\.listen\(parseInt\(process\.env\.PORT[^)]+\)\)/g, (match) => {
  return match.replace(/\)$/, ", '0.0.0.0')")
})

// Patrón 4: .listen(portVariable) -> .listen(portVariable, '0.0.0.0')
serverCode = serverCode.replace(/\.listen\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)(?!\s*,\s*['"]0\.0\.0\.0['"])/g, ".listen($1, '0.0.0.0')")

// Patrón 5: Reemplazar cualquier hostname que no sea 0.0.0.0 en strings
serverCode = serverCode.replace(/['"]localhost['"]/g, "'0.0.0.0'")
serverCode = serverCode.replace(/['"]127\.0\.0\.1['"]/g, "'0.0.0.0'")

// Patrón 6: Reemplazar hostnames de Docker (12 caracteres hex) con 0.0.0.0
serverCode = serverCode.replace(/['"][a-f0-9]{12}['"]/g, "'0.0.0.0'")

// Patrón 7: Asegurar que cualquier asignación de hostname sea 0.0.0.0
serverCode = serverCode.replace(/(const|let|var)\s+hostname\s*=\s*['"][^'"]+['"]/g, "const hostname = '0.0.0.0'")
serverCode = serverCode.replace(/(const|let|var)\s+host\s*=\s*['"][^'"]+['"]/g, "const host = '0.0.0.0'")

// Patrón 8: Buscar y reemplazar en objetos de opciones { host: ... }
serverCode = serverCode.replace(/host:\s*['"][^'"]+['"]/g, "host: '0.0.0.0'")
serverCode = serverCode.replace(/hostname:\s*['"][^'"]+['"]/g, "hostname: '0.0.0.0'")

if (serverCode !== originalCode) {
  fs.writeFileSync(serverPath, serverCode)
  console.log('✓ Servidor standalone modificado para escuchar en 0.0.0.0')
} else {
  console.log('ℹ No se encontraron cambios necesarios en el servidor standalone')
}

// 2. Copiar archivos estáticos necesarios
const copyRecursiveSync = (src, dest) => {
  const exists = fs.existsSync(src)
  const stats = exists && fs.statSync(src)
  const isDirectory = exists && stats.isDirectory()
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      )
    })
  } else {
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true })
    }
    fs.copyFileSync(src, dest)
  }
}

// Copiar .next/static a .next/standalone/.next/static
const staticSrc = path.join(__dirname, '.next/static')
const staticDest = path.join(__dirname, '.next/standalone/.next/static')

if (fs.existsSync(staticSrc)) {
  copyRecursiveSync(staticSrc, staticDest)
  console.log('✓ Archivos estáticos copiados a .next/standalone/.next/static')
} else {
  console.log('⚠ No se encontró .next/static')
}

// Copiar public a .next/standalone/public
const publicSrc = path.join(__dirname, 'public')
const publicDest = path.join(__dirname, '.next/standalone/public')

if (fs.existsSync(publicSrc)) {
  copyRecursiveSync(publicSrc, publicDest)
  console.log('✓ Carpeta public copiada a .next/standalone/public')
} else {
  console.log('⚠ No se encontró la carpeta public')
}
