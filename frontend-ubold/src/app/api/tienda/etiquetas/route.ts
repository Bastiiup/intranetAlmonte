import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/etiquetas?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET etiquetas] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET etiquetas] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las etiquetas: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Etiquetas POST] 📝 Creando etiqueta:', body)

    // Validar nombre obligatorio (el schema usa 'name')
    if (!body.data?.name && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la etiqueta es obligatorio'
      }, { status: 400 })
    }

    const nombreEtiqueta = body.data.name || body.data.nombre

    const etiquetaEndpoint = '/api/etiquetas'
    console.log('[API Etiquetas POST] Usando endpoint Strapi:', etiquetaEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    console.log('[API Etiquetas POST] 📚 Creando etiqueta en Strapi primero...')
    
    const estadoPublicacion = 'pendiente' // Siempre pendiente al crear
    
    console.log('[API Etiquetas POST] 📚 Creando etiqueta en Strapi...')
    console.log('[API Etiquetas POST] Estado de publicación:', estadoPublicacion, '(siempre pendiente al crear)')
    
    // Preparar datos para Strapi (usar nombres del schema real: name, descripcion)
    const etiquetaData: any = {
      data: {
        name: nombreEtiqueta.trim(), // El schema usa 'name'
        descripcion: body.data.descripcion || body.data.description || null,
        estado_publicacion: estadoPublicacion, // Siempre "pendiente" al crear (minúscula para Strapi)
      }
    }

    const strapiTag = await strapiClient.post<any>(etiquetaEndpoint, etiquetaData)
    
    console.log('[API Etiquetas POST] ✅ Etiqueta creada en Strapi:', {
      id: strapiTag.data?.id || strapiTag.id,
      documentId: strapiTag.data?.documentId || strapiTag.documentId
    })
    console.log('[API Etiquetas POST] Estado: ⏸️ Solo guardado en Strapi (pendiente), no se publica en WordPress')
    console.log('[API Etiquetas POST] Para publicar, cambiar el estado desde la página de Solicitudes')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiTag.data || strapiTag,
      },
      message: 'Etiqueta creada en Strapi con estado "pendiente". Para publicar en WordPress, cambia el estado desde Solicitudes.'
    })

  } catch (error: any) {
    console.error('[API Etiquetas POST] ❌ ERROR al crear etiqueta:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la etiqueta',
      details: error.details
    }, { status: error.status || 500 })
  }
}

