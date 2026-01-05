import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface OportunidadAttributes {
  nombre?: string
  descripcion?: string
  monto?: number
  moneda?: string
  etapa?: string
  estado?: 'open' | 'in-progress' | 'closed'
  prioridad?: 'low' | 'medium' | 'high'
  fecha_cierre?: string
  fuente?: string
  activo?: boolean
  createdAt?: string
  updatedAt?: string
  producto?: any
  contacto?: any
  propietario?: any
}

/**
 * GET /api/crm/oportunidades
 * Obtiene el listado de oportunidades desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - page: Número de página (default: 1)
 * - pageSize: Tamaño de página (default: 50)
 * - search: Búsqueda por nombre, descripcion o contacto
 * - stage: Filtro por etapa (Qualification, Proposal Sent, Negotiation, Won, Lost)
 * - status: Filtro por estado (open, in-progress, closed)
 * - priority: Filtro por prioridad (low, medium, high)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'
    const search = searchParams.get('search') || ''
    const stage = searchParams.get('stage') || ''
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''

    // Construir parámetros de query
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'updatedAt:desc',
    })

    // Populate para relaciones (Strapi v4 syntax)
    params.append('populate[producto][populate][logo][populate]', 'media')
    params.append('populate[contacto][populate][imagen][populate]', 'media')
    params.append('populate[propietario]', 'true')

    // Filtros
    params.append('filters[activo][$eq]', 'true')

    // Búsqueda
    if (search) {
      params.append('filters[$or][0][nombre][$containsi]', search)
      params.append('filters[$or][1][descripcion][$containsi]', search)
      params.append('filters[$or][2][contacto][nombre_completo][$containsi]', search)
    }

    // Filtro por etapa
    if (stage) {
      params.append('filters[etapa][$eq]', stage)
    }

    // Filtro por estado
    if (status) {
      params.append('filters[estado][$eq]', status)
    }

    // Filtro por prioridad
    if (priority) {
      params.append('filters[prioridad][$eq]', priority)
    }

    const url = `/api/oportunidades?${params.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<OportunidadAttributes>>>(url)

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/oportunidades] Error al obtener oportunidades:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener oportunidades',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/oportunidades
 * Crea una nueva oportunidad
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la oportunidad es obligatorio',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const oportunidadData: any = {
      data: {
        nombre: body.nombre.trim(),
        ...(body.descripcion && { descripcion: body.descripcion.trim() }),
        ...(body.monto !== undefined && { monto: Number(body.monto) }),
        ...(body.moneda && { moneda: body.moneda }),
        ...(body.etapa && { etapa: body.etapa }),
        ...(body.estado && { estado: body.estado }),
        ...(body.prioridad && { prioridad: body.prioridad }),
        ...(body.fecha_cierre && { fecha_cierre: body.fecha_cierre }),
        ...(body.fuente && { fuente: body.fuente }),
        activo: body.activo !== undefined ? body.activo : true,
      },
    }

    // Relación con contacto (Persona)
    if (body.contacto) {
      const contactoId = typeof body.contacto === 'object' ? body.contacto.id || body.contacto.documentId : body.contacto
      if (contactoId) {
        oportunidadData.data.contacto = { connect: [typeof contactoId === 'number' ? contactoId : parseInt(String(contactoId))] }
      }
    }

    // Relación con propietario (Colaborador)
    if (body.propietario) {
      const propietarioId = typeof body.propietario === 'object' ? body.propietario.id || body.propietario.documentId : body.propietario
      if (propietarioId) {
        oportunidadData.data.propietario = { connect: [typeof propietarioId === 'number' ? propietarioId : parseInt(String(propietarioId))] }
      }
    }

    // Relación con producto (si existe)
    if (body.producto) {
      const productoId = typeof body.producto === 'object' ? body.producto.id || body.producto.documentId : body.producto
      if (productoId) {
        oportunidadData.data.producto = { connect: [typeof productoId === 'number' ? productoId : parseInt(String(productoId))] }
      }
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<OportunidadAttributes>>>(
      '/api/oportunidades',
      oportunidadData
    )

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/opportunities')
    revalidateTag('oportunidades', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Oportunidad creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/oportunidades POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear oportunidad',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
