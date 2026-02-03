/**
 * Utilidades para manejo de fechas con zona horaria de Chile
 */

/**
 * Obtiene la fecha actual en formato ISO con zona horaria de Chile
 */
export function obtenerFechaChileISO(): string {
  const fecha = new Date()
  // Convertir a zona horaria de Chile (America/Santiago)
  const fechaChile = new Date(fecha.toLocaleString('en-US', { 
    timeZone: 'America/Santiago' 
  }))
  return fechaChile.toISOString()
}

/**
 * Obtiene la fecha actual formateada para Chile
 */
export function obtenerFechaChile(): string {
  return new Date().toLocaleString('es-CL', { 
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Formatea una fecha ISO a formato legible en Chile
 */
export function formatearFechaChile(fechaISO: string): string {
  const fecha = new Date(fechaISO)
  return fecha.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
