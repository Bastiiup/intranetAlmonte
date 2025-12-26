import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/logging'
import { logStorage } from '@/lib/logging/logStorage'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs/logging-logs
 * Endpoint para obtener información de debug sobre el sistema de logging
 * Simula lo que hace logActivity para verificar que las cookies estén disponibles
 */
export async function GET(request: NextRequest) {
  // SOLO obtener logs reales del almacenamiento
  // Buscar tanto [LOGGING] como [Strapi Client POST] para ver el flujo completo
  const realLogs = [
    ...logStorage.getLogsByPrefix('[LOGGING]'),
    ...logStorage.getLogsByPrefix('[Strapi Client POST]'),
  ]
  
  // Si hay logs reales, usarlos
  if (realLogs.length > 0) {
    // Ordenar por timestamp
    realLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    const formattedLogs = realLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString('es-CL')
      return `[${timestamp}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data, null, 2) : ''}`
    })
    
    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      source: 'real',
      count: realLogs.length,
      message: `Logs reales capturados del sistema de logging (${realLogs.length} logs)`,
    })
  }
  
  // Si no hay logs reales, retornar vacío con mensaje claro
  return NextResponse.json({
    success: true,
    logs: [],
    source: 'real',
    count: 0,
    message: 'No hay logs reales aún. Realiza una acción (edita un producto, ve una página, etc.) para generar logs reales.',
  })
}

