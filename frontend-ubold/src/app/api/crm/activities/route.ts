import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ActividadAttributes {
  tipo?: 'llamada' | 'email' | 'reunion' | 'nota' | 'cambio_estado' | 'tarea' | 'recordatorio' | 'otro'
  titulo?: string
  descripcion?: string
  fecha?: string
  estado?: 'completada' | 'pendiente' | 'cancelada' | 'en_progreso'
  notas?: string
  relacionado_con_contacto?: any
  relacionado_con_lead?: any
  relacionado_con_oportunidad?: any
  relacionado_con_colegio?: any
  creado_por?: any
  createdAt?: string
  updatedAt?: string
}

/**
 * GET /api/crm/activities
 * Obtiene todas las actividades con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search') || ''
    const tipo = searchParams.get('tipo') || ''
    const estado = searchParams.get('estado') || ''
    const relacionado_con = searchParams.get('relacionado_con') || '' // 'contacto', 'lead', 'oportunidad', 'colegio'
    const relacionado_id = searchParams.get('relacionado_id') || ''

    // Construir query params para Strapi
    const params = new URLSearchParams({
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      'sort[0]': 'fecha:desc',
      'populate[creado_por]': 'true',
      'populate[relacionado_con_contacto]': 'true',
      'populate[relacionado_con_lead]': 'true',
      'populate[relacionado_con_oportunidad]': 'true',
      'populate[relacionado_con_colegio]': 'true',
    })

    // Filtros
    if (tipo) {
      params.append('filters[tipo][$eq]', tipo)
    }
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }

    // Filtro por relación
    if (relacionado_con && relacionado_id) {
      const relationField = `relacionado_con_${relacionado_con}`
      params.append(`filters[${relationField}][id][$eq]`, relacionado_id)
    }

    // Búsqueda por título o descripción
    if (search) {
      params.append('filters[$or][0][titulo][$containsi]', search)
      params.append('filters[$or][1][descripcion][$containsi]', search)
    }

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ActividadAttributes>[]>>(
      `/api/actividades?${params.toString()}`
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
    console.error('[API /crm/activities] Error al obtener actividades:', {
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
          message: 'El content-type "Actividad" no existe en Strapi. Necesitas crearlo primero.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener actividades',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/activities
 * Crea una nueva actividad
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.titulo || !body.titulo.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El título de la actividad es obligatorio',
        },
        { status: 400 }
      )
    }

    if (!body.fecha) {
      return NextResponse.json(
        {
          success: false,
          error: 'La fecha de la actividad es obligatoria',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const actividadData: any = {
      data: {
        tipo: body.tipo || 'nota',
        titulo: body.titulo.trim(),
        descripcion: body.descripcion?.trim() || null,
        fecha: body.fecha,
        estado: body.estado || 'pendiente',
        notas: body.notas?.trim() || null,
      },
    }

    // Relaciones
    if (body.relacionado_con_contacto) {
      actividadData.data.relacionado_con_contacto = body.relacionado_con_contacto
    }
    if (body.relacionado_con_lead) {
      actividadData.data.relacionado_con_lead = body.relacionado_con_lead
    }
    if (body.relacionado_con_oportunidad) {
      actividadData.data.relacionado_con_oportunidad = body.relacionado_con_oportunidad
    }
    if (body.relacionado_con_colegio) {
      actividadData.data.relacionado_con_colegio = body.relacionado_con_colegio
    }
    if (body.creado_por) {
      actividadData.data.creado_por = body.creado_por
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ActividadAttributes>>>(
      '/api/actividades',
      actividadData
    )

    // Revalidar cache
    revalidatePath('/crm/activities')
    revalidateTag('activities', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Actividad creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/activities] Error al crear actividad:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear actividad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
