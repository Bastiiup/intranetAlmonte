import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColegioAttributes {
  nombre?: string
  rut?: string
  direccion?: string
  comuna?: string
  region?: string
  telefono?: string
  email?: string
  activo?: boolean
}

/**
 * GET /api/crm/colegios
 * Obtiene el listado de colegios desde Strapi
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pagination[pageSize]') || searchParams.get('pageSize') || '10'
    const search = searchParams.get('search') || searchParams.get('filters[nombre][$containsi]') || ''

    // Construir URL con paginación y ordenamiento
    let url = `/api/colegios?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=createdAt:desc`
    
    // Agregar búsqueda por nombre si existe
    if (search) {
      url += `&filters[nombre][$containsi]=${encodeURIComponent(search)}`
    }

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
      url
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios] Error al obtener colegios:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colegios',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

