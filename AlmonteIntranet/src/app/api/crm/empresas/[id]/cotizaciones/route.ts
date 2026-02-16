import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crm/empresas/[id]/cotizaciones
 * Obtiene las cotizaciones asociadas a una empresa específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empresaId } = await params

    // Obtener el ID numérico de la empresa si es documentId
    const isDocumentId = typeof empresaId === 'string' && !/^\d+$/.test(empresaId)
    let empresaIdNum: number | string = empresaId

    if (isDocumentId) {
      try {
        const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/empresas/${empresaId}?fields[0]=id`
        )
        const empresaData = Array.isArray(empresaResponse.data) ? empresaResponse.data[0] : empresaResponse.data
        if (empresaData && typeof empresaData === 'object' && 'id' in empresaData) {
          empresaIdNum = empresaData.id as number
        }
      } catch (error: any) {
        return NextResponse.json(
          { success: false, error: 'Empresa no encontrada' },
          { status: 404 }
        )
      }
    }

    // Buscar cotizaciones relacionadas con esta empresa
    // La relación es many-to-many, así que buscamos cotizaciones que tengan esta empresa en su array de empresas
    const paramsObj = new URLSearchParams({
      'populate[empresas]': 'true',
      'populate[productos]': 'true',
      'populate[creado_por][populate][persona]': 'true',
      'sort[0]': 'updatedAt:desc',
      'filters[activo][$eq]': 'true',
    })

    // Filtrar por empresa usando el filtro de relación many-to-many
    // En Strapi v4, para relaciones many-to-many usamos: filters[empresas][id][$eq]
    paramsObj.append('filters[empresas][id][$eq]', empresaIdNum.toString())

    try {
      const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/cotizaciones?${paramsObj.toString()}`
      )

      const cotizaciones = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []

      // Transformar cotizaciones para el frontend
      const cotizacionesTransformadas = cotizaciones.map((cot: any) => {
        const attrs = cot.attributes || cot
        return {
          id: cot.documentId || cot.id,
          documentId: cot.documentId,
          nombre: attrs.nombre || 'Sin nombre',
          descripcion: attrs.descripcion,
          monto: attrs.monto,
          moneda: attrs.moneda || 'CLP',
          estado: attrs.estado || 'Borrador',
          fecha_envio: attrs.fecha_envio,
          fecha_vencimiento: attrs.fecha_vencimiento,
          notas: attrs.notas,
          productos: attrs.productos?.data || attrs.productos || [],
          creado_por: attrs.creado_por?.data || attrs.creado_por,
          createdAt: attrs.createdAt || cot.createdAt,
          updatedAt: attrs.updatedAt || cot.updatedAt,
        }
      })

      return NextResponse.json({
        success: true,
        data: cotizacionesTransformadas,
        meta: {
          total: cotizacionesTransformadas.length,
        },
      }, { status: 200 })
    } catch (error: any) {
      // Si el content-type no existe, devolver array vacío
      if (error.status === 404 || error.message?.includes('404')) {
        return NextResponse.json({
          success: true,
          data: [],
          meta: { total: 0 },
        }, { status: 200 })
      }
      throw error
    }
  } catch (error: any) {
    console.error('[API /crm/empresas/[id]/cotizaciones GET] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener cotizaciones',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}


