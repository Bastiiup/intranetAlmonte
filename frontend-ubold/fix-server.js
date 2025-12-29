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

// En Next.js 16, el servidor standalone usa createServer de Node.js
// Necesitamos asegurar que siempre escuche en 0.0.0.0

// Reemplazar cualquier hostname que no sea 0.0.0.0 en listen()
serverCode = serverCode.replace(/\.listen\(([^,]+),\s*['"](?!0\.0\.0\.0)([^'"]+)['"]/g, ".listen($1, '0.0.0.0'")

// Si listen() solo tiene el puerto, agregar 0.0.0.0
serverCode = serverCode.replace(/\.listen\((\d+)\)(?!\s*[,)])/g, ".listen($1, '0.0.0.0')")

// Reemplazar localhost y 127.0.0.1 con 0.0.0.0 en cualquier contexto
serverCode = serverCode.replace(/['"]localhost['"]/g, "'0.0.0.0'")
serverCode = serverCode.replace(/['"]127\.0\.0\.1['"]/g, "'0.0.0.0'")

// Reemplazar cualquier hostname de Docker interno (como bda9040e7428) con 0.0.0.0
serverCode = serverCode.replace(/['"][a-f0-9]{12}['"]/g, "'0.0.0.0'")

// Si hay una llamada a listen con una variable, asegurar que tenga hostname
serverCode = serverCode.replace(/\.listen\((\w+)\)(?!\s*,\s*['"]0\.0\.0\.0['"])/g, ".listen($1, '0.0.0.0')")

// Asegurar que process.env.PORT se use correctamente con 0.0.0.0
serverCode = serverCode.replace(/\.listen\(parseInt\(process\.env\.PORT[^)]+\)\)(?!\s*,\s*['"]0\.0\.0\.0['"])/g, (match) => {
  return match.replace(/\)$/, ", '0.0.0.0')")
})

// Buscar patrones específicos de Next.js donde se configura el hostname
// Next.js puede usar hostname en variables, asegurémonos de que sea 0.0.0.0
serverCode = serverCode.replace(/(const|let|var)\s+hostname\s*=\s*[^;]+;/g, (match) => {
  if (!match.includes('0.0.0.0')) {
    return "const hostname = '0.0.0.0';"
  }
  return match
})

if (serverCode !== originalCode) {
  fs.writeFileSync(serverPath, serverCode)
  console.log('✓ Servidor standalone modificado para escuchar en 0.0.0.0')
  console.log('✓ Variables de entorno PORT y HOSTNAME serán respetadas')
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

