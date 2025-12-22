import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Autores GET] Obteniendo autor:', id)

    // Intentar obtener el autor por ID
    let autor: any = null
    
    try {
      // Intentar primero con filtro por ID
      const response = await strapiClient.get<any>(`/api/autores?filters[id][$eq]=${id}&populate=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        autor = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        autor = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        autor = response[0]
      }
    } catch (error: any) {
      console.log('[API Autores GET] Filtro por ID falló, intentando búsqueda directa...')
      
      // Si falla, intentar obtener todos y buscar
      try {
        const allResponse = await strapiClient.get<any>('/api/autores?populate=*&pagination[pageSize]=1000')
        const allAutores = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        autor = allAutores.find((a: any) => 
          a.id?.toString() === id || 
          a.documentId === id ||
          (a.attributes && (a.attributes.id?.toString() === id || a.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Autores GET] Error en búsqueda:', searchError.message)
      }
    }

    // Si aún no se encontró, intentar endpoint directo
    if (!autor) {
      try {
        autor = await strapiClient.get<any>(`/api/autores/${id}?populate=*`)
        if (autor.data) {
          autor = autor.data
        }
      } catch (directError: any) {
        console.error('[API Autores GET] Error en endpoint directo:', directError.message)
      }
    }

    if (!autor) {
      return NextResponse.json({
        success: false,
        error: 'Autor no encontrado'
      }, { status: 404 })
    }

    console.log('[API Autores GET] ✅ Autor encontrado:', autor.id || autor.documentId)
    
    return NextResponse.json({
      success: true,
      data: autor
    })
  } catch (error: any) {
    console.error('[API Autores GET] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener el autor'
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
    console.log('[API Autores PUT] Actualizando autor:', id, body)

    // Buscar el autor primero para obtener el ID correcto
    let autor: any = null
    
    try {
      const response = await strapiClient.get<any>(`/api/autores?filters[id][$eq]=${id}&populate=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        autor = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        autor = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        autor = response[0]
      }
    } catch (error: any) {
      // Si falla, intentar obtener todos y buscar
      try {
        const allResponse = await strapiClient.get<any>('/api/autores?populate=*&pagination[pageSize]=1000')
        const allAutores = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        autor = allAutores.find((a: any) => 
          a.id?.toString() === id || 
          a.documentId === id ||
          (a.attributes && (a.attributes.id?.toString() === id || a.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Autores PUT] Error en búsqueda:', searchError.message)
      }
    }

    if (!autor) {
      return NextResponse.json({
        success: false,
        error: 'Autor no encontrado'
      }, { status: 404 })
    }

    // En Strapi v4, usar documentId (string) para actualizar, no el id numérico
    const autorDocumentId = autor.documentId || autor.data?.documentId || autor.id?.toString() || id
    console.log('[API Autores PUT] Usando documentId para actualizar:', autorDocumentId)

    // Preparar datos de actualización
    const updateData: any = {
      data: {},
    }

    if (body.data.nombre_completo_autor !== undefined) {
      updateData.data.nombre_completo_autor = body.data.nombre_completo_autor
    }
    if (body.data.nombres !== undefined) {
      updateData.data.nombres = body.data.nombres
    }
    if (body.data.primer_apellido !== undefined) {
      updateData.data.primer_apellido = body.data.primer_apellido
    }
    if (body.data.segundo_apellido !== undefined) {
      updateData.data.segundo_apellido = body.data.segundo_apellido
    }
    if (body.data.tipo_autor !== undefined) {
      updateData.data.tipo_autor = body.data.tipo_autor
    }
    if (body.data.website !== undefined) {
      updateData.data.website = body.data.website
    }
    if (body.data.pais !== undefined) {
      updateData.data.pais = body.data.pais
    }
    if (body.data.foto !== undefined) {
      updateData.data.foto = body.data.foto
    }
    if (body.data.estado_publicacion !== undefined) {
      updateData.data.estado_publicacion = body.data.estado_publicacion
    }

    const response = await strapiClient.put(`/api/autores/${autorDocumentId}`, updateData)
    
    console.log('[API Autores PUT] ✅ Autor actualizado:', autorDocumentId)
    
    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error: any) {
    console.error('[API Autores PUT] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar el autor'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Autores DELETE] Eliminando autor:', id)

    // Buscar el autor primero para obtener el ID correcto
    let autor: any = null
    
    try {
      const response = await strapiClient.get<any>(`/api/autores?filters[id][$eq]=${id}&populate=*`)
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        autor = response.data[0]
      } else if (response.data && !Array.isArray(response.data)) {
        autor = response.data
      } else if (Array.isArray(response) && response.length > 0) {
        autor = response[0]
      }
    } catch (error: any) {
      // Si falla, intentar obtener todos y buscar
      try {
        const allResponse = await strapiClient.get<any>('/api/autores?populate=*&pagination[pageSize]=1000')
        const allAutores = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        autor = allAutores.find((a: any) => 
          a.id?.toString() === id || 
          a.documentId === id ||
          (a.attributes && (a.attributes.id?.toString() === id || a.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Autores DELETE] Error en búsqueda:', searchError.message)
      }
    }

    if (!autor) {
      return NextResponse.json({
        success: false,
        error: 'Autor no encontrado'
      }, { status: 404 })
    }

    // En Strapi v4, usar documentId (string) para eliminar, no el id numérico
    const autorDocumentId = autor.documentId || autor.data?.documentId || autor.id?.toString() || id
    console.log('[API Autores DELETE] Usando documentId para eliminar:', autorDocumentId)

    await strapiClient.delete(`/api/autores/${autorDocumentId}`)
    
    console.log('[API Autores DELETE] ✅ Autor eliminado:', autorDocumentId)
    
    return NextResponse.json({
      success: true,
      message: 'Autor eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('[API Autores DELETE] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar el autor'
    }, { status: 500 })
  }
}

