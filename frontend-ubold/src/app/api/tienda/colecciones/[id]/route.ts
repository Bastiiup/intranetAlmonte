import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Colecciones GET] Obteniendo colección:', id)

    // Intentar obtener la colección por ID
    let coleccion: any = null
    
    try {
      // Intentar primero con filtro por ID
      const response = await strapiClient.get<any>(`/api/colecciones?filters[id][$eq]=${id}&populate=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        coleccion = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        coleccion = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        coleccion = response[0]
      }
    } catch (error: any) {
      console.log('[API Colecciones GET] Filtro por ID falló, intentando búsqueda directa...')
      
      // Si falla, intentar obtener todas y buscar
      try {
        const allResponse = await strapiClient.get<any>('/api/colecciones?populate=*&pagination[pageSize]=1000')
        const allColecciones = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        coleccion = allColecciones.find((c: any) => 
          c.id?.toString() === id || 
          c.documentId === id ||
          (c.attributes && (c.attributes.id?.toString() === id || c.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Colecciones GET] Error en búsqueda:', searchError.message)
      }
    }

    // Si aún no se encontró, intentar endpoint directo
    if (!coleccion) {
      try {
        coleccion = await strapiClient.get<any>(`/api/colecciones/${id}?populate=*`)
        if (coleccion.data) {
          coleccion = coleccion.data
        }
      } catch (directError: any) {
        console.error('[API Colecciones GET] Error en endpoint directo:', directError.message)
      }
    }

    if (!coleccion) {
      return NextResponse.json({
        success: false,
        error: 'Colección no encontrada'
      }, { status: 404 })
    }

    console.log('[API Colecciones GET] ✅ Colección encontrada:', coleccion.id || coleccion.documentId)
    
    return NextResponse.json({
      success: true,
      data: coleccion
    })
  } catch (error: any) {
    console.error('[API Colecciones GET] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener la colección'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('[API Colecciones PUT] Actualizando colección:', id, body)

    // Buscar la colección primero para obtener el ID correcto
    let coleccion: any = null
    
    try {
      const response = await strapiClient.get<any>(`/api/colecciones?filters[id][$eq]=${id}&populate=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        coleccion = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        coleccion = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        coleccion = response[0]
      }
    } catch (error: any) {
      // Si falla, intentar obtener todas y buscar
      try {
        const allResponse = await strapiClient.get<any>('/api/colecciones?populate=*&pagination[pageSize]=1000')
        const allColecciones = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        coleccion = allColecciones.find((c: any) => 
          c.id?.toString() === id || 
          c.documentId === id ||
          (c.attributes && (c.attributes.id?.toString() === id || c.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Colecciones PUT] Error en búsqueda:', searchError.message)
      }
    }

    if (!coleccion) {
      return NextResponse.json({
        success: false,
        error: 'Colección no encontrada'
      }, { status: 404 })
    }

    // En Strapi v4, usar documentId (string) para actualizar, no el id numérico
    const coleccionDocumentId = coleccion.documentId || coleccion.data?.documentId || coleccion.id?.toString() || id
    console.log('[API Colecciones PUT] Usando documentId para actualizar:', coleccionDocumentId)

    // Preparar datos de actualización
    const updateData: any = {
      data: {},
    }

    if (body.data.nombre_coleccion !== undefined) {
      updateData.data.nombre_coleccion = body.data.nombre_coleccion
    }
    if (body.data.id_coleccion !== undefined) {
      updateData.data.id_coleccion = body.data.id_coleccion ? parseInt(body.data.id_coleccion) : null
    }
    if (body.data.editorial !== undefined) {
      updateData.data.editorial = body.data.editorial
    }
    if (body.data.sello !== undefined) {
      updateData.data.sello = body.data.sello
    }
    if (body.data.estado_publicacion !== undefined) {
      updateData.data.estado_publicacion = body.data.estado_publicacion
    }

    const response = await strapiClient.put(`/api/colecciones/${coleccionDocumentId}`, updateData)
    
    console.log('[API Colecciones PUT] ✅ Colección actualizada:', coleccionDocumentId)
    
    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error: any) {
    console.error('[API Colecciones PUT] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la colección'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Colecciones DELETE] Eliminando colección:', id)

    // Buscar la colección primero para obtener el ID correcto
    let coleccion: any = null
    
    try {
      const response = await strapiClient.get<any>(`/api/colecciones?filters[id][$eq]=${id}&populate=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        coleccion = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        coleccion = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        coleccion = response[0]
      }
    } catch (error: any) {
      // Si falla, intentar obtener todas y buscar
      try {
        const allResponse = await strapiClient.get<any>('/api/colecciones?populate=*&pagination[pageSize]=1000')
        const allColecciones = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        coleccion = allColecciones.find((c: any) => 
          c.id?.toString() === id || 
          c.documentId === id ||
          (c.attributes && (c.attributes.id?.toString() === id || c.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Colecciones DELETE] Error en búsqueda:', searchError.message)
      }
    }

    if (!coleccion) {
      return NextResponse.json({
        success: false,
        error: 'Colección no encontrada'
      }, { status: 404 })
    }

    // En Strapi v4, usar documentId (string) para eliminar, no el id numérico
    const coleccionDocumentId = coleccion.documentId || coleccion.data?.documentId || coleccion.id?.toString() || id
    console.log('[API Colecciones DELETE] Usando documentId para eliminar:', coleccionDocumentId)

    await strapiClient.delete(`/api/colecciones/${coleccionDocumentId}`)
    
    console.log('[API Colecciones DELETE] ✅ Colección eliminada:', coleccionDocumentId)
    
    return NextResponse.json({
      success: true,
      message: 'Colección eliminada exitosamente'
    })
  } catch (error: any) {
    console.error('[API Colecciones DELETE] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la colección'
    }, { status: 500 })
  }
}

