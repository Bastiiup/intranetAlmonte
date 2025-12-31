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
 * Obtiene el listado de personas desde Strapi
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pagination[pageSize]') || searchParams.get('pageSize') || '10'
    const search = searchParams.get('search') || searchParams.get('filters[nombre_completo][$containsi]') || ''
    const rut = searchParams.get('filters[rut][$eq]') || ''

    // Construir URL con paginación y ordenamiento
    let url = `/api/personas?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=createdAt:desc`
    
    // Agregar búsqueda por nombre completo si existe
    if (search) {
      url += `&filters[nombre_completo][$containsi]=${encodeURIComponent(search)}`
    }
    
    // Agregar filtro de RUT si existe
    if (rut) {
      url += `&filters[rut][$eq]=${encodeURIComponent(rut)}`
    }

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

