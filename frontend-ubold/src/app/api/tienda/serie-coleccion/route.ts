import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_serie_coleccion" en WooCommerce
async function getSerieColeccionAttributeId(): Promise<number | null> {
  try {
    // Buscar atributo por slug "pa_serie_coleccion" o variaciones
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_serie_coleccion' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
    // Si no se encuentra por slug, buscar por nombre
    const allAttributes = await wooCommerceClient.get<any[]>('products/attributes')
    const serieColeccionAttribute = allAttributes.find((attr: any) => 
      attr.slug === 'pa_serie_coleccion' || 
      attr.slug === 'serie_coleccion' ||
      attr.slug === 'serie-coleccion' ||
      attr.name?.toLowerCase().includes('serie') ||
      attr.name?.toLowerCase().includes('coleccion') ||
      attr.name?.toLowerCase().includes('collection')
    )
    
    if (serieColeccionAttribute) {
      return serieColeccionAttribute.id
    }
    
    console.warn('[API SerieColeccion] ⚠️ No se encontró el atributo "pa_serie_coleccion" en WooCommerce')
    return null
  } catch (error: any) {
    console.error('[API SerieColeccion] ❌ Error al obtener ID del atributo:', error.message)
    return null
  }
}

// Función helper para detectar el endpoint correcto de Strapi
async function getSerieColeccionEndpoint(): Promise<string> {
  const endpoints = ['/api/serie-coleccions', '/api/colecciones-series', '/api/colecciones']
  
  for (const endpoint of endpoints) {
    try {
      await strapiClient.get<any>(`${endpoint}?pagination[pageSize]=1`)
      console.log('[API SerieColeccion] ✅ Endpoint encontrado:', endpoint)
      return endpoint
    } catch (error) {
      // Continuar con el siguiente endpoint
    }
  }
  
  // Por defecto usar el primero
  console.warn('[API SerieColeccion] ⚠️ No se pudo verificar endpoint, usando /api/serie-coleccions por defecto')
  return '/api/serie-coleccions'
}

export async function GET(request: NextRequest) {
  try {
    const serieColeccionEndpoint = await getSerieColeccionEndpoint()
    const response = await strapiClient.get<any>(`${serieColeccionEndpoint}?populate=*&pagination[pageSize]=1000`)
    
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
    
    console.log('[API GET serie-coleccion] ✅ Items obtenidos:', items.length, 'desde:', serieColeccionEndpoint)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET serie-coleccion] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las series/colecciones: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API SerieColeccion POST] 📝 Creando serie-coleccion:', body)

    // Validar campos obligatorios según schema de Strapi
    // Schema: id_coleccion* (Number), nombre_coleccion* (Text), editorial, sello, libros, externalIds
    if (!body.data?.id_coleccion && body.data?.id_coleccion !== 0) {
      return NextResponse.json({
        success: false,
        error: 'El ID de la colección es obligatorio'
      }, { status: 400 })
    }

    if (!body.data?.nombre_coleccion && !body.data?.nombreColeccion && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la colección es obligatorio'
      }, { status: 400 })
    }

    const idColeccion = body.data.id_coleccion || body.data.idColeccion
    const nombreColeccion = body.data.nombre_coleccion || body.data.nombreColeccion || body.data.nombre
    const serieColeccionEndpoint = await getSerieColeccionEndpoint()
    console.log('[API SerieColeccion POST] Usando endpoint Strapi:', serieColeccionEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    // El documentId se usará como slug en WooCommerce para hacer el match
    console.log('[API SerieColeccion POST] 📚 Creando serie-coleccion en Strapi primero...')
    
    // El schema de Strapi para serie-coleccion usa: id_coleccion* (Number), nombre_coleccion* (Text), editorial, sello, libros, externalIds
    const serieColeccionData: any = {
      data: {
        id_coleccion: typeof idColeccion === 'string' ? parseInt(idColeccion) : idColeccion,
        nombre_coleccion: nombreColeccion.trim(),
      }
    }

    // Manejar relaciones según tipo
    // manyToOne: solo el ID o documentId
    if (body.data.editorial) {
      serieColeccionData.data.editorial = body.data.editorial
    }

    if (body.data.sello) {
      serieColeccionData.data.sello = body.data.sello
    }

    // oneToMany: array de IDs o documentIds
    if (body.data.libros && body.data.libros.length > 0) {
      serieColeccionData.data.libros = body.data.libros
    }

    // externalIds (JSON)
    if (body.data.externalIds) {
      serieColeccionData.data.externalIds = body.data.externalIds
    }

    const strapiSerieColeccion = await strapiClient.post<any>(serieColeccionEndpoint, serieColeccionData)
    const documentId = strapiSerieColeccion.data?.documentId || strapiSerieColeccion.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API SerieColeccion POST] ✅ Serie-coleccion creada en Strapi:', {
      id: strapiSerieColeccion.data?.id || strapiSerieColeccion.id,
      documentId: documentId
    })

    // Obtener el ID del atributo "pa_serie_coleccion" en WooCommerce
    const attributeId = await getSerieColeccionAttributeId()
    
    if (!attributeId) {
      console.warn('[API SerieColeccion POST] ⚠️ No se pudo obtener el ID del atributo, eliminando de Strapi')
      try {
        await strapiClient.delete<any>(`${serieColeccionEndpoint}/${documentId}`)
      } catch (deleteError: any) {
        console.error('[API SerieColeccion POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
      }
      return NextResponse.json({
        success: false,
        error: 'No se encontró el atributo "pa_serie_coleccion" en WooCommerce. Asegúrate de que existe.'
      }, { status: 400 })
    }

    // Crear término en WooCommerce usando el documentId como slug
    console.log('[API SerieColeccion POST] 🛒 Creando término en WooCommerce...')
    try {
      const wooCommerceTermData = {
        name: nombreColeccion.trim(),
        slug: documentId, // Usar documentId como slug para sincronización
      }

      const wooCommerceTerm = await wooCommerceClient.post<any>(
        `products/attributes/${attributeId}/terms`,
        wooCommerceTermData
      )

      console.log('[API SerieColeccion POST] ✅ Término creado en WooCommerce:', {
        id: wooCommerceTerm.id,
        name: wooCommerceTerm.name,
        slug: wooCommerceTerm.slug
      })

      return NextResponse.json({
        success: true,
        data: {
          ...strapiSerieColeccion.data || strapiSerieColeccion,
          woocommerce_term: wooCommerceTerm
        }
      })
    } catch (wooError: any) {
      console.error('[API SerieColeccion POST] ❌ Error al crear término en WooCommerce:', wooError.message)
      
      // Si el error es que el término ya existe, no es crítico
      if (wooError.message?.includes('term_exists') || wooError.message?.includes('already exists')) {
        console.warn('[API SerieColeccion POST] ⚠️ El término ya existe en WooCommerce (no crítico)')
        return NextResponse.json({
          success: true,
          data: strapiSerieColeccion.data || strapiSerieColeccion,
          warning: 'La serie/colección ya existe en WooCommerce'
        })
      }

      // Si es otro error, hacer rollback eliminando de Strapi
      console.warn('[API SerieColeccion POST] ⚠️ Error al crear en WooCommerce, eliminando de Strapi...')
      try {
        await strapiClient.delete<any>(`${serieColeccionEndpoint}/${documentId}`)
      } catch (deleteError: any) {
        console.error('[API SerieColeccion POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
      }

      return NextResponse.json({
        success: false,
        error: `Error al crear en WooCommerce: ${wooError.message}`
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[API SerieColeccion POST] ❌ ERROR al crear serie-coleccion:', {
      message: error.message,
      status: error.status || 500,
      details: error.details || {}
    })

    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la serie/colección',
      details: error.details || {}
    }, { status: error.status || 500 })
  }
}

