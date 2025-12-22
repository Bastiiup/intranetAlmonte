import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_serie_coleccion" en WooCommerce
async function getSerieColeccionAttributeId(): Promise<number | null> {
  try {
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_serie_coleccion' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
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
      return endpoint
    } catch (error) {
      // Continuar con el siguiente
    }
  }
  
  return '/api/serie-coleccions'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validar que el ID no sea una palabra reservada
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'marcas', 'autores', 'obras', 'sellos']
    if (reservedWords.includes(id.toLowerCase())) {
      console.warn('[API /tienda/serie-coleccion/[id] GET] ⚠️ Intento de acceso a ruta reservada:', id)
      return NextResponse.json(
        { 
          success: false,
          error: `Ruta no válida. La ruta /api/tienda/serie-coleccion/${id} no existe. Use /api/tienda/${id} en su lugar.`,
          data: null,
          hint: `Si está buscando ${id}, use el endpoint: /api/tienda/${id}`,
        },
        { status: 404 }
      )
    }
    
    const serieColeccionEndpoint = await getSerieColeccionEndpoint()
    
    // Intentar obtener por documentId primero
    let serieColeccion: any = null
    try {
      serieColeccion = await strapiClient.get<any>(`${serieColeccionEndpoint}/${id}?populate=*`)
    } catch (error: any) {
      // Si falla, intentar buscar por ID numérico
      console.log('[API SerieColeccion GET] Intentando buscar por ID numérico...')
      try {
        const allSerieColecciones = await strapiClient.get<any>(`${serieColeccionEndpoint}?populate=*&pagination[pageSize]=1000`)
        const items = Array.isArray(allSerieColecciones) 
          ? allSerieColecciones 
          : (allSerieColecciones.data || [])
        
        serieColeccion = items.find((item: any) => 
          item.id?.toString() === id || 
          item.documentId === id ||
          item.attributes?.id?.toString() === id ||
          item.attributes?.id_coleccion?.toString() === id
        )
      } catch (searchError: any) {
        console.error('[API SerieColeccion GET] Error en búsqueda:', searchError.message)
      }
    }

    if (!serieColeccion) {
      return NextResponse.json({
        success: false,
        error: 'Serie/Colección no encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: serieColeccion
    })
  } catch (error: any) {
    console.error('[API SerieColeccion GET] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener la serie/colección'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validar que el ID no sea una palabra reservada
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'marcas', 'autores', 'obras', 'sellos']
    if (reservedWords.includes(id.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Ruta no válida. Use /api/tienda/${id} en su lugar.` },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    console.log('[API SerieColeccion PUT] 📝 Actualizando serie-coleccion:', id, body)

    const serieColeccionEndpoint = await getSerieColeccionEndpoint()
    
    // Obtener la serie-coleccion actual para obtener el documentId
    let currentSerieColeccion: any = null
    try {
      currentSerieColeccion = await strapiClient.get<any>(`${serieColeccionEndpoint}/${id}?populate=*`)
    } catch (error: any) {
      // Intentar buscar por ID
      const allSerieColecciones = await strapiClient.get<any>(`${serieColeccionEndpoint}?populate=*&pagination[pageSize]=1000`)
      const items = Array.isArray(allSerieColecciones) 
        ? allSerieColecciones 
        : (allSerieColecciones.data || [])
      
      currentSerieColeccion = items.find((item: any) => 
        item.id?.toString() === id || 
        item.documentId === id ||
        item.attributes?.id?.toString() === id ||
        item.attributes?.id_coleccion?.toString() === id
      )
    }

    if (!currentSerieColeccion) {
      return NextResponse.json({
        success: false,
        error: 'Serie/Colección no encontrada'
      }, { status: 404 })
    }

    const documentId = currentSerieColeccion.documentId || currentSerieColeccion.data?.documentId || id

    // Actualizar en WooCommerce primero usando el slug (documentId)
    const attributeId = await getSerieColeccionAttributeId()
    if (attributeId) {
      try {
        // Buscar el término por slug (documentId)
        const terms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId }
        )

        if (terms && terms.length > 0) {
          const term = terms[0]
          const wooCommerceTermData: any = {}
          
          // Actualizar nombre si se proporciona
          const nombreColeccion = body.data?.nombre_coleccion || body.data?.nombreColeccion || body.data?.nombre
          if (nombreColeccion) {
            wooCommerceTermData.name = nombreColeccion.trim()
          }

          if (Object.keys(wooCommerceTermData).length > 0) {
            await wooCommerceClient.put<any>(
              `products/attributes/${attributeId}/terms/${term.id}`,
              wooCommerceTermData
            )
            console.log('[API SerieColeccion PUT] ✅ Término actualizado en WooCommerce')
          }
        }
      } catch (wooError: any) {
        console.warn('[API SerieColeccion PUT] ⚠️ Error al actualizar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Actualizar en Strapi
    const serieColeccionData: any = {
      data: {}
    }

    // Campos obligatorios
    if (body.data.id_coleccion !== undefined) {
      serieColeccionData.data.id_coleccion = typeof body.data.id_coleccion === 'string' 
        ? parseInt(body.data.id_coleccion) 
        : body.data.id_coleccion
    }
    
    if (body.data.nombre_coleccion) {
      serieColeccionData.data.nombre_coleccion = body.data.nombre_coleccion.trim()
    }
    if (body.data.nombreColeccion) {
      serieColeccionData.data.nombre_coleccion = body.data.nombreColeccion.trim()
    }
    if (body.data.nombre) {
      serieColeccionData.data.nombre_coleccion = body.data.nombre.trim()
    }

    // Relaciones manyToOne
    if (body.data.editorial !== undefined) {
      serieColeccionData.data.editorial = body.data.editorial || null
    }

    if (body.data.sello !== undefined) {
      serieColeccionData.data.sello = body.data.sello || null
    }

    // Relaciones oneToMany
    if (body.data.libros !== undefined) {
      serieColeccionData.data.libros = body.data.libros && body.data.libros.length > 0 ? body.data.libros : []
    }

    // externalIds
    if (body.data.externalIds !== undefined) {
      serieColeccionData.data.externalIds = body.data.externalIds || null
    }

    const strapiResponse = await strapiClient.put<any>(`${serieColeccionEndpoint}/${documentId}`, serieColeccionData)
    console.log('[API SerieColeccion PUT] ✅ Serie-coleccion actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: strapiResponse.data || strapiResponse
    })
  } catch (error: any) {
    console.error('[API SerieColeccion PUT] ❌ ERROR al actualizar serie-coleccion:', {
      message: error.message,
      status: error.status || 500,
      details: error.details || {}
    })

    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la serie/colección',
      details: error.details || {}
    }, { status: error.status || 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validar que el ID no sea una palabra reservada
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'marcas', 'autores', 'obras', 'sellos']
    if (reservedWords.includes(id.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Ruta no válida. Use /api/tienda/${id} en su lugar.` },
        { status: 404 }
      )
    }
    
    console.log('[API SerieColeccion DELETE] 🗑️ Eliminando serie-coleccion:', id)

    const serieColeccionEndpoint = await getSerieColeccionEndpoint()
    
    // Obtener la serie-coleccion para obtener el documentId
    let currentSerieColeccion: any = null
    try {
      currentSerieColeccion = await strapiClient.get<any>(`${serieColeccionEndpoint}/${id}?populate=*`)
    } catch (error: any) {
      const allSerieColecciones = await strapiClient.get<any>(`${serieColeccionEndpoint}?populate=*&pagination[pageSize]=1000`)
      const items = Array.isArray(allSerieColecciones) 
        ? allSerieColecciones 
        : (allSerieColecciones.data || [])
      
      currentSerieColeccion = items.find((item: any) => 
        item.id?.toString() === id || 
        item.documentId === id ||
        item.attributes?.id?.toString() === id ||
        item.attributes?.id_coleccion?.toString() === id
      )
    }

    if (!currentSerieColeccion) {
      return NextResponse.json({
        success: false,
        error: 'Serie/Colección no encontrada'
      }, { status: 404 })
    }

    const documentId = currentSerieColeccion.documentId || currentSerieColeccion.data?.documentId || id

    // Eliminar de WooCommerce primero usando el slug (documentId)
    const attributeId = await getSerieColeccionAttributeId()
    if (attributeId) {
      try {
        const terms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId }
        )

        if (terms && terms.length > 0) {
          await wooCommerceClient.delete<any>(
            `products/attributes/${attributeId}/terms/${terms[0].id}`,
            true
          )
          console.log('[API SerieColeccion DELETE] ✅ Término eliminado de WooCommerce')
        }
      } catch (wooError: any) {
        console.warn('[API SerieColeccion DELETE] ⚠️ Error al eliminar de WooCommerce (no crítico):', wooError.message)
      }
    }

    // Eliminar de Strapi
    await strapiClient.delete<any>(`${serieColeccionEndpoint}/${documentId}`)
    console.log('[API SerieColeccion DELETE] ✅ Serie-coleccion eliminada de Strapi')

    return NextResponse.json({
      success: true,
      message: 'Serie/Colección eliminada correctamente'
    })
  } catch (error: any) {
    console.error('[API SerieColeccion DELETE] ❌ ERROR al eliminar serie-coleccion:', error.message)

    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la serie/colección'
    }, { status: error.status || 500 })
  }
}

