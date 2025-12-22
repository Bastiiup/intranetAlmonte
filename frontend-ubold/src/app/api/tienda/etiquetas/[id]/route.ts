import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('[API /tienda/etiquetas/[id] GET] Obteniendo etiqueta:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
      endpoint: `/api/etiquetas/${id}`,
    })
    
    // PASO 1: Intentar con filtro si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        console.log('[API /tienda/etiquetas/[id] GET] 🔍 Buscando con filtro:', {
          idBuscado: id,
          endpoint: `/api/etiquetas?filters[id][$eq]=${id}&populate=*`
        })
        
        const filteredResponse = await strapiClient.get<any>(
          `/api/etiquetas?filters[id][$eq]=${id}&populate=*`
        )
        
        // Extraer etiqueta de la respuesta filtrada
        let etiqueta: any
        if (Array.isArray(filteredResponse)) {
          etiqueta = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          etiqueta = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          etiqueta = filteredResponse.data
        } else {
          etiqueta = filteredResponse
        }
        
        if (etiqueta && (etiqueta.id || etiqueta.documentId)) {
          console.log('[API /tienda/etiquetas/[id] GET] ✅ Etiqueta encontrada con filtro')
          return NextResponse.json({
            success: true,
            data: etiqueta
          }, { status: 200 })
        }
      } catch (filterError: any) {
        console.warn('[API /tienda/etiquetas/[id] GET] ⚠️ Error al obtener con filtro:', {
          status: filterError.status,
          message: filterError.message,
          continuandoConBusqueda: true,
        })
      }
    }
    
    // PASO 2: Buscar en lista completa (por si el ID es documentId o si el endpoint directo falló)
    try {
      console.log('[API /tienda/etiquetas/[id] GET] Buscando en lista completa de etiquetas...')
      
      const allTags = await strapiClient.get<any>(
        `/api/etiquetas?populate=*&pagination[pageSize]=1000`
      )
      
      let etiquetas: any[] = []
      
      if (Array.isArray(allTags)) {
        etiquetas = allTags
      } else if (Array.isArray(allTags.data)) {
        etiquetas = allTags.data
      } else if (allTags.data && Array.isArray(allTags.data.data)) {
        etiquetas = allTags.data.data
      } else if (allTags.data && !Array.isArray(allTags.data)) {
        etiquetas = [allTags.data]
      }
      
      console.log('[API /tienda/etiquetas/[id] GET] Lista obtenida:', {
        total: etiquetas.length,
        idBuscado: id,
      })
      
      // Buscar por id numérico o documentId
      const etiquetaEncontrada = etiquetas.find((e: any) => {
        const etiquetaReal = e.attributes && Object.keys(e.attributes).length > 0 ? e.attributes : e
        
        const eId = etiquetaReal.id?.toString() || e.id?.toString()
        const eDocId = etiquetaReal.documentId?.toString() || e.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          eId === idStr ||
          eDocId === idStr ||
          (!isNaN(idNum) && (etiquetaReal.id === idNum || e.id === idNum))
        )
      })
      
      if (etiquetaEncontrada) {
        console.log('[API /tienda/etiquetas/[id] GET] ✅ Etiqueta encontrada en lista completa')
        return NextResponse.json({
          success: true,
          data: etiquetaEncontrada
        }, { status: 200 })
      }
    } catch (listError: any) {
      console.warn('[API /tienda/etiquetas/[id] GET] ⚠️ Error al buscar en lista completa:', listError.message)
    }
    
    // PASO 3: Intentar endpoint directo como último recurso
    try {
      const response = await strapiClient.get<any>(`/api/etiquetas/${id}?populate=*`)
      
      let etiqueta: any
      if (response.data) {
        etiqueta = response.data
      } else {
        etiqueta = response
      }
      
      if (etiqueta) {
        console.log('[API /tienda/etiquetas/[id] GET] ✅ Etiqueta encontrada con endpoint directo')
        return NextResponse.json({
          success: true,
          data: etiqueta
        }, { status: 200 })
      }
    } catch (directError: any) {
      console.error('[API /tienda/etiquetas/[id] GET] ❌ Error al obtener etiqueta:', {
        id,
        error: directError.message,
        status: directError.status,
      })
    }
    
    // Si llegamos aquí, no se encontró la etiqueta
    return NextResponse.json({
      success: false,
      error: 'Etiqueta no encontrada',
    }, { status: 404 })
    
  } catch (error: any) {
    console.error('[API /tienda/etiquetas/[id] GET] ❌ Error general:', {
      error: error.message,
      stack: error.stack,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener etiqueta',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Etiquetas DELETE] 🗑️ Eliminando etiqueta:', id)

    const etiquetaEndpoint = '/api/etiquetas'
    
    // Eliminar en Strapi
    // La eliminación en WordPress se maneja automáticamente en los lifecycles de Strapi
    const endpoint = `${etiquetaEndpoint}/${id}`
    console.log('[API Etiquetas DELETE] Usando endpoint Strapi:', endpoint)

    const response = await strapiClient.delete<any>(endpoint)
    console.log('[API Etiquetas DELETE] ✅ Etiqueta eliminada en Strapi')

    return NextResponse.json({
      success: true,
      message: 'Etiqueta eliminada exitosamente en Strapi',
      data: response
    })

  } catch (error: any) {
    console.error('[API Etiquetas DELETE] ❌ ERROR al eliminar etiqueta:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la etiqueta',
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
    const body = await request.json()
    console.log('[API Etiquetas PUT] ✏️ Actualizando etiqueta:', id, body)

    const etiquetaEndpoint = '/api/etiquetas'
    
    // Primero obtener la etiqueta de Strapi para obtener el documentId y woocommerce_id
    let etiquetaStrapi: any
    let documentId: string | null = null
    try {
      const etiquetaResponse = await strapiClient.get<any>(`${etiquetaEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let etiquetas: any[] = []
      if (Array.isArray(etiquetaResponse)) {
        etiquetas = etiquetaResponse
      } else if (etiquetaResponse.data && Array.isArray(etiquetaResponse.data)) {
        etiquetas = etiquetaResponse.data
      } else if (etiquetaResponse.data) {
        etiquetas = [etiquetaResponse.data]
      }
      etiquetaStrapi = etiquetas[0]
      documentId = etiquetaStrapi?.documentId || etiquetaStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Etiquetas PUT] ⚠️ No se pudo obtener etiqueta de Strapi:', error.message)
      documentId = id // Usar el id como fallback
    }

    // Buscar en WooCommerce por slug (documentId) o por woocommerce_id
    let woocommerceId: string | null = null
    const woocommerceIdFromStrapi = etiquetaStrapi?.attributes?.woocommerce_id || 
                                     etiquetaStrapi?.woocommerce_id
    
    if (woocommerceIdFromStrapi) {
      woocommerceId = woocommerceIdFromStrapi.toString()
    } else if (documentId) {
      // Buscar por slug (documentId) en WooCommerce
      try {
        console.log('[API Etiquetas PUT] 🔍 Buscando etiqueta en WooCommerce por slug:', documentId)
        const wcTags = await wooCommerceClient.get<any[]>('products/tags', { slug: documentId.toString() })
        if (wcTags && wcTags.length > 0) {
          woocommerceId = wcTags[0].id.toString()
          console.log('[API Etiquetas PUT] ✅ Etiqueta encontrada en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Etiquetas PUT] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Actualizar en WooCommerce primero si tenemos el ID
    let wooCommerceTag = null
    if (woocommerceId) {
      try {
        console.log('[API Etiquetas PUT] 🛒 Actualizando etiqueta en WooCommerce:', woocommerceId)
        
        const wooCommerceTagData: any = {}
        if (body.data.name || body.data.nombre) {
          wooCommerceTagData.name = (body.data.name || body.data.nombre).trim()
        }
        if (body.data.descripcion !== undefined || body.data.description !== undefined) {
          wooCommerceTagData.description = body.data.descripcion || body.data.description || ''
        }

        wooCommerceTag = await wooCommerceClient.put<any>(
          `products/tags/${woocommerceId}`,
          wooCommerceTagData
        )
        console.log('[API Etiquetas PUT] ✅ Etiqueta actualizada en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Etiquetas PUT] ⚠️ Error al actualizar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Actualizar en Strapi
    const endpoint = `${etiquetaEndpoint}/${id}`
    console.log('[API Etiquetas PUT] Usando endpoint Strapi:', endpoint)

    // Preparar datos para Strapi
    const etiquetaData: any = {
      data: {}
    }

    if (body.data.name) etiquetaData.data.name = body.data.name.trim()
    if (body.data.nombre) etiquetaData.data.name = body.data.nombre.trim()
    if (body.data.descripcion !== undefined) etiquetaData.data.descripcion = body.data.descripcion?.trim() || null
    if (body.data.description !== undefined) etiquetaData.data.descripcion = body.data.description?.trim() || null

    // Estado de publicación - IMPORTANTE: Strapi espera valores en minúsculas
    if (body.data.estado_publicacion !== undefined) {
      // Normalizar a minúsculas para Strapi: "pendiente", "publicado", "borrador"
      const estadoNormalizado = typeof body.data.estado_publicacion === 'string' 
        ? body.data.estado_publicacion.toLowerCase() 
        : body.data.estado_publicacion
      etiquetaData.data.estado_publicacion = estadoNormalizado
      console.log('[API Etiquetas PUT] 📝 Estado de publicación actualizado:', estadoNormalizado)
    }

    // La sincronización con WooCommerce se maneja automáticamente en los lifecycles de Strapi
    // No necesitamos actualizar WooCommerce directamente aquí

    const strapiResponse = await strapiClient.put<any>(endpoint, etiquetaData)
    console.log('[API Etiquetas PUT] ✅ Etiqueta actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Etiqueta actualizada exitosamente en Strapi'
    })

  } catch (error: any) {
    console.error('[API Etiquetas PUT] ❌ ERROR al actualizar etiqueta:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la etiqueta',
      details: error.details
    }, { status: error.status || 500 })
  }
}

