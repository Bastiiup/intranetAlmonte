/**
 * API Route para obtener pedidos asociados a una empresa específica
 * GET /api/crm/empresas/[id]/pedidos
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crm/empresas/[id]/pedidos
 * Obtiene los pedidos asociados a una empresa específica
 * 
 * Nota: La relación entre empresas y pedidos puede ser directa o a través de
 * un campo en el pedido que identifique la empresa (por ejemplo, billing.company)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empresaId } = await params

    // Obtener información de la empresa para buscar pedidos
    let empresa: any = null
    try {
      const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/empresas/${empresaId}`
      )
      empresa = Array.isArray(empresaResponse.data) ? empresaResponse.data[0] : empresaResponse.data
      
      if (!empresa) {
        return NextResponse.json(
          { success: false, error: 'Empresa no encontrada' },
          { status: 404 }
        )
      }
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: 'Empresa no encontrada' },
        { status: 404 }
      )
    }

    const attrs = empresa.attributes || empresa
    const empresaNombre = attrs.empresa_nombre || attrs.razon_social || ''
    const empresaRut = attrs.rut || ''

    // Buscar pedidos relacionados con esta empresa
    // Opción 1: Si hay relación directa empresa en pedidos
    let pedidos: any[] = []
    
    try {
      // Intentar buscar por relación directa si existe
      const paramsObj = new URLSearchParams({
        'populate[cliente]': 'true',
        'sort[0]': 'createdAt:desc',
        'pagination[pageSize]': '100',
      })

      const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
        `/api/pedidos?${paramsObj.toString()}`
      )

      const todosPedidos = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []

      // Filtrar pedidos que coincidan con la empresa por:
      // 1. Relación directa empresa
      // 2. billing.company que coincida con nombre o razón social
      // 3. Cliente relacionado que tenga datos de la empresa
      pedidos = todosPedidos.filter((pedido: any) => {
        const pedidoAttrs = pedido.attributes || pedido
        
        // Verificar relación directa
        if (pedidoAttrs.empresa) {
          const empresaRelacionada = pedidoAttrs.empresa.data || pedidoAttrs.empresa
          const empresaIdRelacionada = empresaRelacionada?.id || empresaRelacionada?.documentId
          const empresaIdOriginal = empresa.id || empresa.documentId
          if (empresaIdRelacionada === empresaIdOriginal) {
            return true
          }
        }

        // Verificar por billing.company
        if (pedidoAttrs.billing?.company) {
          const billingCompany = pedidoAttrs.billing.company.toLowerCase()
          if (billingCompany === empresaNombre.toLowerCase() || 
              (attrs.razon_social && billingCompany === attrs.razon_social.toLowerCase())) {
            return true
          }
        }

        // Verificar por cliente relacionado
        if (pedidoAttrs.cliente) {
          const cliente = pedidoAttrs.cliente.data?.attributes || pedidoAttrs.cliente.attributes || pedidoAttrs.cliente
          if (cliente?.nombre === empresaNombre || cliente?.razon_social === empresaNombre) {
            return true
          }
        }

        return false
      })
    } catch (error: any) {
      console.error('Error al buscar pedidos:', error)
      // Si hay error, retornar array vacío
      pedidos = []
    }

    // Transformar pedidos para el frontend
    const pedidosTransformados = pedidos.map((pedido: any) => {
      const attrs = pedido.attributes || pedido
      return {
        id: pedido.id || pedido.documentId,
        documentId: pedido.documentId || pedido.id,
        numero_pedido: attrs.numero_pedido || attrs.numeroPedido,
        fecha_pedido: attrs.fecha_pedido || attrs.fechaPedido || attrs.createdAt,
        estado: attrs.estado || attrs.ESTADO,
        total: attrs.total || attrs.TOTAL || 0,
        subtotal: attrs.subtotal || attrs.SUBTOTAL || 0,
        moneda: attrs.moneda || attrs.MONEDA || 'CLP',
      }
    })

    return NextResponse.json({
      success: true,
      data: pedidosTransformados,
      meta: {
        pagination: {
          total: pedidosTransformados.length,
          page: 1,
          pageSize: pedidosTransformados.length,
        },
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/empresas/[id]/pedidos GET] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo pedidos',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}




