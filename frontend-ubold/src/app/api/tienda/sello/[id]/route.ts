import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('[API /tienda/sello/[id] GET] Obteniendo sello:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
    })
    
    const selloEndpoint = '/api/sellos'
    
    // PASO 1: Intentar con filtro si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `${selloEndpoint}?filters[id][$eq]=${id}&populate=*`
        )
        
        let sello: any
        if (Array.isArray(filteredResponse)) {
          sello = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          sello = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          sello = filteredResponse.data
        } else {
          sello = filteredResponse
        }
        
        if (sello && (sello.id || sello.documentId)) {
          console.log('[API /tienda/sello/[id] GET] ✅ Sello encontrado con filtro')
          return NextResponse.json({
            success: true,
            data: sello
          }, { status: 200 })
        }
      } catch (filterError: any) {
        console.warn('[API /tienda/sello/[id] GET] ⚠️ Error al obtener con filtro:', filterError.message)
      }
    }
    
    // PASO 2: Buscar en lista completa
    try {
      const allSellos = await strapiClient.get<any>(
        `${selloEndpoint}?populate=*&pagination[pageSize]=1000`
      )
      
      let sellos: any[] = []
      
      if (Array.isArray(allSellos)) {
        sellos = allSellos
      } else if (Array.isArray(allSellos.data)) {
        sellos = allSellos.data
      } else if (allSellos.data && Array.isArray(allSellos.data.data)) {
        sellos = allSellos.data.data
      } else if (allSellos.data && !Array.isArray(allSellos.data)) {
        sellos = [allSellos.data]
      }
      
      const selloEncontrado = sellos.find((s: any) => {
        const sReal = s.attributes && Object.keys(s.attributes).length > 0 ? s.attributes : s
        
        const sId = sReal.id?.toString() || s.id?.toString()
        const sDocId = sReal.documentId?.toString() || s.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          sId === idStr ||
          sDocId === idStr ||
          (!isNaN(idNum) && (sReal.id === idNum || s.id === idNum))
        )
      })
      
      if (selloEncontrado) {
        console.log('[API /tienda/sello/[id] GET] ✅ Sello encontrado en lista completa')
        return NextResponse.json({
          success: true,
          data: selloEncontrado
        }, { status: 200 })
      }
    } catch (listError: any) {
      console.warn('[API /tienda/sello/[id] GET] ⚠️ Error al buscar en lista completa:', listError.message)
    }
    
    // PASO 3: Intentar endpoint directo
    try {
      const response = await strapiClient.get<any>(`${selloEndpoint}/${id}?populate=*`)
      
      let sello: any
      if (response.data) {
        sello = response.data
      } else {
        sello = response
      }
      
      if (sello) {
        console.log('[API /tienda/sello/[id] GET] ✅ Sello encontrado con endpoint directo')
        return NextResponse.json({
          success: true,
          data: sello
        }, { status: 200 })
      }
    } catch (directError: any) {
      console.error('[API /tienda/sello/[id] GET] ❌ Error al obtener sello:', directError.message)
    }
    
    return NextResponse.json({
      success: false,
      error: 'Sello no encontrado',
    }, { status: 404 })
    
  } catch (error: any) {
    console.error('[API /tienda/sello/[id] GET] ❌ Error general:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener sello',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Sello DELETE] 🗑️ Eliminando sello:', id)

    const selloEndpoint = '/api/sellos'
    
    // Primero obtener el sello de Strapi para obtener el documentId
    let documentId: string | null = null
    try {
      const selloResponse = await strapiClient.get<any>(`${selloEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let sellos: any[] = []
      if (Array.isArray(selloResponse)) {
        sellos = selloResponse
      } else if (selloResponse.data && Array.isArray(selloResponse.data)) {
        sellos = selloResponse.data
      } else if (selloResponse.data) {
        sellos = [selloResponse.data]
      }
      const selloStrapi = sellos[0]
      documentId = selloStrapi?.documentId || selloStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Sello DELETE] ⚠️ No se pudo obtener sello de Strapi:', error.message)
      documentId = id
    }

    // Eliminar en Strapi usando documentId si está disponible
    // La eliminación en WordPress se maneja automáticamente en los lifecycles de Strapi
    const strapiEndpoint = documentId ? `${selloEndpoint}/${documentId}` : `${selloEndpoint}/${id}`
    console.log('[API Sello DELETE] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    const response = await strapiClient.delete<any>(strapiEndpoint)
    console.log('[API Sello DELETE] ✅ Sello eliminado en Strapi')

    return NextResponse.json({
      success: true,
      message: 'Sello eliminado exitosamente en Strapi',
      data: response
    })

  } catch (error: any) {
    console.error('[API Sello DELETE] ❌ ERROR al eliminar sello:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar el sello',
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
    console.log('[API Sello PUT] ✏️ Actualizando sello:', id, body)

    const selloEndpoint = '/api/sellos'
    
    // Primero obtener el sello de Strapi para obtener el documentId
    let selloStrapi: any
    let documentId: string | null = null
    try {
      const selloResponse = await strapiClient.get<any>(`${selloEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let sellos: any[] = []
      if (Array.isArray(selloResponse)) {
        sellos = selloResponse
      } else if (selloResponse.data && Array.isArray(selloResponse.data)) {
        sellos = selloResponse.data
      } else if (selloResponse.data) {
        sellos = [selloResponse.data]
      }
      selloStrapi = sellos[0]
      documentId = selloStrapi?.documentId || selloStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Sello PUT] ⚠️ No se pudo obtener sello de Strapi:', error.message)
      documentId = id
    }

    // La sincronización con WooCommerce se maneja automáticamente en los lifecycles de Strapi
    // No necesitamos actualizar WooCommerce directamente aquí

    // Actualizar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${selloEndpoint}/${documentId}` : `${selloEndpoint}/${id}`
    console.log('[API Sello PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    // El schema de Strapi para sello usa: id_sello* (Number), nombre_sello* (Text), acronimo, logo, website, editorial
    const selloData: any = {
      data: {}
    }

    // Aceptar diferentes formatos del formulario pero guardar según schema real
    if (body.data.id_sello !== undefined) {
      selloData.data.id_sello = typeof body.data.id_sello === 'string' ? parseInt(body.data.id_sello) : body.data.id_sello
    }
    if (body.data.idSello !== undefined) {
      selloData.data.id_sello = typeof body.data.idSello === 'string' ? parseInt(body.data.idSello) : body.data.idSello
    }
    
    if (body.data.nombre_sello) selloData.data.nombre_sello = body.data.nombre_sello.trim()
    if (body.data.nombreSello) selloData.data.nombre_sello = body.data.nombreSello.trim()
    if (body.data.nombre) selloData.data.nombre_sello = body.data.nombre.trim()
    
    if (body.data.acronimo !== undefined) selloData.data.acronimo = body.data.acronimo?.trim() || null
    if (body.data.website !== undefined) selloData.data.website = body.data.website?.trim() || null
    
    // Manejar relaciones según tipo
    // manyToOne: solo el ID o documentId (o null para desconectar)
    if (body.data.editorial !== undefined) {
      selloData.data.editorial = body.data.editorial || null
    }

    // oneToMany: array de IDs o documentIds (o [] para limpiar todas)
    if (body.data.libros !== undefined) {
      selloData.data.libros = body.data.libros && body.data.libros.length > 0 ? body.data.libros : []
    }
    
    if (body.data.colecciones !== undefined) {
      selloData.data.colecciones = body.data.colecciones && body.data.colecciones.length > 0 ? body.data.colecciones : []
    }

    // Media: solo el ID (o null para eliminar)
    if (body.data.logo !== undefined) {
      selloData.data.logo = body.data.logo || null
    }

    // Estado de publicación - IMPORTANTE: Strapi espera valores en minúsculas
    if (body.data.estado_publicacion !== undefined) {
      // Normalizar a minúsculas para Strapi: "pendiente", "publicado", "borrador"
      const estadoNormalizado = typeof body.data.estado_publicacion === 'string' 
        ? body.data.estado_publicacion.toLowerCase() 
        : body.data.estado_publicacion
      selloData.data.estado_publicacion = estadoNormalizado
      console.log('[API Sello PUT] 📝 Estado de publicación actualizado:', estadoNormalizado)
    }

    // No guardamos woocommerce_id en Strapi porque no existe en el schema
    // El match se hace usando documentId como slug en WooCommerce
    // La sincronización con WooCommerce se maneja automáticamente en los lifecycles de Strapi

    const strapiResponse = await strapiClient.put<any>(strapiEndpoint, selloData)
    console.log('[API Sello PUT] ✅ Sello actualizado en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Sello actualizado exitosamente en Strapi'
    })

  } catch (error: any) {
    console.error('[API Sello PUT] ❌ ERROR al actualizar sello:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar el sello',
      details: error.details
    }, { status: error.status || 500 })
  }
}
