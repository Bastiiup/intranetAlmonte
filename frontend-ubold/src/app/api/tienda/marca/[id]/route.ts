import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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
    console.log('[API Marca DELETE] 🗑️ Eliminando marca:', id)

    const marcaEndpoint = '/api/marcas'
    
    // Primero obtener la marca de Strapi para obtener el documentId y verificar estado_publicacion
    let marcaStrapi: any = null
    let documentId: string | null = null
    let estadoPublicacion: string | null = null
    
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
      
      if (marcaStrapi) {
        const attrs = marcaStrapi.attributes || {}
        const data = (attrs && Object.keys(attrs).length > 0) ? attrs : marcaStrapi
        estadoPublicacion = data.estado_publicacion || data.estadoPublicacion || null
        
        console.log('[API Marca DELETE] Estado de publicación:', estadoPublicacion)
        
        // Normalizar estado a minúsculas para comparación
        if (estadoPublicacion) {
          estadoPublicacion = estadoPublicacion.toLowerCase()
        }
      }
    } catch (error: any) {
      console.warn('[API Marca DELETE] ⚠️ No se pudo obtener marca de Strapi:', error.message)
      documentId = id
    }

    // Eliminar en Strapi usando documentId si está disponible
    // El lifecycle de Strapi verifica estado_publicacion y solo elimina de WooCommerce si estaba "publicado"
    const strapiEndpoint = documentId ? `${marcaEndpoint}/${documentId}` : `${marcaEndpoint}/${id}`
    console.log('[API Marca DELETE] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    const response = await strapiClient.delete<any>(strapiEndpoint)
    
    if (estadoPublicacion === 'publicado') {
      console.log('[API Marca DELETE] ✅ Marca eliminada en Strapi. El lifecycle eliminará de WooCommerce si estaba publicado.')
    } else {
      console.log('[API Marca DELETE] ✅ Marca eliminada en Strapi (solo Strapi, no estaba publicada en WooCommerce)')
    }

    return NextResponse.json({
      success: true,
      message: estadoPublicacion === 'publicado' 
        ? 'Marca eliminada exitosamente en Strapi. El lifecycle eliminará de WooCommerce.' 
        : 'Marca eliminada exitosamente en Strapi',
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
    const body = await request.json()
    console.log('[API Marca PUT] ✏️ Actualizando marca:', id, body)

    const marcaEndpoint = '/api/marcas'
    
    // Primero obtener la marca de Strapi para obtener el documentId
    let marcaStrapi: any = null
    
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
    } catch (error: any) {
      // Si falla, intentar obtener todas y buscar
      console.warn('[API Marca PUT] ⚠️ No se pudo obtener marca de Strapi, intentando búsqueda alternativa:', error.message)
      try {
        const allResponse = await strapiClient.get<any>(`${marcaEndpoint}?populate=*&pagination[pageSize]=1000`)
        const allMarcas = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        marcaStrapi = allMarcas.find((m: any) => 
          m.id?.toString() === id || 
          m.documentId === id ||
          (m.attributes && (m.attributes.id?.toString() === id || m.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Marca PUT] Error en búsqueda alternativa:', searchError.message)
      }
    }

    if (!marcaStrapi) {
      return NextResponse.json({
        success: false,
        error: 'Marca no encontrada'
      }, { status: 404 })
    }

    // En Strapi v4, usar documentId (string) para actualizar, no el id numérico
    const marcaDocumentId = marcaStrapi.documentId || marcaStrapi.data?.documentId || marcaStrapi.id?.toString() || id
    console.log('[API Marca PUT] Usando documentId para actualizar:', marcaDocumentId)

    // Actualizar en Strapi usando documentId
    // La sincronización con WooCommerce se maneja automáticamente en los lifecycles de Strapi
    const strapiEndpoint = `${marcaEndpoint}/${marcaDocumentId}`
    console.log('[API Marca PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId: marcaDocumentId, id })

    // El schema de Strapi para marca usa: name* (Text), descripcion (Text), imagen (Media)
    const marcaData: any = {
      data: {}
    }

    // Aceptar diferentes formatos del formulario pero guardar según schema real (usa "name")
    if (body.data.name) marcaData.data.name = body.data.name.trim()
    if (body.data.nombre_marca) marcaData.data.name = body.data.nombre_marca.trim()
    if (body.data.nombreMarca) marcaData.data.name = body.data.nombreMarca.trim()
    if (body.data.nombre) marcaData.data.name = body.data.nombre.trim()
    
    if (body.data.descripcion !== undefined) marcaData.data.descripcion = body.data.descripcion?.trim() || null
    if (body.data.description !== undefined) marcaData.data.descripcion = body.data.description?.trim() || null

    // Media: solo el ID (o null para eliminar)
    if (body.data.imagen !== undefined) {
      marcaData.data.imagen = body.data.imagen || null
    }

    // Estado de publicación - IMPORTANTE: Strapi espera valores en minúsculas
    if (body.data.estado_publicacion !== undefined) {
      // Normalizar a minúsculas para Strapi: "pendiente", "publicado", "borrador"
      const estadoNormalizado = typeof body.data.estado_publicacion === 'string' 
        ? body.data.estado_publicacion.toLowerCase() 
        : body.data.estado_publicacion
      marcaData.data.estado_publicacion = estadoNormalizado
      console.log('[API Marca PUT] 📝 Estado de publicación actualizado:', estadoNormalizado)
    }

    // La sincronización con WooCommerce se maneja automáticamente en los lifecycles de Strapi
    // No necesitamos actualizar WooCommerce directamente aquí

    const strapiResponse = await strapiClient.put<any>(strapiEndpoint, marcaData)
    console.log('[API Marca PUT] ✅ Marca actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Marca actualizada exitosamente en Strapi'
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

