/**
 * API Route para obtener productos de WooCommerce
 * 
 * Esta ruta actúa como proxy para evitar exponer las credenciales en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
<<<<<<< HEAD
import wooCommerceClient from '@/lib/woocommerce/client'
=======
import { createWooCommerceClient } from '@/lib/woocommerce/client'
>>>>>>> origin/mati-integracion
import type { WooCommerceProduct } from '@/lib/woocommerce/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const perPage = parseInt(searchParams.get('per_page') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category') || ''
    const stockStatus = searchParams.get('stock_status') || 'instock'
<<<<<<< HEAD
=======
    const platform = searchParams.get('platform') || 'moraleja' // 'moraleja' o 'escolar'

    // Determinar qué plataforma usar
    const platformKey = platform === 'escolar' ? 'woo_escolar' : 'woo_moraleja'
    const wooCommerceClient = createWooCommerceClient(platformKey)
>>>>>>> origin/mati-integracion

    // Construir parámetros para la API de WooCommerce
    const params: Record<string, any> = {
      per_page: perPage,
      page: page,
      status: 'publish', // Solo productos publicados
      stock_status: stockStatus,
    }

    if (search) {
      params.search = search
    }

    if (category) {
      params.category = category
    }

    // Obtener productos desde WooCommerce
    const products = await wooCommerceClient.get<WooCommerceProduct[]>('products', params)

    return NextResponse.json({
      success: true,
      data: products,
    })
  } catch (error: any) {
    console.error('Error al obtener productos de WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener productos',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}


