#!/usr/bin/env node

// Script para iniciar Next.js en modo standalone con configuración para Railway
// Configura el hostname y puerto para que Railway pueda enrutar el tráfico

// Establecer hostname y puerto antes de cargar el servidor standalone
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'
process.env.PORT = process.env.PORT || '8080'

// Cargar y ejecutar el servidor standalone generado por Next.js
require('./.next/standalone/server.js')

