import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/marcas?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET marca] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET marca] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las marcas: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Marca POST] 📝 Creando marca:', body)

    // Validar campos obligatorios según schema de Strapi (usa "name", no "nombre_marca")
    if (!body.data?.name && !body.data?.nombre_marca && !body.data?.nombreMarca && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la marca es obligatorio'
      }, { status: 400 })
    }

    const nombreMarca = body.data.name || body.data.nombre_marca || body.data.nombreMarca || body.data.nombre
    const marcaEndpoint = '/api/marcas'
    
    const estadoPublicacion = 'pendiente' // Siempre pendiente al crear
    
    console.log('[API Marca POST] 📚 Creando marca en Strapi...')
    console.log('[API Marca POST] Estado de publicación:', estadoPublicacion, '(siempre pendiente al crear)')
    
    // El schema de Strapi para marca usa: name* (Text), descripcion (Text), imagen (Media)
    const marcaData: any = {
      data: {
        name: nombreMarca.trim(),
        descripcion: body.data.descripcion || null,
        estado_publicacion: estadoPublicacion, // Siempre "pendiente" al crear (minúscula para Strapi)
      }
    }

    // Manejar imagen (media)
    if (body.data.imagen) {
      marcaData.data.imagen = body.data.imagen
    }

    const strapiMarca = await strapiClient.post<any>(marcaEndpoint, marcaData)
    
    console.log('[API Marca POST] ✅ Marca creada en Strapi:', {
      id: strapiMarca.data?.id || strapiMarca.id,
      documentId: strapiMarca.data?.documentId || strapiMarca.documentId
    })
    console.log('[API Marca POST] Estado: ⏸️ Solo guardado en Strapi (pendiente), no se publica en WordPress')
    console.log('[API Marca POST] Para publicar, cambiar el estado desde la página de Solicitudes')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiMarca.data || strapiMarca,
      },
      message: 'Marca creada en Strapi con estado "pendiente". Para publicar en WordPress, cambia el estado desde Solicitudes.'
    })

  } catch (error: any) {
    console.error('[API Marca POST] ❌ ERROR al crear marca:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la marca',
      details: error.details
    }, { status: error.status || 500 })
  }
}

