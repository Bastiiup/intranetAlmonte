/**
 * API Route para ver logs de debug del procesamiento de PDFs
 * GET /api/crm/listas/debug-logs
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Almacenar logs en memoria (solo para desarrollo)
const logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = []

// Interceptar console.log para capturar logs relacionados con procesamiento de PDFs
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  const addLog = (level: string, ...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    
    // Solo capturar logs relacionados con procesamiento de PDFs y importación masiva
    if (message.includes('[Procesar PDF]') || 
        message.includes('[API /crm/listas') ||
        message.includes('[Importación Masiva IA]') ||
        message.includes('Buscando producto') ||
        message.includes('Encontrado') ||
        message.includes('NO encontrado') ||
        message.includes('similitud') ||
        message.includes('Validando productos') ||
        message.includes('WooCommerce') ||
        message.includes('Gemini') ||
        message.includes('productos extraídos') ||
        message.includes('Error en') ||
        message.includes('Error detallado')) {
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        data: args.length > 1 ? args.slice(1) : undefined
      })
      
      // Mantener solo los últimos 200 logs
      if (logs.length > 200) {
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const filter = searchParams.get('filter') || ''

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
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener logs',
      },
      { status: 500 }
    )
  }
}
