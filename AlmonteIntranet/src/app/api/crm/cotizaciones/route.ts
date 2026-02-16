import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { getColaboradorIdFromRequest } from '@/lib/crm/activity-helper'

export const dynamic = 'force-dynamic'

interface CotizacionAttributes {
  nombre?: string
  descripcion?: string
  monto?: number
  moneda?: 'CLP' | 'USD' | 'EUR'
  estado?: 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Vencida'
  fecha_envio?: string
  fecha_vencimiento?: string
  notas?: string
  activo?: boolean
  token_acceso?: string
  respuestas_empresas?: Array<{
    empresa_id: number | string
    valor_empresa: number
    notas?: string
    fecha_respuesta: string
  }>
  createdAt?: string
  updatedAt?: string
  empresas?: any
  productos?: any
  creado_por?: any
}

/**
 * GET /api/crm/cotizaciones
 * Obtiene el listado de cotizaciones desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - page: Número de página (default: 1)
 * - pageSize: Tamaño de página (default: 50)
 * - search: Búsqueda por nombre o descripcion
 * - estado: Filtro por estado (Borrador, Enviada, Aprobada, Rechazada, Vencida)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '50'
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''

    // Construir parámetros de query
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'updatedAt:desc',
    })

    // Populate para relaciones (Strapi v4 syntax)
    params.append('populate[empresas]', 'true')
    params.append('populate[productos]', 'true')
    params.append('populate[creado_por][populate][persona]', 'true')

    // Filtros
    params.append('filters[activo][$eq]', 'true')

    // Búsqueda
    if (search) {
      params.append('filters[$or][0][nombre][$containsi]', search)
      params.append('filters[$or][1][descripcion][$containsi]', search)
    }

    // Filtro por estado
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }

    const url = `/api/cotizaciones?${params.toString()}`
    
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<CotizacionAttributes>>>(url)

      return NextResponse.json({
        success: true,
        data: response.data,
        meta: response.meta,
      }, { status: 200 })
    } catch (error: any) {
      // Si el error es 404, significa que el content-type no existe en Strapi
      if (error.status === 404 || error.message?.includes('404')) {
        return NextResponse.json(
          {
            success: true,
            data: [],
            meta: {
              pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total: 0,
                pageCount: 0,
              }
            },
            message: 'El content-type "Cotización" no existe en Strapi. Por favor, créalo primero según la documentación.',
          },
          { status: 200 }
        )
      }
      throw error
    }
  } catch (error: any) {
    console.error('[API /crm/cotizaciones] Error al obtener cotizaciones:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    // Si falla con populate, intentar sin populate
    try {
      const { searchParams } = new URL(request.url)
      const page = searchParams.get('page') || '1'
      const pageSize = searchParams.get('pageSize') || '50'
      
      const params = new URLSearchParams({
        'pagination[page]': page,
        'pagination[pageSize]': pageSize,
        'sort[0]': 'updatedAt:desc',
        'filters[activo][$eq]': 'true',
      })

      const url = `/api/cotizaciones?${params.toString()}`
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<CotizacionAttributes>>>(url)

      return NextResponse.json({
        success: true,
        data: response.data,
        meta: response.meta,
      }, { status: 200 })
    } catch (retryError: any) {
      // Si también falla sin populate, devolver respuesta vacía
      return NextResponse.json(
        {
          success: true,
          data: [],
          meta: {
            pagination: {
              page: 1,
              pageSize: 50,
              total: 0,
              pageCount: 0,
            }
          },
          message: 'Error al obtener cotizaciones. Verifica que el content-type existe en Strapi.',
        },
        { status: 200 }
      )
    }
  }
}

/**
 * POST /api/crm/cotizaciones
 * Crea una nueva cotización
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validaciones básicas
    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la cotización es obligatorio',
        },
        { status: 400 }
      )
    }

    // Obtener colaborador actual para asignar como creado_por
    const colaboradorId = await getColaboradorIdFromRequest(request)

    // Preparar datos para Strapi
    const cotizacionData: any = {
      data: {
        nombre: body.nombre.trim(),
        ...(body.descripcion && { descripcion: body.descripcion.trim() }),
        ...(body.monto !== undefined && { monto: Number(body.monto) }),
        ...(body.moneda && { moneda: body.moneda }),
        ...(body.estado && { estado: body.estado }),
        ...(body.fecha_envio && { fecha_envio: body.fecha_envio }),
        ...(body.fecha_vencimiento && { fecha_vencimiento: body.fecha_vencimiento }),
        ...(body.notas && { notas: body.notas.trim() }),
        activo: body.activo !== undefined ? body.activo : true,
        estado: body.estado || 'Borrador',
        respuestas_empresas: body.respuestas_empresas || [],
      },
    }

    // Relación con creado_por (Colaborador) - manyToOne
    if (colaboradorId) {
      const idNum = typeof colaboradorId === 'number' ? colaboradorId : parseInt(String(colaboradorId))
      cotizacionData.data.creado_por = idNum
    } else if (body.creado_por) {
      const creadoPorId = typeof body.creado_por === 'object' ? body.creado_por.id || body.creado_por.documentId : body.creado_por
      if (creadoPorId) {
        const idNum = typeof creadoPorId === 'number' ? creadoPorId : parseInt(String(creadoPorId))
        cotizacionData.data.creado_por = idNum
      }
    }

    // Relación con empresas - manyToMany: usar array de IDs
    if (body.empresas && Array.isArray(body.empresas) && body.empresas.length > 0) {
      cotizacionData.data.empresas = body.empresas.map((emp: any) => {
        const empId = typeof emp === 'object' ? emp.id || emp.documentId : emp
        return typeof empId === 'number' ? empId : parseInt(String(empId))
      })
    }

    // Relación con productos - manyToMany: usar array de IDs
    if (body.productos && Array.isArray(body.productos) && body.productos.length > 0) {
      cotizacionData.data.productos = body.productos.map((prod: any) => {
        const prodId = typeof prod === 'object' ? prod.id || prod.documentId : prod
        return typeof prodId === 'number' ? prodId : parseInt(String(prodId))
      })
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<CotizacionAttributes>>>(
      '/api/cotizaciones',
      cotizacionData
    )

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/estimations')
    revalidateTag('cotizaciones', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Cotización creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/cotizaciones POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear cotización',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
