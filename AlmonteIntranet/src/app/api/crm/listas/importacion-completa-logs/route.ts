import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Almacenar logs en memoria (igual que debug-logs)
const logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = []

// Interceptar console.log para capturar logs relacionados con importación completa
if (typeof process !== 'undefined') {
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  const addLog = (level: string, ...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    
    // Solo capturar logs relacionados con importación completa
    if (message.includes('[Importación Completa]')) {
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        data: args.length > 1 ? args.slice(1) : undefined
      })
      
      // Mantener solo los últimos 500 logs
      if (logs.length > 500) {
        logs.shift()
      }
    }
  }

  console.log = (...args: any[]) => {
    originalLog(...args)
    addLog('log', ...args)
  }

  console.error = (...args: any[]) => {
    originalError(...args)
    addLog('error', ...args)
  }

  console.warn = (...args: any[]) => {
    originalWarn(...args)
    addLog('warn', ...args)
  }
}

/**
 * POST /api/crm/listas/importacion-completa-logs
 * Recibe logs del cliente y los almacena
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, message, data } = body

    // Log para debugging
    console.log('[API /importacion-completa-logs POST] Recibido:', { level, messageLength: message?.length, hasData: !!data })

    if (level && message && message.includes('[Importación Completa]')) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
      }
      
      logs.push(logEntry)
      
      // Mantener solo los últimos 500 logs
      if (logs.length > 500) {
        logs.shift()
      }

      console.log('[API /importacion-completa-logs POST] Log almacenado. Total logs:', logs.length)
      return NextResponse.json({ success: true, stored: true, totalLogs: logs.length }, { status: 200 })
    }

    console.warn('[API /importacion-completa-logs POST] Log rechazado:', { 
      hasLevel: !!level, 
      hasMessage: !!message, 
      includesTag: message?.includes('[Importación Completa]') 
    })
    return NextResponse.json({ success: false, error: 'level y message son requeridos, y message debe incluir [Importación Completa]' }, { status: 400 })
  } catch (error: any) {
    console.error('[API /importacion-completa-logs POST] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/crm/listas/importacion-completa-logs
 * Obtiene los logs de la importación completa (igual que debug-logs)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const filter = searchParams.get('filter') || ''

    console.log('[API /importacion-completa-logs GET] Solicitud recibida:', { limit, filter, totalLogs: logs.length })

    let filteredLogs = logs

    // Filtrar por término de búsqueda si se proporciona
    if (filter) {
      filteredLogs = logs.filter(log => 
        log.message.toLowerCase().includes(filter.toLowerCase())
      )
    }

    // Ordenar por timestamp (más recientes primero) y limitar
    const recentLogs = filteredLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    console.log('[API /importacion-completa-logs GET] Devolviendo:', { 
      total: logs.length, 
      filtered: filteredLogs.length, 
      showing: recentLogs.length 
    })

    return NextResponse.json({
      success: true,
      data: {
        logs: recentLogs,
        total: logs.length,
        filtered: filteredLogs.length,
        showing: recentLogs.length,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[API /importacion-completa-logs GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener logs',
      },
      { status: 500 }
    )
  }
}
