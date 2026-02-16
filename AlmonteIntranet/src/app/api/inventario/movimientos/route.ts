/**
 * API Route para consultar movimientos de inventario
 * GET /api/inventario/movimientos?libro=documentId&tipo=entrada&page=1&pageSize=20
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const libroId = searchParams.get('libro')
    const tipo = searchParams.get('tipo') // entrada, salida, ajuste, etc.
    const ordenCompraId = searchParams.get('orden_compra')
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '20'

    // Construir parámetros de query
    // Simplificado: usar populate=* para evitar errores de campos específicos
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'fecha_movimiento:desc',
      'populate': '*',
    })

    // Filtrar por libro si se especifica
    if (libroId) {
      params.append('filters[libro][documentId][$eq]', libroId)
    }

    // Filtrar por tipo si se especifica
    if (tipo) {
      params.append('filters[tipo][$eq]', tipo)
    }

    // Filtrar por orden de compra si se especifica
    if (ordenCompraId) {
      params.append('filters[orden_compra][documentId][$eq]', ordenCompraId)
    }

    console.log('[API Movimientos Inventario] Consultando:', params.toString())

    const response = await strapiClient.get<any>(`/api/movimientos-inventario?${params.toString()}`)

    // Normalizar respuesta
    let movimientos: any[] = []
    let meta: any = {}

    if (Array.isArray(response)) {
      movimientos = response
    } else if (response.data && Array.isArray(response.data)) {
      movimientos = response.data
      meta = response.meta || {}
    } else if (response.data) {
      movimientos = [response.data]
    }

    console.log('[API Movimientos Inventario] Registros encontrados:', movimientos.length)

    // Calcular resumen si se solicita un libro específico
    let resumen: any = null
    if (libroId && movimientos.length > 0) {
      const entradas = movimientos.filter(m => {
        const attrs = m.attributes || m
        return ['entrada', 'ajuste_positivo', 'devolucion', 'transferencia_entrada'].includes(attrs.tipo)
      })
      const salidas = movimientos.filter(m => {
        const attrs = m.attributes || m
        return ['salida', 'ajuste_negativo', 'merma', 'transferencia_salida'].includes(attrs.tipo)
      })

      const totalEntradas = entradas.reduce((sum, m) => {
        const attrs = m.attributes || m
        return sum + Math.abs(attrs.cantidad || 0)
      }, 0)

      const totalSalidas = salidas.reduce((sum, m) => {
        const attrs = m.attributes || m
        return sum + Math.abs(attrs.cantidad || 0)
      }, 0)

      resumen = {
        totalMovimientos: movimientos.length,
        totalEntradas,
        totalSalidas,
        balance: totalEntradas - totalSalidas,
      }
    }

    return NextResponse.json({
      success: true,
      data: movimientos,
      resumen,
      meta: {
        pagination: meta.pagination || {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: movimientos.length,
        }
      }
    })
  } catch (error: any) {
    console.error('[API Movimientos Inventario] Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener movimientos de inventario',
      data: [],
    }, { status: error.status || 500 })
  }
}

