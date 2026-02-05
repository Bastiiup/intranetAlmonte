/**
 * API Route para consultar historial de cambios de precios
 * GET /api/inventario/historial-precios?libro=documentId&page=1&pageSize=20
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const libroId = searchParams.get('libro')
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '20'

    // Construir parámetros de query
    // Simplificado: usar populate=* para evitar errores de campos específicos
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'fecha_cambio:desc',
      'populate': '*',
    })

    // Filtrar por libro si se especifica
    if (libroId) {
      params.append('filters[libro][documentId][$eq]', libroId)
    }

    console.log('[API Historial Precios] Consultando:', params.toString())

    const response = await strapiClient.get<any>(`/api/historial-precios?${params.toString()}`)

    // Normalizar respuesta
    let historial: any[] = []
    let meta: any = {}

    if (Array.isArray(response)) {
      historial = response
    } else if (response.data && Array.isArray(response.data)) {
      historial = response.data
      meta = response.meta || {}
    } else if (response.data) {
      historial = [response.data]
    }

    console.log('[API Historial Precios] Registros encontrados:', historial.length)

    return NextResponse.json({
      success: true,
      data: historial,
      meta: {
        pagination: meta.pagination || {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: historial.length,
        }
      }
    })
  } catch (error: any) {
    console.error('[API Historial Precios] Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener historial de precios',
      data: [],
    }, { status: error.status || 500 })
  }
}

