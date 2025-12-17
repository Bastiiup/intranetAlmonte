import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Intentar primero con colecciones-series, luego con colecciones
    let response: any
    try {
      response = await strapiClient.get<any>('/api/colecciones-series?populate=*&pagination[pageSize]=1000')
    } catch (error: any) {
      // Si falla, intentar con colecciones
      response = await strapiClient.get<any>('/api/colecciones?populate=*&pagination[pageSize]=1000')
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
    
    console.log('[API GET colecciones] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET colecciones] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener colecciones'
    }, { status: error.status || 500 })
  }
}

