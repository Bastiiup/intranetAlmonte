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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Colecciones POST] 📝 Creando colección:', body)

    // Validar nombre obligatorio
    if (!body.data?.nombre_coleccion) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la colección es obligatorio'
      }, { status: 400 })
    }

    // Crear en Strapi
    console.log('[API Colecciones POST] 📚 Creando colección en Strapi...')
    
    const coleccionData: any = {
      data: {
        nombre_coleccion: body.data.nombre_coleccion.trim(),
        id_coleccion: body.data.id_coleccion ? parseInt(body.data.id_coleccion) : null,
        editorial: body.data.editorial || null,
        sello: body.data.sello || null,
        estado_publicacion: body.data.estado_publicacion || 'Pendiente',
      },
    }

    const response = await strapiClient.post('/api/colecciones', coleccionData) as any
    
    console.log('[API Colecciones POST] ✅ Colección creada en Strapi:', response.id || response.documentId)
    
    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error: any) {
    console.error('[API Colecciones POST] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la colección'
    }, { status: 500 })
  }
}

