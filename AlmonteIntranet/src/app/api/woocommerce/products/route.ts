/**
 * API Route para obtener productos de WooCommerce
 * 
 * Esta ruta actúa como proxy para evitar exponer las credenciales en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import { createWooCommerceClient } from '@/lib/woocommerce/client'
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
    const platform = searchParams.get('platform') || 'moraleja' // 'moraleja' o 'escolar'

    // Determinar qué plataforma usar
    const platformKey = platform === 'escolar' ? 'woo_escolar' : 'woo_moraleja'
    const wooCommerceClient = createWooCommerceClient(platformKey)

    // Construir parámetros para la API de WooCommerce
    const params: Record<string, any> = {
      per_page: perPage,
      page: page,
      status: 'publish', // Solo productos publicados
    }
    
    // Solo agregar stock_status si se especifica explícitamente y no es 'all'
    // Por defecto no filtrar por stock para obtener todos los productos disponibles
    if (stockStatus && stockStatus !== 'all') {
      params.stock_status = stockStatus
    }

    if (search) {
      params.search = search
    }

    if (category) {
      params.category = category
    }

    // Obtener productos desde WooCommerce
    console.log(`[API Products ${platform}] 🔍 Obteniendo productos con parámetros:`, {
      platform,
      platformKey,
      params,
      url: `products?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}`
    })
    
    const products = await wooCommerceClient.get<WooCommerceProduct[]>('products', params)
    
    console.log(`[API Products ${platform}] 📦 Respuesta de WooCommerce:`, {
      isArray: Array.isArray(products),
      length: Array.isArray(products) ? products.length : (products ? 1 : 0),
      firstProduct: Array.isArray(products) && products.length > 0 ? products[0].name : 'N/A'
    })

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


