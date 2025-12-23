import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/sellos?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET sello] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET sello] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar los sellos: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Sello POST] 📝 Creando sello:', body)

    // Validar campos obligatorios según schema de Strapi
    if (!body.data?.id_sello && body.data?.id_sello !== 0) {
      return NextResponse.json({
        success: false,
        error: 'El ID del sello es obligatorio'
      }, { status: 400 })
    }

    if (!body.data?.nombre_sello && !body.data?.nombreSello && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre del sello es obligatorio'
      }, { status: 400 })
    }

    const idSello = body.data.id_sello || body.data.idSello
    const nombreSello = body.data.nombre_sello || body.data.nombreSello || body.data.nombre
    const selloEndpoint = '/api/sellos'
    console.log('[API Sello POST] Usando endpoint Strapi:', selloEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    // El documentId se usará como slug en WooCommerce para hacer el match
    console.log('[API Sello POST] 📚 Creando sello en Strapi primero...')
    
    // El schema de Strapi para sello usa: id_sello* (Number), nombre_sello* (Text), acronimo, logo, website, editorial, colecciones, libros
    const estadoPublicacion = 'pendiente' // Siempre pendiente al crear
    
    console.log('[API Sello POST] 📚 Creando sello en Strapi...')
    console.log('[API Sello POST] Estado de publicación:', estadoPublicacion, '(siempre pendiente al crear)')
    
    const selloData: any = {
      data: {
        id_sello: typeof idSello === 'string' ? parseInt(idSello) : idSello,
        nombre_sello: nombreSello.trim(),
        acronimo: body.data.acronimo || null,
        website: body.data.website || null,
        estado_publicacion: estadoPublicacion, // Siempre "pendiente" al crear (minúscula para Strapi)
      }
    }

    // Manejar relaciones según tipo
    // manyToOne: solo el ID o documentId
    if (body.data.editorial) {
      selloData.data.editorial = body.data.editorial
    }

    // oneToMany: array de IDs o documentIds
    if (body.data.libros && body.data.libros.length > 0) {
      selloData.data.libros = body.data.libros
    }

    if (body.data.colecciones && body.data.colecciones.length > 0) {
      selloData.data.colecciones = body.data.colecciones
    }

    // Media: solo el ID
    if (body.data.logo) {
      selloData.data.logo = body.data.logo
    }

    const strapiSello = await strapiClient.post<any>(selloEndpoint, selloData)
    
    console.log('[API Sello POST] ✅ Sello creado en Strapi:', {
      id: strapiSello.data?.id || strapiSello.id,
      documentId: strapiSello.data?.documentId || strapiSello.documentId
    })
    console.log('[API Sello POST] Estado: ⏸️ Solo guardado en Strapi (pendiente), no se publica en WordPress')
    console.log('[API Sello POST] Para publicar, cambiar el estado desde la página de Solicitudes')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiSello.data || strapiSello,
      },
      message: 'Sello creado en Strapi con estado "pendiente". Para publicar en WordPress, cambia el estado desde Solicitudes.'
    })

  } catch (error: any) {
    console.error('[API Sello POST] ❌ ERROR al crear sello:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el sello',
      details: error.details
    }, { status: error.status || 500 })
  }
}

