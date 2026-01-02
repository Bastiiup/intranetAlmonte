import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/logs
 * Obtiene los logs de actividades del sistema
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')
    const sort = searchParams.get('sort') || 'fecha:desc'

    console.log('[API /logs] Obteniendo logs:', { page, pageSize, sort })

    // Construir query de Strapi
    // El Content Type "Log de Actividades" en Strapi se convierte a "activity-logs" en la API
    // Usar populate selectivo para usuario (relación con Colaboradores)
    const sortField = sort.split(':')[0] || 'fecha'
    const sortOrder = sort.split(':')[1] || 'desc'
    
    const response = await strapiClient.get<any>(
      `/api/activity-logs?populate[usuario][populate]=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sortField}:${sortOrder}`
    )

    let items: any[] = []
    let pagination: any = {}

    if (Array.isArray(response)) {
      items = response
    } else if (response.data) {
      if (Array.isArray(response.data)) {
        items = response.data
      } else {
        items = [response.data]
      }
      pagination = response.pagination || {}
    } else {
      items = [response]
    }

    // Log de depuración: ver estructura del primer log
    if (items.length > 0) {
      console.log('[API /logs] 🔍 Estructura del primer log:', JSON.stringify(items[0], null, 2).substring(0, 500))
    }

    console.log('[API /logs] ✅ Logs obtenidos:', items.length)

    return NextResponse.json({
      success: true,
      data: items,
      pagination,
    })
  } catch (error: any) {
    console.error('[API /logs] ❌ Error:', error.message)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener logs',
        data: [],
      },
      { status: error.status || 500 }
    )
  }
}

