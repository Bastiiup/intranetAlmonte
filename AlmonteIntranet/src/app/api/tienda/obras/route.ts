import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/obras?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET obras] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET obras] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las obras: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Obras POST] 📝 Creando obra:', body)

    // Validar campos obligatorios según schema de Strapi
    if (!body.data?.codigo_obra && !body.data?.codigoObra) {
      return NextResponse.json({
        success: false,
        error: 'El código de la obra es obligatorio'
      }, { status: 400 })
    }

    if (!body.data?.nombre_obra && !body.data?.nombreObra && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la obra es obligatorio'
      }, { status: 400 })
    }

    const codigoObra = body.data.codigo_obra || body.data.codigoObra
    const nombreObra = body.data.nombre_obra || body.data.nombreObra || body.data.nombre
    const obraEndpoint = '/api/obras'
    console.log('[API Obras POST] Usando endpoint Strapi:', obraEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    // El documentId se usará como slug en WooCommerce para hacer el match
    console.log('[API Obras POST] 📚 Creando obra en Strapi primero...')
    
    // IMPORTANTE: Al crear, siempre se guarda con estado_publicacion = "pendiente" (minúscula)
    // El estado solo se puede cambiar desde la página de Solicitudes
    // Solo se publica en WordPress si estado_publicacion === "publicado" (se maneja en lifecycles de Strapi)
    const estadoPublicacion = 'pendiente'
    
    console.log('[API Obras POST] 📚 Creando obra en Strapi...')
    console.log('[API Obras POST] Estado de publicación:', estadoPublicacion, '(siempre pendiente al crear)')
    console.log('[API Obras POST] ⏸️ No se crea en WooCommerce al crear - se sincronizará cuando estado_publicacion = "publicado"')
    
    // El schema de Strapi para obras usa: codigo_obra*, nombre_obra*, descripcion, estado_publicacion
    const obraData: any = {
      data: {
        codigo_obra: codigoObra.trim(),
        nombre_obra: nombreObra.trim(),
        descripcion: body.data.descripcion || body.data.description || null,
        estado_publicacion: estadoPublicacion, // Siempre "pendiente" al crear (minúscula para Strapi)
      }
    }

    const strapiObra = await strapiClient.post<any>(obraEndpoint, obraData)
    const documentId = strapiObra.data?.documentId || strapiObra.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API Obras POST] ✅ Obra creada en Strapi:', {
      id: strapiObra.data?.id || strapiObra.id,
      documentId: documentId
    })
    console.log('[API Obras POST] Estado: ⏸️ Solo guardado en Strapi (pendiente), no se publica en WordPress')
    console.log('[API Obras POST] Para publicar, cambiar el estado desde la página de Solicitudes')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiObra.data || strapiObra,
      },
      message: 'Obra creada en Strapi con estado "pendiente". Para publicar en WordPress, cambia el estado desde Solicitudes.'
    })

  } catch (error: any) {
    console.error('[API Obras POST] ❌ ERROR al crear obra:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la obra',
      details: error.details
    }, { status: error.status || 500 })
  }
}

