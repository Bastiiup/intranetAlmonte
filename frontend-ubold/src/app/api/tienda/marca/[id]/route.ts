import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_marca" en WooCommerce
async function getMarcaAttributeId(): Promise<number | null> {
  try {
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_marca' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
    const allAttributes = await wooCommerceClient.get<any[]>('products/attributes')
    const marcaAttribute = allAttributes.find((attr: any) => 
      attr.slug === 'pa_marca' || 
      attr.slug === 'marca' ||
      attr.name?.toLowerCase().includes('marca')
    )
    
    if (marcaAttribute) {
      return marcaAttribute.id
    }
    
    return null
  } catch (error: any) {
    console.error('[API Marca] ❌ Error al obtener ID del atributo:', error.message)
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
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'obras', 'autores', 'sellos', 'serie-coleccion']
    if (reservedWords.includes(id.toLowerCase())) {
      console.warn('[API /tienda/marca/[id] GET] ⚠️ Intento de acceso a ruta reservada:', id)
      return NextResponse.json(
        { 
          success: false,
          error: `Ruta no válida. La ruta /api/tienda/marca/${id} no existe. Use /api/tienda/${id} en su lugar.`,
          data: null,
          hint: `Si está buscando ${id}, use el endpoint: /api/tienda/${id}`,
        },
        { status: 404 }
      )
    }
    
    console.log('[API /tienda/marca/[id] GET] Obteniendo marca:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
    })
    
    const marcaEndpoint = '/api/marcas'
    
    // PASO 1: Intentar con filtro si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `${marcaEndpoint}?filters[id][$eq]=${id}&populate=*`
        )
        
        let marca: any
        if (Array.isArray(filteredResponse)) {
          marca = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          marca = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          marca = filteredResponse.data
        } else {
          marca = filteredResponse
        }
        
        if (marca && (marca.id || marca.documentId)) {
          console.log('[API /tienda/marca/[id] GET] ✅ Marca encontrada con filtro')
          return NextResponse.json({
            success: true,
            data: marca
          }, { status: 200 })
        }
      } catch (filterError: any) {
        console.warn('[API /tienda/marca/[id] GET] ⚠️ Error al obtener con filtro:', filterError.message)
      }
    }
    
    // PASO 2: Buscar en lista completa
    try {
      const allMarcas = await strapiClient.get<any>(
        `${marcaEndpoint}?populate=*&pagination[pageSize]=1000`
      )
      
      let marcas: any[] = []
      
      if (Array.isArray(allMarcas)) {
        marcas = allMarcas
      } else if (Array.isArray(allMarcas.data)) {
        marcas = allMarcas.data
      } else if (allMarcas.data && Array.isArray(allMarcas.data.data)) {
        marcas = allMarcas.data.data
      } else if (allMarcas.data && !Array.isArray(allMarcas.data)) {
        marcas = [allMarcas.data]
      }
      
      const marcaEncontrada = marcas.find((m: any) => {
        const mReal = m.attributes && Object.keys(m.attributes).length > 0 ? m.attributes : m
        
        const mId = mReal.id?.toString() || m.id?.toString()
        const mDocId = mReal.documentId?.toString() || m.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          mId === idStr ||
          mDocId === idStr ||
          (!isNaN(idNum) && (mReal.id === idNum || m.id === idNum))
        )
      })
      
      if (marcaEncontrada) {
        console.log('[API /tienda/marca/[id] GET] ✅ Marca encontrada en lista completa')
        return NextResponse.json({
          success: true,
          data: marcaEncontrada
        }, { status: 200 })
      }
    } catch (listError: any) {
      console.warn('[API /tienda/marca/[id] GET] ⚠️ Error al buscar en lista completa:', listError.message)
    }
    
    // PASO 3: Intentar endpoint directo
    try {
      const response = await strapiClient.get<any>(`${marcaEndpoint}/${id}?populate=*`)
      
      let marca: any
      if (response.data) {
        marca = response.data
      } else {
        marca = response
      }
      
      if (marca) {
        console.log('[API /tienda/marca/[id] GET] ✅ Marca encontrada con endpoint directo')
        return NextResponse.json({
          success: true,
          data: marca
        }, { status: 200 })
      }
    } catch (directError: any) {
      console.error('[API /tienda/marca/[id] GET] ❌ Error al obtener marca:', directError.message)
    }
    
    return NextResponse.json({
      success: false,
      error: 'Marca no encontrada',
    }, { status: 404 })
    
  } catch (error: any) {
    console.error('[API /tienda/marca/[id] GET] ❌ Error general:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener marca',
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
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'obras', 'autores', 'sellos', 'serie-coleccion']
    if (reservedWords.includes(id.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Ruta no válida. Use /api/tienda/${id} en su lugar.` },
        { status: 404 }
      )
    }
    
    console.log('[API Marca DELETE] 🗑️ Eliminando marca:', id)

    const marcaEndpoint = '/api/marcas'
    
    // Primero obtener la marca de Strapi para obtener el documentId
    let documentId: string | null = null
    try {
      const marcaResponse = await strapiClient.get<any>(`${marcaEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let marcas: any[] = []
      if (Array.isArray(marcaResponse)) {
        marcas = marcaResponse
      } else if (marcaResponse.data && Array.isArray(marcaResponse.data)) {
        marcas = marcaResponse.data
      } else if (marcaResponse.data) {
        marcas = [marcaResponse.data]
      }
      const marcaStrapi = marcas[0]
      documentId = marcaStrapi?.documentId || marcaStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Marca DELETE] ⚠️ No se pudo obtener marca de Strapi:', error.message)
      documentId = id
    }

    // Obtener el ID del atributo
    const attributeId = await getMarcaAttributeId()

    // Buscar en WooCommerce por slug (documentId)
    let woocommerceId: string | null = null
    if (documentId && attributeId) {
      try {
        console.log('[API Marca DELETE] 🔍 Buscando término en WooCommerce por slug:', documentId)
        const wcTerms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId.toString() }
        )
        if (wcTerms && wcTerms.length > 0) {
          woocommerceId = wcTerms[0].id.toString()
          console.log('[API Marca DELETE] ✅ Término encontrado en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Marca DELETE] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Eliminar en WooCommerce primero si tenemos el ID
    let wooCommerceDeleted = false
    if (woocommerceId && attributeId) {
      try {
        console.log('[API Marca DELETE] 🛒 Eliminando término en WooCommerce:', woocommerceId)
        await wooCommerceClient.delete<any>(`products/attributes/${attributeId}/terms/${woocommerceId}`, true)
        wooCommerceDeleted = true
        console.log('[API Marca DELETE] ✅ Término eliminado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Marca DELETE] ⚠️ Error al eliminar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Eliminar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${marcaEndpoint}/${documentId}` : `${marcaEndpoint}/${id}`
    console.log('[API Marca DELETE] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    const response = await strapiClient.delete<any>(strapiEndpoint)
    console.log('[API Marca DELETE] ✅ Marca eliminada en Strapi')

    return NextResponse.json({
      success: true,
      message: 'Marca eliminada exitosamente' + (wooCommerceDeleted ? ' en WooCommerce y Strapi' : ' en Strapi'),
      data: response
    })

  } catch (error: any) {
    console.error('[API Marca DELETE] ❌ ERROR al eliminar marca:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la marca',
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
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'obras', 'autores', 'sellos', 'serie-coleccion']
    if (reservedWords.includes(id.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Ruta no válida. Use /api/tienda/${id} en su lugar.` },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    console.log('[API Marca PUT] ✏️ Actualizando marca:', id, body)

    const marcaEndpoint = '/api/marcas'
    
    // Primero obtener la marca de Strapi para obtener el documentId
    let marcaStrapi: any
    let documentId: string | null = null
    try {
      const marcaResponse = await strapiClient.get<any>(`${marcaEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let marcas: any[] = []
      if (Array.isArray(marcaResponse)) {
        marcas = marcaResponse
      } else if (marcaResponse.data && Array.isArray(marcaResponse.data)) {
        marcas = marcaResponse.data
      } else if (marcaResponse.data) {
        marcas = [marcaResponse.data]
      }
      marcaStrapi = marcas[0]
      documentId = marcaStrapi?.documentId || marcaStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Marca PUT] ⚠️ No se pudo obtener marca de Strapi:', error.message)
      documentId = id
    }

    // Obtener el ID del atributo
    const attributeId = await getMarcaAttributeId()

    // Buscar en WooCommerce por slug (documentId)
    let woocommerceId: string | null = null
    if (documentId && attributeId) {
      try {
        console.log('[API Marca PUT] 🔍 Buscando término en WooCommerce por slug:', documentId)
        const wcTerms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId.toString() }
        )
        if (wcTerms && wcTerms.length > 0) {
          woocommerceId = wcTerms[0].id.toString()
          console.log('[API Marca PUT] ✅ Término encontrado en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Marca PUT] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Actualizar en WooCommerce primero si tenemos el ID
    let wooCommerceTerm = null
    if (woocommerceId && attributeId) {
      try {
        console.log('[API Marca PUT] 🛒 Actualizando término en WooCommerce:', woocommerceId)
        
        const wooCommerceTermData: any = {}
        if (body.data.name || body.data.nombre_marca || body.data.nombreMarca || body.data.nombre) {
          wooCommerceTermData.name = (body.data.name || body.data.nombre_marca || body.data.nombreMarca || body.data.nombre).trim()
        }
        if (body.data.descripcion !== undefined || body.data.description !== undefined) {
          wooCommerceTermData.description = body.data.descripcion || body.data.description || ''
        }

        wooCommerceTerm = await wooCommerceClient.put<any>(
          `products/attributes/${attributeId}/terms/${woocommerceId}`,
          wooCommerceTermData
        )
        console.log('[API Marca PUT] ✅ Término actualizado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Marca PUT] ⚠️ Error al actualizar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Actualizar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${marcaEndpoint}/${documentId}` : `${marcaEndpoint}/${id}`
    console.log('[API Marca PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    // El schema de Strapi para marca usa: name* (Text), descripcion, imagen, marca_padre, marcas_hijas, externalIds
    const marcaData: any = {
      data: {}
    }

    // Aceptar diferentes formatos del formulario pero guardar según schema real (usar 'name')
    if (body.data.name) marcaData.data.name = body.data.name.trim()
    if (body.data.nombre_marca) marcaData.data.name = body.data.nombre_marca.trim()
    if (body.data.nombreMarca) marcaData.data.name = body.data.nombreMarca.trim()
    if (body.data.nombre) marcaData.data.name = body.data.nombre.trim()
    
    if (body.data.descripcion !== undefined) marcaData.data.descripcion = body.data.descripcion?.trim() || null
    if (body.data.description !== undefined) marcaData.data.descripcion = body.data.description?.trim() || null

    // Media: solo el ID (o null para eliminar) - usar 'imagen' según schema
    if (body.data.imagen !== undefined) {
      marcaData.data.imagen = body.data.imagen || null
    }
    if (body.data.logo !== undefined) {
      marcaData.data.imagen = body.data.logo || null
    }

    // Manejar marca_padre (manyToOne relation)
    if (body.data.marca_padre !== undefined) {
      marcaData.data.marca_padre = body.data.marca_padre || null
    }

    // Manejar marcas_hijas (oneToMany relation)
    if (body.data.marcas_hijas !== undefined) {
      marcaData.data.marcas_hijas = body.data.marcas_hijas && body.data.marcas_hijas.length > 0 ? body.data.marcas_hijas : []
    }

    // Estado de publicación
    if (body.estado_publicacion !== undefined && body.estado_publicacion !== '') {
      marcaData.data.estado_publicacion = body.estado_publicacion
    }
    if (body.data?.estado_publicacion !== undefined && body.data.estado_publicacion !== '') {
      marcaData.data.estado_publicacion = body.data.estado_publicacion
    }

    // No guardamos woocommerce_id en Strapi porque no existe en el schema
    // El match se hace usando documentId como slug en WooCommerce

    const strapiResponse = await strapiClient.put<any>(strapiEndpoint, marcaData)
    console.log('[API Marca PUT] ✅ Marca actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceTerm,
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Marca actualizada exitosamente' + (wooCommerceTerm ? ' en WooCommerce y Strapi' : ' en Strapi')
    })

  } catch (error: any) {
    console.error('[API Marca PUT] ❌ ERROR al actualizar marca:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la marca',
      details: error.details
    }, { status: error.status || 500 })
  }
}

