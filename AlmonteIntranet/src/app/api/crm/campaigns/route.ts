import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface CampanaAttributes {
  nombre?: string
  descripcion?: string
  presupuesto?: number
  objetivo?: number
  estado?: 'en_progreso' | 'exitosa' | 'programada' | 'fallida' | 'en_curso'
  tags?: string[]
  fecha_inicio?: string
  fecha_fin?: string
  creado_por?: any
  contactos?: any
  leads?: any
  colegios?: any
  createdAt?: string
  updatedAt?: string
}

/**
 * GET /api/crm/campaigns
 * Obtiene todas las campañas con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''

    // Construir query params para Strapi
    const params = new URLSearchParams({
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      'sort[0]': 'fecha_inicio:desc',
      'populate[creado_por]': 'true',
      'populate[contactos]': 'true',
      'populate[leads]': 'true',
      'populate[colegios]': 'true',
    })

    // Filtros
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }

    // Búsqueda por nombre o descripción
    if (search) {
      params.append('filters[$or][0][nombre][$containsi]', search)
      params.append('filters[$or][1][descripcion][$containsi]', search)
    }

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<CampanaAttributes>[]>>(
      `/api/campanas?${params.toString()}`
    )

    return NextResponse.json({
      success: true,
      data: response.data || [],
      meta: response.meta || {
        pagination: {
          page: 1,
          pageSize: 50,
          total: 0,
          pageCount: 0,
        },
      },
    })
  } catch (error: any) {
    console.error('[API /crm/campaigns] Error al obtener campañas:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })

    // Detectar si Strapi está caído
    if (error.status === 502 || error.message?.includes('Bad Gateway')) {
      return NextResponse.json(
        {
          success: false,
          error: 'El servidor de Strapi no responde (Bad Gateway). Por favor, verifica que Strapi esté funcionando.',
          details: error.details || {},
          status: 502,
        },
        { status: 502 }
      )
    }

    // Si el content-type no existe
    if (error.status === 404 || error.message?.includes('Not Found')) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          meta: {
            pagination: {
              page: 1,
              pageSize: 50,
              total: 0,
              pageCount: 0,
            },
          },
          message: 'El content-type "Campaña" no existe en Strapi. Necesitas crearlo primero.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener campañas',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/campaigns
 * Crea una nueva campaña
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la campaña es obligatorio',
        },
        { status: 400 }
      )
    }

    if (!body.fecha_inicio) {
      return NextResponse.json(
        {
          success: false,
          error: 'La fecha de inicio de la campaña es obligatoria',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const campanaData: any = {
      data: {
        nombre: body.nombre.trim(),
        descripcion: body.descripcion?.trim() || null,
        presupuesto: body.presupuesto ? Number(body.presupuesto) : 0,
        objetivo: body.objetivo ? Number(body.objetivo) : 0,
        estado: body.estado || 'programada',
        tags: body.tags || [],
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin || null,
      },
    }

    // Relaciones
    if (body.creado_por) {
      campanaData.data.creado_por = body.creado_por
    }
    if (body.contactos && Array.isArray(body.contactos)) {
      campanaData.data.contactos = body.contactos
    }
    if (body.leads && Array.isArray(body.leads)) {
      campanaData.data.leads = body.leads
    }
    if (body.colegios && Array.isArray(body.colegios)) {
      campanaData.data.colegios = body.colegios
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<CampanaAttributes>>>(
      '/api/campanas',
      campanaData
    )

    // Revalidar cache
    revalidatePath('/crm/campaign')
    revalidateTag('campaigns', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Campaña creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/campaigns] Error al crear campaña:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear campaña',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
