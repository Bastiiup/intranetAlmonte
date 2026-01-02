import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColegioAttributes {
  colegio_nombre?: string
  rbd?: number
  estado?: string
  dependencia?: string
  region?: string
  zona?: string
  comuna?: any
  telefonos?: any[]
  emails?: any[]
  direcciones?: any[]
  origen?: string
}

/**
 * GET /api/crm/colegios
 * Obtiene el listado de colegios desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - search: Búsqueda por colegio_nombre
 * - estado: Filtro por estado (Por Verificar, Verificado, Aprobado)
 * - region: Filtro por región
 * - comuna: Filtro por comuna (ID de relación)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pagination[pageSize]') || searchParams.get('pageSize') || '25'
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const region = searchParams.get('region') || ''
    const comuna = searchParams.get('comuna') || ''

    // Construir URL con paginación y ordenamiento
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'colegio_nombre:asc',
    })

    // Populate para relaciones (Strapi v4 syntax)
    params.append('populate[comuna]', 'true')
    params.append('populate[telefonos]', 'true')
    params.append('populate[emails]', 'true')
    params.append('populate[cartera_asignaciones][populate][ejecutivo]', 'true')

    // Agregar búsqueda por nombre si existe
    if (search) {
      params.append('filters[colegio_nombre][$containsi]', search)
    }

    // Agregar filtro por estado
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }

    // Agregar filtro por región
    if (region) {
      params.append('filters[region][$eq]', region)
    }

    // Agregar filtro por comuna (si es relación)
    if (comuna) {
      params.append('filters[comuna][id][$eq]', comuna)
    }

    const url = `/api/colegios?${params.toString()}`
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

/**
 * POST /api/crm/colegios
 * Crea un nuevo colegio
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.colegio_nombre || !body.colegio_nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del colegio es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const colegioData: any = {
      data: {
        colegio_nombre: body.colegio_nombre.trim(),
        ...(body.rbd && { rbd: parseInt(body.rbd) }),
        ...(body.estado && { estado: body.estado }),
        ...(body.dependencia && { dependencia: body.dependencia }),
        ...(body.region && { region: body.region }),
        ...(body.zona && { zona: body.zona }),
        ...(body.origen && { origen: body.origen }),
        ...(body.comunaId && { comuna: body.comunaId }),
        // Componentes repeatable
        ...(body.telefonos && Array.isArray(body.telefonos) && body.telefonos.length > 0 && {
          telefonos: body.telefonos,
        }),
        ...(body.emails && Array.isArray(body.emails) && body.emails.length > 0 && {
          emails: body.emails,
        }),
        ...(body.direcciones && Array.isArray(body.direcciones) && body.direcciones.length > 0 && {
          direcciones: body.direcciones,
        }),
      },
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
      '/api/colegios',
      colegioData
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colegio creado exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/colegios POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear colegio',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

