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
    // Verificar rol del usuario
    const colaboradorCookie = request.cookies.get('auth_colaborador')?.value
    if (colaboradorCookie) {
      try {
        const colaborador = JSON.parse(colaboradorCookie)
        if (colaborador.rol !== 'super_admin') {
          return NextResponse.json({
            success: false,
            error: 'No tienes permisos para eliminar etiquetas'
          }, { status: 403 })
        }
      } catch (e) {
        // Si hay error parseando, continuar (podría ser que no esté autenticado)
      }
    }

    const { id } = await params
    console.log('[API Etiquetas DELETE] 🗑️ Eliminando etiqueta:', id)

    const etiquetaEndpoint = '/api/etiquetas'
    
    // Primero obtener la etiqueta de Strapi para verificar estado_publicacion
    let etiquetaStrapi: any = null
    let documentId: string | null = null
    let estadoPublicacion: string | null = null
    
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
      
      if (etiquetaStrapi) {
        const attrs = etiquetaStrapi.attributes || {}
        const data = (attrs && Object.keys(attrs).length > 0) ? attrs : etiquetaStrapi
        estadoPublicacion = data.estado_publicacion || data.estadoPublicacion || null
        documentId = etiquetaStrapi.documentId || etiquetaStrapi.data?.documentId || id
        
        console.log('[API Etiquetas DELETE] Estado de publicación:', estadoPublicacion)
        
        // Normalizar estado a minúsculas para comparación
        if (estadoPublicacion) {
          estadoPublicacion = estadoPublicacion.toLowerCase()
        }
      }
    } catch (error: any) {
      console.warn('[API Etiquetas DELETE] ⚠️ No se pudo obtener etiqueta de Strapi:', error.message)
      documentId = id
    }

    // Eliminar en Strapi
    // El lifecycle de Strapi verifica estado_publicacion y solo elimina de WooCommerce si estaba "publicado"
    const endpoint = `${etiquetaEndpoint}/${id}`
    console.log('[API Etiquetas DELETE] Usando endpoint Strapi:', endpoint)

    const response = await strapiClient.delete<any>(endpoint)
    
    if (estadoPublicacion === 'publicado') {
      console.log('[API Etiquetas DELETE] ✅ Etiqueta eliminada en Strapi. El lifecycle eliminará de WooCommerce si estaba publicado.')
    } else {
      console.log('[API Etiquetas DELETE] ✅ Etiqueta eliminada en Strapi (solo Strapi, no estaba publicada en WooCommerce)')
    }

    return NextResponse.json({
      success: true,
      message: estadoPublicacion === 'publicado' 
        ? 'Etiqueta eliminada exitosamente en Strapi. El lifecycle eliminará de WooCommerce.' 
        : 'Etiqueta eliminada exitosamente en Strapi',
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
    
    // Actualizar en Strapi
    // La sincronización con WooCommerce se maneja automáticamente en los lifecycles de Strapi
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

