import { NextResponse } from 'next/server'
import type { Request } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_coleccion" en WooCommerce
async function getColeccionAttributeId(): Promise<number | null> {
  try {
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_coleccion' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
    const allAttributes = await wooCommerceClient.get<any[]>('products/attributes')
    const coleccionAttribute = allAttributes.find((attr: any) => 
      attr.slug === 'pa_coleccion' || 
      attr.slug === 'coleccion' ||
      attr.name?.toLowerCase().includes('coleccion') ||
      attr.name?.toLowerCase().includes('collection')
    )
    
    if (coleccionAttribute) {
      return coleccionAttribute.id
    }
    
    return null
  } catch (error: any) {
    console.error('[API Coleccion] ❌ Error al obtener ID del atributo:', error.message)
    return null
  }
}

// Función helper para detectar el endpoint correcto de Strapi
async function getColeccionEndpoint(): Promise<string> {
  const endpoints = ['/api/colecciones', '/api/serie-coleccions', '/api/colecciones-series']
  
  for (const endpoint of endpoints) {
    try {
      await strapiClient.get<any>(`${endpoint}?pagination[pageSize]=1`)
      return endpoint
    } catch (error) {
      // Continuar con el siguiente
    }
  }
  
  return '/api/colecciones'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const coleccionEndpoint = await getColeccionEndpoint()
    
    // Intentar obtener por documentId primero
    let coleccion: any = null
    try {
      coleccion = await strapiClient.get<any>(`${coleccionEndpoint}/${id}?populate=*`)
    } catch (error: any) {
      // Si falla, intentar buscar por ID numérico
      console.log('[API Coleccion GET] Intentando buscar por ID numérico...')
      try {
        const allColecciones = await strapiClient.get<any>(`${coleccionEndpoint}?populate=*&pagination[pageSize]=1000`)
        const items = Array.isArray(allColecciones) 
          ? allColecciones 
          : (allColecciones.data || [])
        
        coleccion = items.find((item: any) => 
          item.id?.toString() === id || 
          item.documentId === id ||
          item.attributes?.id?.toString() === id
        )
      } catch (searchError: any) {
        console.error('[API Coleccion GET] Error en búsqueda:', searchError.message)
      }
    }

    if (!coleccion) {
      return NextResponse.json({
        success: false,
        error: 'Colección no encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: coleccion
    })
  } catch (error: any) {
    console.error('[API Coleccion GET] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener la colección'
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('[API Coleccion PUT] 📝 Actualizando coleccion:', id, body)

    const coleccionEndpoint = await getColeccionEndpoint()
    
    // Obtener la colección actual para obtener el documentId
    let currentColeccion: any = null
    try {
      currentColeccion = await strapiClient.get<any>(`${coleccionEndpoint}/${id}?populate=*`)
    } catch (error: any) {
      // Intentar buscar por ID
      const allColecciones = await strapiClient.get<any>(`${coleccionEndpoint}?populate=*&pagination[pageSize]=1000`)
      const items = Array.isArray(allColecciones) 
        ? allColecciones 
        : (allColecciones.data || [])
      
      currentColeccion = items.find((item: any) => 
        item.id?.toString() === id || 
        item.documentId === id ||
        item.attributes?.id?.toString() === id
      )
    }

    if (!currentColeccion) {
      return NextResponse.json({
        success: false,
        error: 'Colección no encontrada'
      }, { status: 404 })
    }

    const documentId = currentColeccion.documentId || currentColeccion.data?.documentId || id

    // Actualizar en WooCommerce primero usando el slug (documentId)
    const attributeId = await getColeccionAttributeId()
    if (attributeId) {
      try {
        // Buscar el término por slug (documentId)
        const terms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId }
        )

        if (terms && terms.length > 0) {
          const term = terms[0]
          const wooCommerceTermData: any = {}
          
          // Actualizar nombre si se proporciona
          const nombreColeccion = body.data?.nombre || body.data?.titulo || body.data?.name || body.data?.title
          if (nombreColeccion) {
            wooCommerceTermData.name = nombreColeccion.trim()
          }

          if (Object.keys(wooCommerceTermData).length > 0) {
            await wooCommerceClient.put<any>(
              `products/attributes/${attributeId}/terms/${term.id}`,
              wooCommerceTermData
            )
            console.log('[API Coleccion PUT] ✅ Término actualizado en WooCommerce')
          }
        }
      } catch (wooError: any) {
        console.warn('[API Coleccion PUT] ⚠️ Error al actualizar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Actualizar en Strapi
    const coleccionData: any = {
      data: {}
    }

    // Campos de nombre
    if (body.data.nombre) coleccionData.data.nombre = body.data.nombre.trim()
    if (body.data.titulo) coleccionData.data.titulo = body.data.titulo.trim()
    if (body.data.name) coleccionData.data.name = body.data.name.trim()
    if (body.data.title) coleccionData.data.title = body.data.title.trim()
    
    // Campos opcionales
    if (body.data.descripcion !== undefined) coleccionData.data.descripcion = body.data.descripcion?.trim() || null
    if (body.data.description !== undefined) coleccionData.data.description = body.data.description?.trim() || null

    // Media
    if (body.data.imagen !== undefined) coleccionData.data.imagen = body.data.imagen || null
    if (body.data.logo !== undefined) coleccionData.data.logo = body.data.logo || null

    // Relaciones
    if (body.data.sello !== undefined) coleccionData.data.sello = body.data.sello || null
    if (body.data.editorial !== undefined) coleccionData.data.editorial = body.data.editorial || null

    const strapiResponse = await strapiClient.put<any>(`${coleccionEndpoint}/${documentId}`, coleccionData)
    console.log('[API Coleccion PUT] ✅ Coleccion actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: strapiResponse.data || strapiResponse
    })
  } catch (error: any) {
    console.error('[API Coleccion PUT] ❌ ERROR al actualizar coleccion:', {
      message: error.message,
      status: error.status || 500,
      details: error.details || {}
    })

    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar la colección',
      details: error.details || {}
    }, { status: error.status || 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Coleccion DELETE] 🗑️ Eliminando coleccion:', id)

    const coleccionEndpoint = await getColeccionEndpoint()
    
    // Obtener la colección para obtener el documentId
    let currentColeccion: any = null
    try {
      currentColeccion = await strapiClient.get<any>(`${coleccionEndpoint}/${id}?populate=*`)
    } catch (error: any) {
      const allColecciones = await strapiClient.get<any>(`${coleccionEndpoint}?populate=*&pagination[pageSize]=1000`)
      const items = Array.isArray(allColecciones) 
        ? allColecciones 
        : (allColecciones.data || [])
      
      currentColeccion = items.find((item: any) => 
        item.id?.toString() === id || 
        item.documentId === id ||
        item.attributes?.id?.toString() === id
      )
    }

    if (!currentColeccion) {
      return NextResponse.json({
        success: false,
        error: 'Colección no encontrada'
      }, { status: 404 })
    }

    const documentId = currentColeccion.documentId || currentColeccion.data?.documentId || id

    // Eliminar de WooCommerce primero usando el slug (documentId)
    const attributeId = await getColeccionAttributeId()
    if (attributeId) {
      try {
        const terms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId }
        )

        if (terms && terms.length > 0) {
          await wooCommerceClient.delete<any>(
            `products/attributes/${attributeId}/terms/${terms[0].id}`,
            { force: true }
          )
          console.log('[API Coleccion DELETE] ✅ Término eliminado de WooCommerce')
        }
      } catch (wooError: any) {
        console.warn('[API Coleccion DELETE] ⚠️ Error al eliminar de WooCommerce (no crítico):', wooError.message)
      }
    }

    // Eliminar de Strapi
    await strapiClient.delete<any>(`${coleccionEndpoint}/${documentId}`)
    console.log('[API Coleccion DELETE] ✅ Coleccion eliminada de Strapi')

    return NextResponse.json({
      success: true,
      message: 'Colección eliminada correctamente'
    })
  } catch (error: any) {
    console.error('[API Coleccion DELETE] ❌ ERROR al eliminar coleccion:', error.message)

    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar la colección'
    }, { status: error.status || 500 })
  }
}

