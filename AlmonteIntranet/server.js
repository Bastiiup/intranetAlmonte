#!/usr/bin/env node

// Script para iniciar Next.js en modo standalone con configuración para Railway
// Configura el hostname para que escuche en todas las interfaces de red

// Establecer variables de entorno ANTES de cargar cualquier módulo
const port = parseInt(process.env.PORT || '3000', 10)

// Forzar 0.0.0.0 para que escuche en todas las interfaces (requerido por Railway)
process.env.HOSTNAME = '0.0.0.0'
process.env.PORT = String(port)
process.env.NODE_ENV = process.env.NODE_ENV || 'production'

console.log(`🚀 Iniciando servidor Next.js en modo standalone...`)
console.log(`📍 Hostname: 0.0.0.0`)
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
  console.log(`🌐 Servidor disponible en http://0.0.0.0:${port}`)
  console.log(`🏥 Healthcheck disponible en http://0.0.0.0:${port}/api/health`)
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
  console.log('Asegúrate de que el build se haya completado correctamente')
  process.exit(1)
}

