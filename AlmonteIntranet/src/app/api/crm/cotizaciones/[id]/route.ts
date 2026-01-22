import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

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
  empresas?: any
  productos?: any
  creado_por?: any
}

/**
 * GET /api/crm/cotizaciones/[id]
 * Obtiene una cotización específica por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Populate completo para relaciones
    const paramsQuery = new URLSearchParams({
      'populate[empresas]': 'true',
      'populate[productos]': 'true',
      'populate[creado_por][populate][persona]': 'true',
    })

    const url = `/api/cotizaciones/${id}?${paramsQuery.toString()}`
    
    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<CotizacionAttributes>>>(url)

      return NextResponse.json({
        success: true,
        data: response.data,
      }, { status: 200 })
    } catch (error: any) {
      // Si falla con populate, intentar sin populate
      try {
        const response = await strapiClient.get<StrapiResponse<StrapiEntity<CotizacionAttributes>>>(
          `/api/cotizaciones/${id}`
        )
        return NextResponse.json({
          success: true,
          data: response.data,
        }, { status: 200 })
      } catch (retryError: any) {
        throw error
      }
    }
  } catch (error: any) {
    console.error('[API /crm/cotizaciones/[id] GET] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cotización',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT /api/crm/cotizaciones/[id]
 * Actualiza una cotización existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Preparar datos para Strapi
    const cotizacionData: any = {
      data: {},
    }

    // Campos actualizables
    if (body.nombre !== undefined) {
      cotizacionData.data.nombre = body.nombre.trim()
    }
    if (body.descripcion !== undefined) {
      cotizacionData.data.descripcion = body.descripcion?.trim() || null
    }
    if (body.monto !== undefined) {
      cotizacionData.data.monto = body.monto ? Number(body.monto) : null
    }
    if (body.moneda !== undefined) {
      cotizacionData.data.moneda = body.moneda
    }
    if (body.estado !== undefined) {
      cotizacionData.data.estado = body.estado
    }
    if (body.fecha_envio !== undefined) {
      cotizacionData.data.fecha_envio = body.fecha_envio || null
    }
    if (body.fecha_vencimiento !== undefined) {
      cotizacionData.data.fecha_vencimiento = body.fecha_vencimiento || null
    }
    if (body.notas !== undefined) {
      cotizacionData.data.notas = body.notas?.trim() || null
    }
    if (body.activo !== undefined) {
      cotizacionData.data.activo = body.activo
    }
    if (body.respuestas_empresas !== undefined) {
      cotizacionData.data.respuestas_empresas = body.respuestas_empresas
    }

    // Relación con empresas - manyToMany: usar array de IDs
    if (body.empresas !== undefined) {
      if (Array.isArray(body.empresas) && body.empresas.length > 0) {
        cotizacionData.data.empresas = body.empresas.map((emp: any) => {
          const empId = typeof emp === 'object' ? emp.id || emp.documentId : emp
          return typeof empId === 'number' ? empId : parseInt(String(empId))
        })
      } else {
        cotizacionData.data.empresas = []
      }
    }

    // Relación con productos - manyToMany: usar array de IDs
    if (body.productos !== undefined) {
      if (Array.isArray(body.productos) && body.productos.length > 0) {
        cotizacionData.data.productos = body.productos.map((prod: any) => {
          const prodId = typeof prod === 'object' ? prod.id || prod.documentId : prod
          return typeof prodId === 'number' ? prodId : parseInt(String(prodId))
        })
      } else {
        cotizacionData.data.productos = []
      }
    }

    const response = await strapiClient.put<StrapiResponse<StrapiEntity<CotizacionAttributes>>>(
      `/api/cotizaciones/${id}`,
      cotizacionData
    )

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/estimations')
    revalidatePath(`/crm/estimations/${id}`, 'page')
    revalidateTag('cotizaciones', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Cotización actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cotizaciones/[id] PUT] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al actualizar cotización',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/crm/cotizaciones/[id]
 * Elimina una cotización (soft delete: marca como inactiva)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Soft delete: marcar como inactiva en lugar de eliminar
    await strapiClient.put(`/api/cotizaciones/${id}`, {
      data: {
        activo: false,
      },
    })

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/estimations')
    revalidateTag('cotizaciones', 'max')

    return NextResponse.json({
      success: true,
      message: 'Cotización eliminada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cotizaciones/[id] DELETE] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar cotización',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}
