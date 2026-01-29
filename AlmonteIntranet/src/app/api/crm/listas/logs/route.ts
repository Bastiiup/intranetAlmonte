import { NextRequest, NextResponse } from 'next/server'
import { logStorage } from '@/lib/logging/logStorage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/crm/listas/logs
 * Obtiene logs relacionados con listas de útiles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const filter = searchParams.get('filter') || 'all'

    // Obtener todos los logs
    const allLogs = logStorage.getLogs() // Obtener todos los logs

    // Filtrar logs relacionados con listas
    const listasLogs = allLogs.filter((log: any) => {
      const message = (log.message || '').toLowerCase()
      
      // Filtrar por palabras clave relacionadas con listas
      const keywords = [
        'listas',
        'por-colegio',
        'versiones_materiales',
        'curso',
        'colegio',
        '/crm/listas',
        'importacion-completa',
        'pdf',
        'materiales',
        '[api /crm/listas',
        '[api /crm/listas/por-colegio',
      ]

      return keywords.some(keyword => message.includes(keyword))
    })

    // Ordenar por timestamp descendente (más reciente primero)
    listasLogs.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Limitar resultados
    const limitedLogs = listasLogs.slice(0, limit)

    return NextResponse.json({
      success: true,
      logs: limitedLogs.map((log: any) => ({
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
        source: log.message.match(/\[([^\]]+)\]/)?.[1] || 'unknown',
      })),
      total: listasLogs.length,
      filtered: filter !== 'all',
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error: any) {
    console.error('[API /crm/listas/logs GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener logs',
        logs: [],
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
