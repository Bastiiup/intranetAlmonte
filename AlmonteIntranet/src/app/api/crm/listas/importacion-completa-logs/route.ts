import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Almacenar logs en memoria (igual que debug-logs)
// IMPORTANTE: Este array se comparte entre todas las requests
const logs: Array<{ timestamp: string; level: string; message: string; data?: any; source?: 'client' | 'server' }> = []
const serverLogs: Array<{ timestamp: string; level: string; message: string; data?: any }> = []

// Interceptar console.log del servidor para capturar todos los logs
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Interceptar console.log, console.error, console.warn del servidor
console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')
  
  // Solo capturar logs relacionados con importación, cursos, PDFs, o versiones_materiales
  const shouldCapture = 
    message.includes('[Importación Completa]') ||
    message.includes('[API /crm/cursos') ||
    message.includes('[API /crm/listas') ||
    message.includes('versiones_materiales') ||
    message.includes('PDF') ||
    message.includes('pdf') ||
    message.includes('📤') ||
    message.includes('📦') ||
    message.includes('✅') ||
    message.includes('❌') ||
    message.includes('🔍') ||
    message.includes('📋') ||
    message.includes('📄')
  
  if (shouldCapture) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'log',
      message: message.substring(0, 2000), // Limitar tamaño
      data: args.length > 1 ? args.slice(1) : undefined,
      source: 'server' as const,
    }
    
    serverLogs.push(logEntry)
    
    // Mantener solo los últimos 500 logs del servidor
    if (serverLogs.length > 500) {
      serverLogs.shift()
    }
  }
  
  // Llamar al console.log original
  originalConsoleLog.apply(console, args)
}

console.error = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')
  
  const shouldCapture = 
    message.includes('[Importación Completa]') ||
    message.includes('[API /crm/cursos') ||
    message.includes('[API /crm/listas') ||
    message.includes('versiones_materiales') ||
    message.includes('PDF') ||
    message.includes('pdf') ||
    message.includes('Error')
  
  if (shouldCapture) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: message.substring(0, 2000),
      data: args.length > 1 ? args.slice(1) : undefined,
      source: 'server' as const,
    }
    
    serverLogs.push(logEntry)
    
    if (serverLogs.length > 500) {
      serverLogs.shift()
    }
  }
  
  originalConsoleError.apply(console, args)
}

console.warn = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')
  
  const shouldCapture = 
    message.includes('[Importación Completa]') ||
    message.includes('[API /crm/cursos') ||
    message.includes('[API /crm/listas') ||
    message.includes('versiones_materiales') ||
    message.includes('PDF') ||
    message.includes('pdf') ||
    message.includes('⚠️')
  
  if (shouldCapture) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: message.substring(0, 2000),
      data: args.length > 1 ? args.slice(1) : undefined,
      source: 'server' as const,
    }
    
    serverLogs.push(logEntry)
    
    if (serverLogs.length > 500) {
      serverLogs.shift()
    }
  }
  
  originalConsoleWarn.apply(console, args)
}

// NO interceptar console.log aquí porque esto es código del servidor
// Los logs vienen del cliente a través de POST requests

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

    if (level && message) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
        source: 'client' as const,
      }
      
      logs.push(logEntry)
      
      // Mantener solo los últimos 500 logs
      if (logs.length > 500) {
        logs.shift()
      }

      console.log('[API /importacion-completa-logs POST] Log almacenado. Total logs cliente:', logs.length)
      return NextResponse.json({ success: true, stored: true, totalLogs: logs.length }, { status: 200 })
    }

    console.warn('[API /importacion-completa-logs POST] Log rechazado:', { 
      hasLevel: !!level, 
      hasMessage: !!message
    })
    return NextResponse.json({ success: false, error: 'level y message son requeridos' }, { status: 400 })
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

    // Combinar logs del cliente y del servidor
    const allLogs = [
      ...logs.map(log => ({ ...log, source: 'client' as const })),
      ...serverLogs.map(log => ({ ...log, source: 'server' as const })),
    ]

    // Filtrar por término de búsqueda si se proporciona
    if (filter) {
      filteredLogs = allLogs.filter(log => 
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(filter.toLowerCase()))
      )
    } else {
      filteredLogs = allLogs
    }

    // Ordenar por timestamp (más recientes primero) y limitar
    const recentLogs = filteredLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    console.log('[API /importacion-completa-logs GET] Devolviendo:', { 
      totalCliente: logs.length,
      totalServidor: serverLogs.length,
      total: allLogs.length, 
      filtered: filteredLogs.length, 
      showing: recentLogs.length 
    })

    return NextResponse.json({
      success: true,
      data: {
        logs: recentLogs,
        total: allLogs.length,
        totalCliente: logs.length,
        totalServidor: serverLogs.length,
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

/**
 * DELETE /api/crm/listas/importacion-completa-logs
 * Limpia todos los logs del servidor
 */
export async function DELETE(request: NextRequest) {
  try {
    const logsClienteCount = logs.length
    const logsServidorCount = serverLogs.length
    const totalCount = logsClienteCount + logsServidorCount
    
    logs.length = 0 // Limpiar el array de logs del cliente
    serverLogs.length = 0 // Limpiar el array de logs del servidor
    
    console.log(`[API /importacion-completa-logs DELETE] Logs limpiados: ${totalCount} logs eliminados (${logsClienteCount} cliente, ${logsServidorCount} servidor)`)
    
    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${totalCount} logs (${logsClienteCount} cliente, ${logsServidorCount} servidor)`,
      totalLogs: logs.length + serverLogs.length,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /importacion-completa-logs DELETE] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al limpiar logs',
      },
      { status: 500 }
    )
  }
}
