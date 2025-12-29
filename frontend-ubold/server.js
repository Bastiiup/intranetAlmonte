#!/usr/bin/env node

// Script para iniciar Next.js en modo standalone con configuración para Railway
// Configura el hostname para que escuche en todas las interfaces de red

<<<<<<< HEAD
// Establecer variables de entorno antes de cargar el servidor
process.env.HOSTNAME = '0.0.0.0'
process.env.PORT = process.env.PORT || '8080'
process.env.NODE_ENV = process.env.NODE_ENV || 'production'

console.log(`🚀 Iniciando servidor Next.js en modo standalone...`)
console.log(`📍 Hostname: ${process.env.HOSTNAME}`)
console.log(`🔌 Puerto: ${process.env.PORT}`)

// El servidor standalone de Next.js debería respetar estas variables
// Si no funciona, necesitaremos modificar el servidor después del build
try {
  require('./.next/standalone/server.js')
  console.log('✅ Servidor standalone cargado correctamente')
} catch (error) {
  console.error('❌ Error al cargar el servidor standalone:', error)
=======
// Establecer variables de entorno ANTES de cargar cualquier módulo
const port = parseInt(process.env.PORT || '3000', 10)
const hostname = process.env.HOSTNAME || '0.0.0.0'

process.env.HOSTNAME = hostname
process.env.PORT = String(port)
process.env.NODE_ENV = process.env.NODE_ENV || 'production'

console.log(`🚀 Iniciando servidor Next.js en modo standalone...`)
console.log(`📍 Hostname: ${hostname}`)
console.log(`🔌 Puerto: ${port}`)
console.log(`📦 NODE_ENV: ${process.env.NODE_ENV}`)

// El servidor standalone de Next.js se inicia automáticamente al requerirlo
// y respeta las variables de entorno PORT y HOSTNAME
try {
  const path = require('path')
  const fs = require('fs')
  const serverPath = path.join(__dirname, '.next/standalone/server.js')
  
  // Verificar que el servidor standalone existe
  if (!fs.existsSync(serverPath)) {
    console.error(`❌ Servidor standalone no encontrado en: ${serverPath}`)
    console.error('Asegúrate de que el build se haya completado correctamente')
    console.error('Ejecuta: npm run build')
    process.exit(1)
  }
  
  console.log(`📄 Cargando servidor desde: ${serverPath}`)
  
  // Cargar el servidor standalone desde la ruta absoluta
  // Esto evita problemas con módulos relativos
  require(serverPath)
  
  console.log('✅ Servidor standalone cargado e iniciado')
  console.log(`🌐 Servidor disponible en http://${hostname}:${port}`)
  console.log(`🏥 Healthcheck disponible en http://${hostname}:${port}/api/health`)
  console.log(`⏳ Esperando conexiones...`)
  
  // Mantener el proceso vivo
  process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...')
    process.exit(0)
  })
  
  process.on('SIGINT', () => {
    console.log('SIGINT recibido, cerrando servidor...')
    process.exit(0)
  })
  
  // Manejar errores no capturados
  process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error)
    process.exit(1)
  })
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason)
    process.exit(1)
  })
  
} catch (error) {
  console.error('❌ Error al iniciar el servidor standalone:', error)
  console.error('Stack:', error.stack)
>>>>>>> origin/mati-integracion
  console.log('Asegúrate de que el build se haya completado correctamente')
  process.exit(1)
}

