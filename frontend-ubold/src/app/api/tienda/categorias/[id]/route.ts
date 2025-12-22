import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para encontrar el endpoint correcto
async function findCategoriaEndpoint(): Promise<string> {
  const endpoints = ['/api/categorias-producto', '/api/categoria-productos', '/api/categorias']
  
  for (const endpoint of endpoints) {
    try {
      await strapiClient.get<any>(`${endpoint}?pagination[pageSize]=1`)
      return endpoint
    } catch {
      continue
    }
  }
  
  // Si ninguno funciona, usar el primero por defecto
  return endpoints[0]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('[API /tienda/categorias/[id] GET] Obteniendo categoría:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
    })
    
    // Encontrar el endpoint correcto
    const categoriaEndpoint = await findCategoriaEndpoint()
    
    // PASO 1: Intentar con filtro si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        console.log('[API /tienda/categorias/[id] GET] 🔍 Buscando con filtro:', {
          idBuscado: id,
          endpoint: `${categoriaEndpoint}?filters[id][$eq]=${id}&populate=*`
        })
        
        const filteredResponse = await strapiClient.get<any>(
          `${categoriaEndpoint}?filters[id][$eq]=${id}&populate=*`
        )
        
        // Extraer categoría de la respuesta filtrada
        let categoria: any
        if (Array.isArray(filteredResponse)) {
          categoria = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          categoria = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          categoria = filteredResponse.data
        } else {
          categoria = filteredResponse
        }
        
        if (categoria && (categoria.id || categoria.documentId)) {
          console.log('[API /tienda/categorias/[id] GET] ✅ Categoría encontrada con filtro')
          return NextResponse.json({
            success: true,
            data: categoria
          }, { status: 200 })
        }
      } catch (filterError: any) {
        console.warn('[API /tienda/categorias/[id] GET] ⚠️ Error al obtener con filtro:', {
          status: filterError.status,
          message: filterError.message,
          continuandoConBusqueda: true,
        })
      }
    }
    
    // PASO 2: Buscar en lista completa (por si el ID es documentId o si el endpoint directo falló)
    try {
      console.log('[API /tienda/categorias/[id] GET] Buscando en lista completa de categorías...')
      
      const allCategories = await strapiClient.get<any>(
        `${categoriaEndpoint}?populate=*&pagination[pageSize]=1000`
      )
      
      let categorias: any[] = []
      
      if (Array.isArray(allCategories)) {
        categorias = allCategories
      } else if (Array.isArray(allCategories.data)) {
        categorias = allCategories.data
      } else if (allCategories.data && Array.isArray(allCategories.data.data)) {
        categorias = allCategories.data.data
      } else if (allCategories.data && !Array.isArray(allCategories.data)) {
        categorias = [allCategories.data]
      }
      
      console.log('[API /tienda/categorias/[id] GET] Lista obtenida:', {
        total: categorias.length,
        idBuscado: id,
      })
      
      // Buscar por id numérico o documentId
      const categoriaEncontrada = categorias.find((c: any) => {
        const categoriaReal = c.attributes && Object.keys(c.attributes).length > 0 ? c.attributes : c
        
        const cId = categoriaReal.id?.toString() || c.id?.toString()
        const cDocId = categoriaReal.documentId?.toString() || c.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          cId === idStr ||
          cDocId === idStr ||
          (!isNaN(idNum) && (categoriaReal.id === idNum || c.id === idNum))
        )
      })
      
      if (categoriaEncontrada) {
        console.log('[API /tienda/categorias/[id] GET] ✅ Categoría encontrada en lista completa')
        return NextResponse.json({
          success: true,
          data: categoriaEncontrada
        }, { status: 200 })
      }
    } catch (listError: any) {
      console.warn('[API /tienda/categorias/[id] GET] ⚠️ Error al buscar en lista completa:', listError.message)
    }
    
    // PASO 3: Intentar endpoint directo como último recurso
    try {
      const response = await strapiClient.get<any>(`${categoriaEndpoint}/${id}?populate=*`)
      
      let categoria: any
      if (response.data) {
        categoria = response.data
      } else {
        categoria = response
      }
      
      if (categoria) {
        console.log('[API /tienda/categorias/[id] GET] ✅ Categoría encontrada con endpoint directo')
        return NextResponse.json({
          success: true,
          data: categoria
        }, { status: 200 })
      }
    } catch (directError: any) {
      console.error('[API /tienda/categorias/[id] GET] ❌ Error al obtener categoría:', {
        id,
        error: directError.message,
        status: directError.status,
      })
    }
    
    // Si llegamos aquí, no se encontró la categoría
    return NextResponse.json({
      success: false,
      error: 'Categoría no encontrada',
    }, { status: 404 })
    
  } catch (error: any) {
    console.error('[API /tienda/categorias/[id] GET] ❌ Error general:', {
      error: error.message,
      stack: error.stack,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener categoría',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Categorias DELETE] 🗑️ Eliminando categoría:', id)

    // Encontrar el endpoint correcto
    const categoriaEndpoint = await findCategoriaEndpoint()
    
    // Primero obtener la categoría de Strapi para obtener el documentId y woocommerce_id
    let woocommerceId: string | null = null
    let documentId: string | null = null
    try {
      const categoriaResponse = await strapiClient.get<any>(`${categoriaEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let categorias: any[] = []
      if (Array.isArray(categoriaResponse)) {
        categorias = categoriaResponse
      } else if (categoriaResponse.data && Array.isArray(categoriaResponse.data)) {
        categorias = categoriaResponse.data
      } else if (categoriaResponse.data) {
        categorias = [categoriaResponse.data]
      }
      const categoriaStrapi = categorias[0]
      documentId = categoriaStrapi?.documentId || categoriaStrapi?.data?.documentId || id
      woocommerceId = categoriaStrapi?.attributes?.woocommerce_id || 
                      categoriaStrapi?.woocommerce_id
    } catch (error: any) {
      console.warn('[API Categorias DELETE] ⚠️ No se pudo obtener categoría de Strapi:', error.message)
      documentId = id
    }

    // Si no tenemos woocommerce_id, buscar por slug (documentId) en WooCommerce
    if (!woocommerceId && documentId) {
      try {
        console.log('[API Categorias DELETE] 🔍 Buscando categoría en WooCommerce por slug:', documentId)
        const wcCategories = await wooCommerceClient.get<any[]>('products/categories', { slug: documentId.toString() })
        if (wcCategories && wcCategories.length > 0) {
          woocommerceId = wcCategories[0].id.toString()
          console.log('[API Categorias DELETE] ✅ Categoría encontrada en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Categorias DELETE] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Eliminar en WooCommerce primero si tenemos el ID
    let wooCommerceDeleted = false
    if (woocommerceId) {
      try {
        console.log('[API Categorias DELETE] 🛒 Eliminando categoría en WooCommerce:', woocommerceId)
        await wooCommerceClient.delete<any>(`products/categories/${woocommerceId}`, true)
        wooCommerceDeleted = true
        console.log('[API Categorias DELETE] ✅ Categoría eliminada en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Categorias DELETE] ⚠️ Error al eliminar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Eliminar en Strapi
    const endpoint = `${categoriaEndpoint}/${id}`
    console.log('[API Categorias DELETE] Usando endpoint Strapi:', endpoint)

    const response = await strapiClient.delete<any>(endpoint)
    console.log('[API Categorias DELETE] ✅ Categoría eliminada en Strapi')

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente' + (wooCommerceDeleted ? ' en WooCommerce y Strapi' : ' en Strapi'),
      data: response
    })

  } catch (error: any) {
    console.error('[API Categorias DELETE] ❌ ERROR al eliminar categoría:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la categoría',
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
    console.log('[API Categorias PUT] ✏️ Actualizando categoría:', id, body)

    // Encontrar el endpoint correcto
    const categoriaEndpoint = await findCategoriaEndpoint()
    
    // Primero obtener la categoría de Strapi para obtener el documentId y woocommerce_id
    let categoriaStrapi: any
    let documentId: string | null = null
    try {
      const categoriaResponse = await strapiClient.get<any>(`${categoriaEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let categorias: any[] = []
      if (Array.isArray(categoriaResponse)) {
        categorias = categoriaResponse
      } else if (categoriaResponse.data && Array.isArray(categoriaResponse.data)) {
        categorias = categoriaResponse.data
      } else if (categoriaResponse.data) {
        categorias = [categoriaResponse.data]
      }
      categoriaStrapi = categorias[0]
      documentId = categoriaStrapi?.documentId || categoriaStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Categorias PUT] ⚠️ No se pudo obtener categoría de Strapi:', error.message)
      documentId = id // Usar el id como fallback
    }

    // Buscar en WooCommerce por slug (documentId) o por woocommerce_id
    let woocommerceId: string | null = null
    const woocommerceIdFromStrapi = categoriaStrapi?.attributes?.woocommerce_id || 
                                    categoriaStrapi?.woocommerce_id
    
    if (woocommerceIdFromStrapi) {
      woocommerceId = woocommerceIdFromStrapi.toString()
    } else if (documentId) {
      // Buscar por slug (documentId) en WooCommerce
      try {
        console.log('[API Categorias PUT] 🔍 Buscando categoría en WooCommerce por slug:', documentId)
        const wcCategories = await wooCommerceClient.get<any[]>('products/categories', { slug: documentId.toString() })
        if (wcCategories && wcCategories.length > 0) {
          woocommerceId = wcCategories[0].id.toString()
          console.log('[API Categorias PUT] ✅ Categoría encontrada en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Categorias PUT] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Actualizar en WooCommerce primero si tenemos el ID
    let wooCommerceCategory = null
    if (woocommerceId) {
      try {
        console.log('[API Categorias PUT] 🛒 Actualizando categoría en WooCommerce:', woocommerceId)
        
        const wooCommerceCategoryData: any = {}
        if (body.data.name || body.data.nombre) {
          wooCommerceCategoryData.name = (body.data.name || body.data.nombre).trim()
        }
        if (body.data.descripcion !== undefined || body.data.description !== undefined) {
          wooCommerceCategoryData.description = body.data.descripcion || body.data.description || ''
        }

        wooCommerceCategory = await wooCommerceClient.put<any>(
          `products/categories/${woocommerceId}`,
          wooCommerceCategoryData
        )
        console.log('[API Categorias PUT] ✅ Categoría actualizada en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Categorias PUT] ⚠️ Error al actualizar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Actualizar en Strapi
    const endpoint = `${categoriaEndpoint}/${id}`
    console.log('[API Categorias PUT] Usando endpoint Strapi:', endpoint)

    // Preparar datos para Strapi (el schema usa 'name', no 'nombre')
    const categoriaData: any = {
      data: {}
    }

    // El schema de Strapi usa 'name', no 'nombre'
    if (body.data.name) categoriaData.data.name = body.data.name
    if (body.data.nombre) categoriaData.data.name = body.data.nombre
    if (body.data.descripcion !== undefined) categoriaData.data.descripcion = body.data.descripcion
    if (body.data.description !== undefined) categoriaData.data.descripcion = body.data.description
    if (body.data.imagen) categoriaData.data.imagen = body.data.imagen

    // Si se creó en WooCommerce y no teníamos ID, guardarlo
    if (wooCommerceCategory && !woocommerceId) {
      categoriaData.data.woocommerce_id = wooCommerceCategory.id.toString()
    }

    const strapiResponse = await strapiClient.put<any>(endpoint, categoriaData)
    console.log('[API Categorias PUT] ✅ Categoría actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceCategory,
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Categoría actualizada exitosamente' + (wooCommerceCategory ? ' en WooCommerce y Strapi' : ' en Strapi')
    })

  } catch (error: any) {
    console.error('[API Categorias PUT] ❌ ERROR al actualizar categoría:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la categoría',
      details: error.details
    }, { status: error.status || 500 })
  }
}

