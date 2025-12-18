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
    const endpoint = `${categoriaEndpoint}/${id}`
    
    console.log('[API Categorias DELETE] Usando endpoint:', endpoint)

    // Eliminar en Strapi
    const response = await strapiClient.delete<any>(endpoint)

    console.log('[API Categorias DELETE] ✅ Categoría eliminada exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente',
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
    const endpoint = `${categoriaEndpoint}/${id}`
    
    console.log('[API Categorias PUT] Usando endpoint:', endpoint)

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

    // Actualizar en Strapi
    const response = await strapiClient.put<any>(endpoint, categoriaData)

    console.log('[API Categorias PUT] ✅ Categoría actualizada exitosamente')

    return NextResponse.json({
      success: true,
      data: response.data || response,
      message: 'Categoría actualizada exitosamente'
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

