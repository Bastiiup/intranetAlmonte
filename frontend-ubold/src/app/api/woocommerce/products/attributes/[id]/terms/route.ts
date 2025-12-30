/**
 * API Route para obtener y crear términos (opciones) de atributos de WooCommerce
 */

import { NextRequest, NextResponse } from 'next/server'
import { createWooCommerceClient } from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const perPage = parseInt(searchParams.get('per_page') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const platform = searchParams.get('platform') || 'moraleja'

    const platformKey = platform === 'escolar' ? 'woo_escolar' : 'woo_moraleja'
    const wooCommerceClient = createWooCommerceClient(platformKey)

    const queryParams: Record<string, any> = {
      per_page: perPage,
      page: page,
    }

    const terms = await wooCommerceClient.get<any[]>(`products/attributes/${id}/terms`, queryParams)

    return NextResponse.json({
      success: true,
      data: terms,
    })
  } catch (error: any) {
    console.error('[API Attribute Terms GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener términos del atributo',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const searchParams = request.nextUrl.searchParams
    const platform = searchParams.get('platform') || body.platform || 'moraleja'

    const platformKey = platform === 'escolar' ? 'woo_escolar' : 'woo_moraleja'
    const wooCommerceClient = createWooCommerceClient(platformKey)

    const termData = {
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
    }

    const term = await wooCommerceClient.post<any>(`products/attributes/${id}/terms`, termData)

    return NextResponse.json({
      success: true,
      data: term,
    })
  } catch (error: any) {
    console.error('[API Attribute Terms POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear término',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

