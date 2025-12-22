import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_sello" en WooCommerce
async function getSelloAttributeId(): Promise<number | null> {
  try {
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_sello' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
    const allAttributes = await wooCommerceClient.get<any[]>('products/attributes')
    const selloAttribute = allAttributes.find((attr: any) => 
      attr.slug === 'pa_sello' || 
      attr.slug === 'sello' ||
      attr.name?.toLowerCase().includes('sello')
    )
    
    if (selloAttribute) {
      return selloAttribute.id
    }
    
    return null
  } catch (error: any) {
    console.error('[API Sello] ❌ Error al obtener ID del atributo:', error.message)
    return null
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validar que el ID no sea una palabra reservada
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'marcas', 'autores', 'obras', 'serie-coleccion']
    if (reservedWords.includes(id.toLowerCase())) {
      console.warn('[API /tienda/sello/[id] GET] ⚠️ Intento de acceso a ruta reservada:', id)
      return NextResponse.json(
        { 
          success: false,
          error: `Ruta no válida. La ruta /api/tienda/sello/${id} no existe. Use /api/tienda/${id} en su lugar.`,
          data: null,
          hint: `Si está buscando ${id}, use el endpoint: /api/tienda/${id}`,
        },
        { status: 404 }
      )
    }
    
    console.log('[API /tienda/sello/[id] GET] Obteniendo sello:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
    })
    
    const selloEndpoint = '/api/sellos'
    
    // PASO 1: Intentar con filtro si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `${selloEndpoint}?filters[id][$eq]=${id}&populate=*`
        )
        
        let sello: any
        if (Array.isArray(filteredResponse)) {
          sello = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          sello = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          sello = filteredResponse.data
        } else {
          sello = filteredResponse
        }
        
        if (sello && (sello.id || sello.documentId)) {
          console.log('[API /tienda/sello/[id] GET] ✅ Sello encontrado con filtro')
          return NextResponse.json({
            success: true,
            data: sello
          }, { status: 200 })
        }
      } catch (filterError: any) {
        console.warn('[API /tienda/sello/[id] GET] ⚠️ Error al obtener con filtro:', filterError.message)
      }
    }
    
    // PASO 2: Buscar en lista completa
    try {
      const allSellos = await strapiClient.get<any>(
        `${selloEndpoint}?populate=*&pagination[pageSize]=1000`
      )
      
      let sellos: any[] = []
      
      if (Array.isArray(allSellos)) {
        sellos = allSellos
      } else if (Array.isArray(allSellos.data)) {
        sellos = allSellos.data
      } else if (allSellos.data && Array.isArray(allSellos.data.data)) {
        sellos = allSellos.data.data
      } else if (allSellos.data && !Array.isArray(allSellos.data)) {
        sellos = [allSellos.data]
      }
      
      const selloEncontrado = sellos.find((s: any) => {
        const sReal = s.attributes && Object.keys(s.attributes).length > 0 ? s.attributes : s
        
        const sId = sReal.id?.toString() || s.id?.toString()
        const sDocId = sReal.documentId?.toString() || s.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          sId === idStr ||
          sDocId === idStr ||
          (!isNaN(idNum) && (sReal.id === idNum || s.id === idNum))
        )
      })
      
      if (selloEncontrado) {
        console.log('[API /tienda/sello/[id] GET] ✅ Sello encontrado en lista completa')
        return NextResponse.json({
          success: true,
          data: selloEncontrado
        }, { status: 200 })
      }
    } catch (listError: any) {
      console.warn('[API /tienda/sello/[id] GET] ⚠️ Error al buscar en lista completa:', listError.message)
    }
    
    // PASO 3: Intentar endpoint directo
    try {
      const response = await strapiClient.get<any>(`${selloEndpoint}/${id}?populate=*`)
      
      let sello: any
      if (response.data) {
        sello = response.data
      } else {
        sello = response
      }
      
      if (sello) {
        console.log('[API /tienda/sello/[id] GET] ✅ Sello encontrado con endpoint directo')
        return NextResponse.json({
          success: true,
          data: sello
        }, { status: 200 })
      }
    } catch (directError: any) {
      console.error('[API /tienda/sello/[id] GET] ❌ Error al obtener sello:', directError.message)
    }
    
    return NextResponse.json({
      success: false,
      error: 'Sello no encontrado',
    }, { status: 404 })
    
  } catch (error: any) {
    console.error('[API /tienda/sello/[id] GET] ❌ Error general:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener sello',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validar que el ID no sea una palabra reservada
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'marcas', 'autores', 'obras', 'serie-coleccion']
    if (reservedWords.includes(id.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Ruta no válida. Use /api/tienda/${id} en su lugar.` },
        { status: 404 }
      )
    }
    
    console.log('[API Sello DELETE] 🗑️ Eliminando sello:', id)

    const selloEndpoint = '/api/sellos'
    
    // Primero obtener el sello de Strapi para obtener el documentId
    let documentId: string | null = null
    try {
      const selloResponse = await strapiClient.get<any>(`${selloEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let sellos: any[] = []
      if (Array.isArray(selloResponse)) {
        sellos = selloResponse
      } else if (selloResponse.data && Array.isArray(selloResponse.data)) {
        sellos = selloResponse.data
      } else if (selloResponse.data) {
        sellos = [selloResponse.data]
      }
      const selloStrapi = sellos[0]
      documentId = selloStrapi?.documentId || selloStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Sello DELETE] ⚠️ No se pudo obtener sello de Strapi:', error.message)
      documentId = id
    }

    // Obtener el ID del atributo
    const attributeId = await getSelloAttributeId()

    // Buscar en WooCommerce por slug (documentId) - no guardamos woocommerce_id en Strapi
    let woocommerceId: string | null = null
    if (documentId && attributeId) {
      try {
        console.log('[API Sello DELETE] 🔍 Buscando término en WooCommerce por slug:', documentId)
        const wcTerms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId.toString() }
        )
        if (wcTerms && wcTerms.length > 0) {
          woocommerceId = wcTerms[0].id.toString()
          console.log('[API Sello DELETE] ✅ Término encontrado en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Sello DELETE] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Eliminar en WooCommerce primero si tenemos el ID
    let wooCommerceDeleted = false
    if (woocommerceId && attributeId) {
      try {
        console.log('[API Sello DELETE] 🛒 Eliminando término en WooCommerce:', woocommerceId)
        await wooCommerceClient.delete<any>(`products/attributes/${attributeId}/terms/${woocommerceId}`, true)
        wooCommerceDeleted = true
        console.log('[API Sello DELETE] ✅ Término eliminado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Sello DELETE] ⚠️ Error al eliminar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Eliminar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${selloEndpoint}/${documentId}` : `${selloEndpoint}/${id}`
    console.log('[API Sello DELETE] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    const response = await strapiClient.delete<any>(strapiEndpoint)
    console.log('[API Sello DELETE] ✅ Sello eliminado en Strapi')

    return NextResponse.json({
      success: true,
      message: 'Sello eliminado exitosamente' + (wooCommerceDeleted ? ' en WooCommerce y Strapi' : ' en Strapi'),
      data: response
    })

  } catch (error: any) {
    console.error('[API Sello DELETE] ❌ ERROR al eliminar sello:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar el sello',
      details: error.details
    }, { status: error.status || 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validar que el ID no sea una palabra reservada
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'marcas', 'autores', 'obras', 'serie-coleccion']
    if (reservedWords.includes(id.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Ruta no válida. Use /api/tienda/${id} en su lugar.` },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    console.log('[API Sello PUT] ✏️ Actualizando sello:', id, body)

    const selloEndpoint = '/api/sellos'
    
    // Primero obtener el sello de Strapi para obtener el documentId
    let selloStrapi: any
    let documentId: string | null = null
    try {
      const selloResponse = await strapiClient.get<any>(`${selloEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let sellos: any[] = []
      if (Array.isArray(selloResponse)) {
        sellos = selloResponse
      } else if (selloResponse.data && Array.isArray(selloResponse.data)) {
        sellos = selloResponse.data
      } else if (selloResponse.data) {
        sellos = [selloResponse.data]
      }
      selloStrapi = sellos[0]
      documentId = selloStrapi?.documentId || selloStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Sello PUT] ⚠️ No se pudo obtener sello de Strapi:', error.message)
      documentId = id
    }

    // Obtener el ID del atributo
    const attributeId = await getSelloAttributeId()

    // Buscar en WooCommerce por slug (documentId) - no guardamos woocommerce_id en Strapi
    let woocommerceId: string | null = null
    if (documentId && attributeId) {
      // Buscar por slug (documentId) en WooCommerce
      try {
        console.log('[API Sello PUT] 🔍 Buscando término en WooCommerce por slug:', documentId)
        const wcTerms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId.toString() }
        )
        if (wcTerms && wcTerms.length > 0) {
          woocommerceId = wcTerms[0].id.toString()
          console.log('[API Sello PUT] ✅ Término encontrado en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Sello PUT] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Actualizar en WooCommerce primero si tenemos el ID
    let wooCommerceTerm = null
    if (woocommerceId && attributeId) {
      try {
        console.log('[API Sello PUT] 🛒 Actualizando término en WooCommerce:', woocommerceId)
        
        const wooCommerceTermData: any = {}
        if (body.data.nombre_sello || body.data.nombreSello || body.data.nombre) {
          wooCommerceTermData.name = (body.data.nombre_sello || body.data.nombreSello || body.data.nombre).trim()
        }
        if (body.data.descripcion !== undefined || body.data.description !== undefined) {
          wooCommerceTermData.description = body.data.descripcion || body.data.description || ''
        }

        wooCommerceTerm = await wooCommerceClient.put<any>(
          `products/attributes/${attributeId}/terms/${woocommerceId}`,
          wooCommerceTermData
        )
        console.log('[API Sello PUT] ✅ Término actualizado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Sello PUT] ⚠️ Error al actualizar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Actualizar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${selloEndpoint}/${documentId}` : `${selloEndpoint}/${id}`
    console.log('[API Sello PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    // El schema de Strapi para sello usa: id_sello* (Number), nombre_sello* (Text), acronimo, logo, website, editorial
    const selloData: any = {
      data: {}
    }

    // Aceptar diferentes formatos del formulario pero guardar según schema real
    if (body.data.id_sello !== undefined) {
      selloData.data.id_sello = typeof body.data.id_sello === 'string' ? parseInt(body.data.id_sello) : body.data.id_sello
    }
    if (body.data.idSello !== undefined) {
      selloData.data.id_sello = typeof body.data.idSello === 'string' ? parseInt(body.data.idSello) : body.data.idSello
    }
    
    if (body.data.nombre_sello) selloData.data.nombre_sello = body.data.nombre_sello.trim()
    if (body.data.nombreSello) selloData.data.nombre_sello = body.data.nombreSello.trim()
    if (body.data.nombre) selloData.data.nombre_sello = body.data.nombre.trim()
    
    if (body.data.acronimo !== undefined) selloData.data.acronimo = body.data.acronimo?.trim() || null
    if (body.data.website !== undefined) selloData.data.website = body.data.website?.trim() || null
    
    // Manejar relaciones según tipo
    // manyToOne: solo el ID o documentId (o null para desconectar)
    if (body.data.editorial !== undefined) {
      selloData.data.editorial = body.data.editorial || null
    }

    // oneToMany: array de IDs o documentIds (o [] para limpiar todas)
    if (body.data.libros !== undefined) {
      selloData.data.libros = body.data.libros && body.data.libros.length > 0 ? body.data.libros : []
    }
    
    if (body.data.colecciones !== undefined) {
      selloData.data.colecciones = body.data.colecciones && body.data.colecciones.length > 0 ? body.data.colecciones : []
    }

    // Media: solo el ID (o null para eliminar)
    if (body.data.logo !== undefined) {
      selloData.data.logo = body.data.logo || null
    }

    // Estado de publicación
    if (body.estado_publicacion !== undefined && body.estado_publicacion !== '') {
      selloData.data.estado_publicacion = body.estado_publicacion
    }
    if (body.data?.estado_publicacion !== undefined && body.data.estado_publicacion !== '') {
      selloData.data.estado_publicacion = body.data.estado_publicacion
    }

    // No guardamos woocommerce_id en Strapi porque no existe en el schema
    // El match se hace usando documentId como slug en WooCommerce

    const strapiResponse = await strapiClient.put<any>(strapiEndpoint, selloData)
    console.log('[API Sello PUT] ✅ Sello actualizado en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceTerm,
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Sello actualizado exitosamente' + (wooCommerceTerm ? ' en WooCommerce y Strapi' : ' en Strapi')
    })

  } catch (error: any) {
    console.error('[API Sello PUT] ❌ ERROR al actualizar sello:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar el sello',
      details: error.details
    }, { status: error.status || 500 })
  }
}
