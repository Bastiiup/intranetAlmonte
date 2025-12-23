import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('[API /tienda/obras/[id] GET] Obteniendo obra:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
    })
    
    // PASO 1: Intentar con filtro si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `/api/obras?filters[id][$eq]=${id}&populate=*`
        )
        
        let obra: any
        if (Array.isArray(filteredResponse)) {
          obra = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          obra = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          obra = filteredResponse.data
        } else {
          obra = filteredResponse
        }
        
        if (obra && (obra.id || obra.documentId)) {
          console.log('[API /tienda/obras/[id] GET] ✅ Obra encontrada con filtro')
          return NextResponse.json({
            success: true,
            data: obra
          }, { status: 200 })
        }
      } catch (filterError: any) {
        console.warn('[API /tienda/obras/[id] GET] ⚠️ Error al obtener con filtro:', filterError.message)
      }
    }
    
    // PASO 2: Buscar en lista completa
    try {
      const allObras = await strapiClient.get<any>(
        `/api/obras?populate=*&pagination[pageSize]=1000`
      )
      
      let obras: any[] = []
      
      if (Array.isArray(allObras)) {
        obras = allObras
      } else if (Array.isArray(allObras.data)) {
        obras = allObras.data
      } else if (allObras.data && Array.isArray(allObras.data.data)) {
        obras = allObras.data.data
      } else if (allObras.data && !Array.isArray(allObras.data)) {
        obras = [allObras.data]
      }
      
      const obraEncontrada = obras.find((o: any) => {
        const obraReal = o.attributes && Object.keys(o.attributes).length > 0 ? o.attributes : o
        
        const oId = obraReal.id?.toString() || o.id?.toString()
        const oDocId = obraReal.documentId?.toString() || o.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          oId === idStr ||
          oDocId === idStr ||
          (!isNaN(idNum) && (obraReal.id === idNum || o.id === idNum))
        )
      })
      
      if (obraEncontrada) {
        console.log('[API /tienda/obras/[id] GET] ✅ Obra encontrada en lista completa')
        return NextResponse.json({
          success: true,
          data: obraEncontrada
        }, { status: 200 })
      }
    } catch (listError: any) {
      console.warn('[API /tienda/obras/[id] GET] ⚠️ Error al buscar en lista completa:', listError.message)
    }
    
    // PASO 3: Intentar endpoint directo
    try {
      const response = await strapiClient.get<any>(`/api/obras/${id}?populate=*`)
      
      let obra: any
      if (response.data) {
        obra = response.data
      } else {
        obra = response
      }
      
      if (obra) {
        console.log('[API /tienda/obras/[id] GET] ✅ Obra encontrada con endpoint directo')
        return NextResponse.json({
          success: true,
          data: obra
        }, { status: 200 })
      }
    } catch (directError: any) {
      console.error('[API /tienda/obras/[id] GET] ❌ Error al obtener obra:', directError.message)
    }
    
    return NextResponse.json({
      success: false,
      error: 'Obra no encontrada',
    }, { status: 404 })
    
  } catch (error: any) {
    console.error('[API /tienda/obras/[id] GET] ❌ Error general:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener obra',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Obras DELETE] 🗑️ Eliminando obra:', id)

    const obraEndpoint = '/api/obras'
    
    // Primero obtener la obra de Strapi para obtener el documentId
    let documentId: string | null = null
    try {
      const obraResponse = await strapiClient.get<any>(`${obraEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let obras: any[] = []
      if (Array.isArray(obraResponse)) {
        obras = obraResponse
      } else if (obraResponse.data && Array.isArray(obraResponse.data)) {
        obras = obraResponse.data
      } else if (obraResponse.data) {
        obras = [obraResponse.data]
      }
      const obraStrapi = obras[0]
      documentId = obraStrapi?.documentId || obraStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Obras DELETE] ⚠️ No se pudo obtener obra de Strapi:', error.message)
      documentId = id
    }

    // Eliminar en Strapi usando documentId si está disponible
    // La eliminación en WordPress se maneja automáticamente en los lifecycles de Strapi
    const strapiEndpoint = documentId ? `${obraEndpoint}/${documentId}` : `${obraEndpoint}/${id}`
    console.log('[API Obras DELETE] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    const response = await strapiClient.delete<any>(strapiEndpoint)
    console.log('[API Obras DELETE] ✅ Obra eliminada en Strapi')

    return NextResponse.json({
      success: true,
      message: 'Obra eliminada exitosamente en Strapi',
      data: response
    })

  } catch (error: any) {
    console.error('[API Obras DELETE] ❌ ERROR al eliminar obra:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la obra',
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
    console.log('[API Obras PUT] ✏️ Actualizando obra:', id, body)

    const obraEndpoint = '/api/obras'
    
    // Obtener la obra de Strapi para obtener el documentId
    let obraStrapi: any
    let documentId: string | null = null
    try {
      const obraResponse = await strapiClient.get<any>(`${obraEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let obras: any[] = []
      if (Array.isArray(obraResponse)) {
        obras = obraResponse
      } else if (obraResponse.data && Array.isArray(obraResponse.data)) {
        obras = obraResponse.data
      } else if (obraResponse.data) {
        obras = [obraResponse.data]
      }
      obraStrapi = obras[0]
      documentId = obraStrapi?.documentId || obraStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Obras PUT] ⚠️ No se pudo obtener obra de Strapi:', error.message)
      documentId = id
    }

    if (!obraStrapi) {
      return NextResponse.json({
        success: false,
        error: 'Obra no encontrada'
      }, { status: 404 })
    }

    // Actualizar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${obraEndpoint}/${documentId}` : `${obraEndpoint}/${id}`
    console.log('[API Obras PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    // El schema de Strapi para obras usa: codigo_obra*, nombre_obra*, descripcion
    const obraData: any = {
      data: {}
    }

    // Aceptar diferentes formatos del formulario pero guardar según schema real
    if (body.data.codigo_obra) obraData.data.codigo_obra = body.data.codigo_obra.trim()
    if (body.data.codigoObra) obraData.data.codigo_obra = body.data.codigoObra.trim()
    
    if (body.data.nombre_obra) obraData.data.nombre_obra = body.data.nombre_obra.trim()
    if (body.data.nombreObra) obraData.data.nombre_obra = body.data.nombreObra.trim()
    if (body.data.nombre) obraData.data.nombre_obra = body.data.nombre.trim()
    
    if (body.data.descripcion !== undefined) obraData.data.descripcion = body.data.descripcion || null
    if (body.data.description !== undefined) obraData.data.descripcion = body.data.description || null

    // Estado de publicación - IMPORTANTE: Strapi espera valores en minúsculas
    if (body.data.estado_publicacion !== undefined) {
      // Normalizar a minúsculas para Strapi: "pendiente", "publicado", "borrador"
      const estadoNormalizado = typeof body.data.estado_publicacion === 'string' 
        ? body.data.estado_publicacion.toLowerCase() 
        : body.data.estado_publicacion
      obraData.data.estado_publicacion = estadoNormalizado
      console.log('[API Obras PUT] 📝 Estado de publicación actualizado:', estadoNormalizado)
    }

    const strapiResponse = await strapiClient.put<any>(strapiEndpoint, obraData)
    console.log('[API Obras PUT] ✅ Obra actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Obra actualizada exitosamente en Strapi'
    })

  } catch (error: any) {
    console.error('[API Obras PUT] ❌ ERROR al actualizar obra:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la obra',
      details: error.details
    }, { status: error.status || 500 })
  }
}

