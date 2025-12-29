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

<<<<<<< HEAD
=======
console.log('📝 Modificando servidor standalone...')

>>>>>>> origin/mati-integracion
// Reemplazar localhost y 127.0.0.1 con 0.0.0.0
serverCode = serverCode.replace(/localhost/g, '0.0.0.0')
serverCode = serverCode.replace(/127\.0\.0\.1/g, '0.0.0.0')

// Buscar y reemplazar cualquier IP específica en listen() con 0.0.0.0
serverCode = serverCode.replace(/\.listen\(([^,]+),\s*['"](?:localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)['"]/g, ".listen($1, '0.0.0.0'")
serverCode = serverCode.replace(/\.listen\((\w+)\)(?!\s*,\s*(?:['"]0\.0\.0\.0['"]|function|\([^)]*\)\s*=>))/g, ".listen($1, '0.0.0.0')")
serverCode = serverCode.replace(/\.listen\((\w+),\s*(function|\([^)]*\)\s*=>)/g, ".listen($1, '0.0.0.0', $2")

<<<<<<< HEAD
if (serverCode !== originalCode) {
  fs.writeFileSync(serverPath, serverCode)
  console.log('✓ Servidor standalone modificado para escuchar en 0.0.0.0')
=======
// Asegurar que se use process.env.PORT si está disponible
// Buscar patrones como .listen(3000) o .listen(port) y reemplazarlos
if (serverCode.includes('.listen(')) {
  // Si hay una llamada a listen con un número fijo, intentar reemplazarla
  serverCode = serverCode.replace(/\.listen\((\d+)\)/g, (match, port) => {
    return `.listen(parseInt(process.env.PORT || '${port}', 10), '0.0.0.0')`
  })
}

if (serverCode !== originalCode) {
  fs.writeFileSync(serverPath, serverCode)
  console.log('✓ Servidor standalone modificado para escuchar en 0.0.0.0')
  console.log('✓ Variables de entorno PORT y HOSTNAME serán respetadas')
>>>>>>> origin/mati-integracion
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

