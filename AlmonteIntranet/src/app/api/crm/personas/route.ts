import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface PersonaAttributes {
  rut?: string
  nombres?: string
  primer_apellido?: string
  segundo_apellido?: string
  nombre_completo?: string
  genero?: string
  cumpleagno?: string
  activo?: boolean
}

/**
 * GET /api/crm/personas
 * Obtiene el listado de personas desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - search: Búsqueda por nombre_completo o rut
 * - activo: Filtro por estado activo (true/false)
 * - origen: Filtro por origen (mineduc, csv, manual, crm, web, otro)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pagination[pageSize]') || searchParams.get('pageSize') || '25'
    const search = searchParams.get('search') || ''
    const activo = searchParams.get('activo') || ''
    const origen = searchParams.get('origen') || ''

    // Construir URL con paginación y ordenamiento
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'nombre_completo:asc',
    })

    // Agregar búsqueda por nombre completo o RUT si existe
    if (search) {
      // Intentar primero como RUT (formato exacto)
      if (search.match(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/)) {
        params.append('filters[rut][$eq]', search)
      } else {
        // Si no es RUT, buscar por nombre completo
        params.append('filters[nombre_completo][$containsi]', search)
      }
    }

    // Agregar filtro por activo
    if (activo !== '') {
      const activoBool = activo === 'true' || activo === '1'
      params.append('filters[activo][$eq]', activoBool.toString())
    }

    // Agregar filtro por origen
    if (origen) {
      params.append('filters[origen][$eq]', origen)
    }

    const url = `/api/personas?${params.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<PersonaAttributes>>>(
      url
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/personas] Error al obtener personas:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener personas',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

