import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // PROBAR estos nombres en orden hasta encontrar el correcto
    let response: any
    let collectionEndpoint = '/api/colecciones'
    
    try {
      // Intentar primero con /api/colecciones (más probable)
      response = await strapiClient.get<any>(`${collectionEndpoint}?populate=*&pagination[pageSize]=1000`)
    } catch (error: any) {
      // Si falla, probar con nombre alternativo
      console.log('[API Colecciones] Primera URL falló, probando alternativa...')
      try {
        collectionEndpoint = '/api/serie-coleccions'
        response = await strapiClient.get<any>(`${collectionEndpoint}?populate=*&pagination[pageSize]=1000`)
      } catch (error2: any) {
        // Último intento con colecciones-series
        collectionEndpoint = '/api/colecciones-series'
        response = await strapiClient.get<any>(`${collectionEndpoint}?populate=*&pagination[pageSize]=1000`)
      }
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
    
    console.log('[API Colecciones] ✅ Items obtenidos:', items.length, 'desde:', collectionEndpoint)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API Colecciones] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las colecciones: ${error.message}`
    })
  }
}

