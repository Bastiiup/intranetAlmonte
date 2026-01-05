import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface LeadAttributes {
  nombre?: string
  email?: string
  telefono?: string
  empresa?: string
  monto_estimado?: number
  etiqueta?: 'baja' | 'media' | 'alta'
  estado?: 'in-progress' | 'proposal-sent' | 'follow-up' | 'pending' | 'negotiation' | 'rejected'
  fuente?: string
  fecha_creacion?: string
  activo?: boolean
  notas?: string
  fecha_proximo_seguimiento?: string
  createdAt?: string
  updatedAt?: string
  asignado_a?: any
  relacionado_con_persona?: any
  relacionado_con_colegio?: any
}

/**
 * GET /api/crm/leads
 * Obtiene el listado de leads desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - page: Número de página (default: 1)
 * - pageSize: Tamaño de página (default: 50)
 * - search: Búsqueda por nombre, email, empresa
 * - etiqueta: Filtro por etiqueta (baja, media, alta)
 * - estado: Filtro por estado (in-progress, proposal-sent, follow-up, pending, negotiation, rejected)
 * - fuente: Filtro por fuente
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'
    const search = searchParams.get('search') || ''
    const etiqueta = searchParams.get('etiqueta') || ''
    const estado = searchParams.get('estado') || ''
    const fuente = searchParams.get('fuente') || ''

    // Construir parámetros de query
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'updatedAt:desc',
      'populate[asignado_a]': 'true',
      'populate[relacionado_con_persona]': 'true',
      'populate[relacionado_con_colegio]': 'true',
      'filters[activo][$eq]': 'true',
    })

    // Búsqueda por nombre, email o empresa
    if (search) {
      params.append('filters[$or][0][nombre][$containsi]', search)
      params.append('filters[$or][1][email][$containsi]', search)
      params.append('filters[$or][2][empresa][$containsi]', search)
    }

    // Filtro por etiqueta
    if (etiqueta) {
      params.append('filters[etiqueta][$eq]', etiqueta)
    }

    // Filtro por estado
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }

    // Filtro por fuente
    if (fuente) {
      params.append('filters[fuente][$eq]', fuente)
    }

    const url = `/api/leads?${params.toString()}`
    console.log('[API /crm/leads] GET:', url)

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<LeadAttributes>>>(url)

    return NextResponse.json({
      success: true,
      data: response.data || [],
      meta: response.meta || {
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: 0,
          pageCount: 0,
        },
      },
    })
  } catch (error: any) {
    console.error('[API /crm/leads] Error al obtener leads:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })

    // Si el content-type no existe, retornar mensaje informativo
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
          message: 'El content-type "Lead" no existe en Strapi. Necesitas crearlo primero.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener leads',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/leads
 * Crea un nuevo lead en Strapi
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del lead es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const leadData: any = {
      data: {
        nombre: body.nombre.trim(),
        ...(body.email && { email: body.email.trim() }),
        ...(body.telefono && { telefono: body.telefono.trim() }),
        ...(body.empresa && { empresa: body.empresa.trim() }),
        ...(body.monto_estimado !== undefined && { monto_estimado: Number(body.monto_estimado) }),
        ...(body.etiqueta && { etiqueta: body.etiqueta }),
        ...(body.estado && { estado: body.estado }),
        ...(body.fuente && { fuente: body.fuente.trim() }),
        ...(body.notas && { notas: body.notas.trim() }),
        ...(body.fecha_proximo_seguimiento && { fecha_proximo_seguimiento: body.fecha_proximo_seguimiento }),
        ...(body.activo !== undefined && { activo: body.activo }),
      },
    }

    // Relación con colaborador (asignado_a)
    if (body.asignado_a) {
      const colaboradorId = typeof body.asignado_a === 'object' ? body.asignado_a.id || body.asignado_a.documentId : body.asignado_a
      if (colaboradorId) {
        leadData.data.asignado_a = typeof colaboradorId === 'number' ? colaboradorId : parseInt(String(colaboradorId))
      }
    }

    // Relación con persona (relacionado_con_persona)
    if (body.relacionado_con_persona) {
      const personaId = typeof body.relacionado_con_persona === 'object' ? body.relacionado_con_persona.id || body.relacionado_con_persona.documentId : body.relacionado_con_persona
      if (personaId) {
        leadData.data.relacionado_con_persona = typeof personaId === 'number' ? personaId : parseInt(String(personaId))
      }
    }

    // Relación con colegio (relacionado_con_colegio)
    if (body.relacionado_con_colegio) {
      const colegioId = typeof body.relacionado_con_colegio === 'object' ? body.relacionado_con_colegio.id || body.relacionado_con_colegio.documentId : body.relacionado_con_colegio
      if (colegioId) {
        leadData.data.relacionado_con_colegio = typeof colegioId === 'number' ? colegioId : parseInt(String(colegioId))
      }
    }

    console.log('[API /crm/leads] POST - Creando lead:', JSON.stringify(leadData, null, 2))

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<LeadAttributes>>>(
      '/api/leads',
      leadData
    )

    // Revalidar cache
    revalidatePath('/crm/leads')
    revalidateTag('leads', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Lead creado exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/leads] Error al crear lead:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear lead',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
