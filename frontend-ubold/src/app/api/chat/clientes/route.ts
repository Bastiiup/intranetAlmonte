/**
 * API Route para obtener clientes desde Strapi
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface WOClienteAttributes {
  nombre: string
  correo_electronico: string
  ultima_actividad?: string
  fecha_registro?: string
  pedidos?: number
  gasto_total?: number
}

export async function GET() {
  try {
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<WOClienteAttributes>>>(
      '/api/wo-clientes?pagination[pageSize]=1000&sort=nombre:asc&populate=*'
    )
    
    // Log detallado para debugging
    console.log('[API /chat/clientes] Respuesta de Strapi:', {
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      count: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
    })
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      const firstClient = response.data[0]
      console.log('[API /chat/clientes] Primer cliente ejemplo:', {
        id: firstClient.id,
        attributes: firstClient.attributes,
        keys: Object.keys(firstClient.attributes || {}),
        nombre: firstClient.attributes?.nombre,
      })
    }
    
    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('[API /chat/clientes] Error al obtener clientes:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      { error: error.message || 'Error al obtener clientes' },
      { status: error.status || 500 }
    )
  }
}

