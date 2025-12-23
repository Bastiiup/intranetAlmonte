import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

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
    } catch (error: any) {
      console.warn('[API Categorias DELETE] ⚠️ No se pudo obtener categoría de Strapi:', error.message)
      documentId = id
    }

    // Eliminar en Strapi
    // La eliminación en WordPress se maneja automáticamente en los lifecycles de Strapi
    const endpoint = `${categoriaEndpoint}/${id}`
    console.log('[API Categorias DELETE] Usando endpoint Strapi:', endpoint)

    const response = await strapiClient.delete<any>(endpoint)
    console.log('[API Categorias DELETE] ✅ Categoría eliminada en Strapi')

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente en Strapi',
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
    
    // Primero obtener la categoría de Strapi para obtener el documentId
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

    // Actualizar en Strapi
    // La sincronización con WooCommerce se maneja automáticamente en los lifecycles de Strapi
    const endpoint = `${categoriaEndpoint}/${id}`
    console.log('[API Categorias PUT] Usando endpoint Strapi:', endpoint)

    // Preparar datos para Strapi (el schema usa 'name', no 'nombre')
    const categoriaData: any = {
      data: {}
    }

    // El schema de Strapi usa 'name', no 'nombre'
    if (body.data.name) categoriaData.data.name = body.data.name.trim()
    if (body.data.nombre) categoriaData.data.name = body.data.nombre.trim()
    if (body.data.descripcion !== undefined) categoriaData.data.descripcion = body.data.descripcion?.trim() || null
    if (body.data.description !== undefined) categoriaData.data.descripcion = body.data.description?.trim() || null
    if (body.data.imagen !== undefined) categoriaData.data.imagen = body.data.imagen || null

    // Estado de publicación - IMPORTANTE: Strapi espera valores en minúsculas
    if (body.data.estado_publicacion !== undefined) {
      // Normalizar a minúsculas para Strapi: "pendiente", "publicado", "borrador"
      const estadoNormalizado = typeof body.data.estado_publicacion === 'string' 
        ? body.data.estado_publicacion.toLowerCase() 
        : body.data.estado_publicacion
      categoriaData.data.estado_publicacion = estadoNormalizado
      console.log('[API Categorias PUT] 📝 Estado de publicación actualizado:', estadoNormalizado)
    }

    // La sincronización con WooCommerce se maneja automáticamente en los lifecycles de Strapi
    // No necesitamos actualizar WooCommerce directamente aquí

    const strapiResponse = await strapiClient.put<any>(endpoint, categoriaData)
    console.log('[API Categorias PUT] ✅ Categoría actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Categoría actualizada exitosamente en Strapi'
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

