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

    // IMPORTANTE: Al crear, siempre se guarda con estado_publicacion = "pendiente" (minúscula)
    // El estado solo se puede cambiar desde la página de Solicitudes
    // Solo se publica en WordPress si estado_publicacion === "publicado" (se maneja en lifecycles de Strapi)
    const estadoPublicacion = 'pendiente'
    
    console.log('[API Colecciones POST] 📚 Creando colección en Strapi...')
    console.log('[API Colecciones POST] Estado de publicación:', estadoPublicacion, '(siempre pendiente al crear)')
    
    const coleccionData: any = {
      data: {
        nombre_coleccion: body.data.nombre_coleccion.trim(),
        id_coleccion: body.data.id_coleccion ? parseInt(body.data.id_coleccion) : null,
        editorial: body.data.editorial || null,
        sello: body.data.sello || null,
        estado_publicacion: estadoPublicacion, // Siempre "pendiente" al crear (minúscula para Strapi)
      },
    }

    const response = await strapiClient.post('/api/colecciones', coleccionData) as any
    
    console.log('[API Colecciones POST] ✅ Colección creada en Strapi:', response.id || response.documentId)
    console.log('[API Colecciones POST] Estado: ⏸️ Solo guardado en Strapi (pendiente), no se publica en WordPress')
    console.log('[API Colecciones POST] Para publicar, cambiar el estado desde la página de Solicitudes')
    
    return NextResponse.json({
      success: true,
      data: response,
      message: 'Colección creada en Strapi con estado "pendiente". Para publicar en WordPress, cambia el estado desde Solicitudes.'
    })
  } catch (error: any) {
    console.error('[API Colecciones POST] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la colección'
    }, { status: 500 })
  }
}

