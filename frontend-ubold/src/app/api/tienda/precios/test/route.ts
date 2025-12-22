import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Intentar diferentes endpoints posibles para precios
    const endpoints = [
      '/api/precios?populate=*&pagination[pageSize]=10',
      '/api/precio?populate=*&pagination[pageSize]=10',
      '/api/product-precios?populate=*&pagination[pageSize]=10',
    ]
    
    let response: any = null
    let endpointUsado = ''
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[Test Precios] Intentando endpoint: ${endpoint}`)
        response = await strapiClient.get<any>(endpoint)
        endpointUsado = endpoint
        break
      } catch (err: any) {
        console.log(`[Test Precios] Endpoint ${endpoint} falló:`, err.message)
        continue
      }
    }
    
    if (!response) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo encontrar el endpoint de precios. Intentados: ' + endpoints.join(', '),
        endpointsIntentados: endpoints
      }, { status: 404 })
    }
    
    console.log('[Test Precios] Respuesta completa:', JSON.stringify(response, null, 2))
    
    let precios: any[] = []
    if (Array.isArray(response)) {
      precios = response
    } else if (response.data && Array.isArray(response.data)) {
      precios = response.data
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      precios = response.data.data
    } else if (response.data) {
      precios = [response.data]
    }
    
    // Mostrar estructura del primer precio si existe
    let estructura: string[] = []
    let primerPrecio: any = null
    
    if (precios.length > 0) {
      primerPrecio = precios[0]
      estructura = Object.keys(primerPrecio)
      
      console.log('[Test Precios] Campos disponibles:', estructura)
      console.log('[Test Precios] Primer precio completo:', JSON.stringify(primerPrecio, null, 2))
      
      // Si tiene attributes, mostrar también esos campos
      if (primerPrecio.attributes) {
        console.log('[Test Precios] Campos en attributes:', Object.keys(primerPrecio.attributes))
      }
    }
    
    return NextResponse.json({
      success: true,
      endpointUsado,
      totalPrecios: precios.length,
      data: precios.slice(0, 3), // Solo primeros 3 para no saturar
      estructura,
      primerPrecio,
      mensaje: 'Revisa los logs del servidor para ver la estructura completa'
    })
  } catch (error: any) {
    console.error('[Test Precios] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

