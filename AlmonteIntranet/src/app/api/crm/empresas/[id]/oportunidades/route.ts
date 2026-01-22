/**
 * API Route para obtener oportunidades asociadas a una empresa específica
 * GET /api/crm/empresas/[id]/oportunidades
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crm/empresas/[id]/oportunidades
 * Obtiene las oportunidades asociadas a una empresa específica
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

    // Buscar oportunidades relacionadas con esta empresa
    const paramsObj = new URLSearchParams({
      [`filters[empresa][id][$eq]`]: empresaIdNum.toString(),
      'populate[producto][populate]': 'portada_libro',
      'populate[contacto]': 'true',
      'populate[propietario]': 'true',
      'sort[0]': 'updatedAt:desc',
    })

    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/oportunidades?${paramsObj.toString()}`
    )

    const oportunidades = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []

    // Transformar oportunidades para el frontend
    const oportunidadesTransformadas = oportunidades.map((oportunidad: any) => {
      const attrs = oportunidad.attributes || oportunidad
      return {
        id: oportunidad.id || oportunidad.documentId,
        documentId: oportunidad.documentId || oportunidad.id,
        nombre: attrs.nombre,
        descripcion: attrs.descripcion,
        monto: attrs.monto,
        moneda: attrs.moneda || 'CLP',
        etapa: attrs.etapa,
        estado: attrs.estado,
        prioridad: attrs.prioridad,
        fecha_cierre: attrs.fecha_cierre,
        producto: attrs.producto?.data?.attributes || attrs.producto?.attributes || attrs.producto,
        contacto: attrs.contacto?.data?.attributes || attrs.contacto?.attributes || attrs.contacto,
        propietario: attrs.propietario?.data?.attributes || attrs.propietario?.attributes || attrs.propietario,
      }
    })

    return NextResponse.json({
      success: true,
      data: oportunidadesTransformadas,
      meta: {
        pagination: {
          total: oportunidadesTransformadas.length,
          page: 1,
          pageSize: oportunidadesTransformadas.length,
        },
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/empresas/[id]/oportunidades GET] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo oportunidades',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}




