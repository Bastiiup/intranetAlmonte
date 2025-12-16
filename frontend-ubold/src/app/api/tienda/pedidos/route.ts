/**
 * API Route para obtener pedidos desde Strapi
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Intentar múltiples endpoints según las colecciones disponibles
    let response: any = null
    let endpointUsed = ''
    
    // Intentar primero con "ecommerce-pedidos" (Ecommerce · Pedido)
    try {
      endpointUsed = '/api/ecommerce-pedidos'
      response = await strapiClient.get<any>(`${endpointUsed}?populate=*&pagination[pageSize]=100`)
    } catch {
      // Si falla, intentar con "wo-pedidos" (WO-Pedidos)
      try {
        endpointUsed = '/api/wo-pedidos'
        response = await strapiClient.get<any>(`${endpointUsed}?populate=*&pagination[pageSize]=100`)
      } catch {
        // Último intento con "pedidos"
        endpointUsed = '/api/pedidos'
        response = await strapiClient.get<any>(`${endpointUsed}?populate=*&pagination[pageSize]=100`)
      }
    }
    
    // Log detallado para debugging
    console.log('[API /tienda/pedidos] Respuesta de Strapi:', {
      endpoint: endpointUsed,
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      count: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
    })
    
    return NextResponse.json({
      success: true,
      data: response.data || [],
      meta: response.meta || {},
      endpoint: endpointUsed,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /tienda/pedidos] Error al obtener pedidos:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener pedidos',
        data: [],
        meta: {},
      },
      { status: error.status || 500 }
    )
  }
}

