import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Intentar primero con categorias-producto, luego con categorias
    let response: any
    try {
      response = await strapiClient.get<any>('/api/categorias-producto?populate=*&pagination[pageSize]=1000')
    } catch (error: any) {
      // Si falla, intentar con categorias
      response = await strapiClient.get<any>('/api/categorias?populate=*&pagination[pageSize]=1000')
    }
    
    let items: any[] = []
    if (Array.isArray(response)) {
      items = response
    } else if (response.data && Array.isArray(response.data)) {
      items = response.data
    } else if (response.data) {
      items = [response.data]
    } else {
      items = [response]
    }
    
    console.log('[API GET categorias] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET categorias] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener categorías'
    }, { status: error.status || 500 })
  }
}

