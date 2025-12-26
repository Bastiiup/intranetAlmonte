#!/usr/bin/env node

// Script para iniciar Next.js en modo standalone con configuración para Railway
// Configura el hostname para que escuche en todas las interfaces de red

// Establecer variables de entorno antes de cargar el servidor
const port = process.env.PORT || '3000'
const hostname = process.env.HOSTNAME || '0.0.0.0'

process.env.HOSTNAME = hostname
process.env.PORT = port
process.env.NODE_ENV = process.env.NODE_ENV || 'production'

console.log(`🚀 Iniciando servidor Next.js en modo standalone...`)
console.log(`📍 Hostname: ${hostname}`)
console.log(`🔌 Puerto: ${port}`)

// El servidor standalone de Next.js debería respetar estas variables
// Si no funciona, necesitaremos modificar el servidor después del build
try {
  const server = require('./.next/standalone/server.js')
  
  // Si el servidor tiene un método para iniciar, usarlo
  if (typeof server === 'function') {
    server()
  } else if (server && typeof server.listen === 'function') {
    // Si el servidor tiene un método listen, usarlo
    server.listen(port, hostname, () => {
      console.log(`✅ Servidor escuchando en ${hostname}:${port}`)
    })
  } else {
    // El servidor standalone de Next.js se inicia automáticamente
    console.log('✅ Servidor standalone cargado correctamente')
  }
} catch (error) {
  console.error('❌ Error al cargar el servidor standalone:', error)
  console.error('Stack:', error.stack)
  console.log('Asegúrate de que el build se haya completado correctamente')
  process.exit(1)
}

