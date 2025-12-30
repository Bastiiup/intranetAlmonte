/**
 * API Route para obtener y crear atributos de WooCommerce
 */

import { NextRequest, NextResponse } from 'next/server'
import { createWooCommerceClient } from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const perPage = parseInt(searchParams.get('per_page') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const platform = searchParams.get('platform') || 'moraleja'

    const platformKey = platform === 'escolar' ? 'woo_escolar' : 'woo_moraleja'
    const wooCommerceClient = createWooCommerceClient(platformKey)

    const params: Record<string, any> = {
      per_page: perPage,
      page: page,
    }

    const attributes = await wooCommerceClient.get<any[]>('products/attributes', params)

    return NextResponse.json({
      success: true,
      data: attributes,
    })
  } catch (error: any) {
    console.error('[API Attributes GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener atributos',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const platform = body.platform || 'moraleja'

    const platformKey = platform === 'escolar' ? 'woo_escolar' : 'woo_moraleja'
    const wooCommerceClient = createWooCommerceClient(platformKey)

    const attributeData = {
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
      type: body.type || 'select',
      order_by: body.order_by || 'menu_order',
      has_archives: body.has_archives || false,
    }

    const attribute = await wooCommerceClient.post<any>('products/attributes', attributeData)

    return NextResponse.json({
      success: true,
      data: attribute,
    })
  } catch (error: any) {
    console.error('[API Attributes POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear atributo',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

