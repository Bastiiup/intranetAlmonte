import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_obra" en WooCommerce
async function getObraAttributeId(): Promise<number | null> {
  try {
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_obra' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
    const allAttributes = await wooCommerceClient.get<any[]>('products/attributes')
    const obraAttribute = allAttributes.find((attr: any) => 
      attr.slug === 'pa_obra' || 
      attr.slug === 'obra' ||
      attr.name?.toLowerCase() === 'obra'
    )
    
    if (obraAttribute) {
      return obraAttribute.id
    }
    
    return null
  } catch (error: any) {
    console.error('[API Obras] ❌ Error al obtener ID del atributo:', error.message)
    return null
  }
}

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
    
    // Primero obtener la obra de Strapi para obtener el documentId y woocommerce_id
    let woocommerceId: string | null = null
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
      woocommerceId = obraStrapi?.attributes?.woocommerce_id || 
                      obraStrapi?.woocommerce_id
    } catch (error: any) {
      console.warn('[API Obras DELETE] ⚠️ No se pudo obtener obra de Strapi:', error.message)
      documentId = id
    }

    // Obtener el ID del atributo
    const attributeId = await getObraAttributeId()

    // Si no tenemos woocommerce_id, buscar por slug (documentId) en WooCommerce
    if (!woocommerceId && documentId && attributeId) {
      try {
        console.log('[API Obras DELETE] 🔍 Buscando término en WooCommerce por slug:', documentId)
        const wcTerms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId.toString() }
        )
        if (wcTerms && wcTerms.length > 0) {
          woocommerceId = wcTerms[0].id.toString()
          console.log('[API Obras DELETE] ✅ Término encontrado en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Obras DELETE] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Eliminar en WooCommerce primero si tenemos el ID
    let wooCommerceDeleted = false
    if (woocommerceId && attributeId) {
      try {
        console.log('[API Obras DELETE] 🛒 Eliminando término en WooCommerce:', woocommerceId)
        await wooCommerceClient.delete<any>(`products/attributes/${attributeId}/terms/${woocommerceId}`, true)
        wooCommerceDeleted = true
        console.log('[API Obras DELETE] ✅ Término eliminado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Obras DELETE] ⚠️ Error al eliminar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Eliminar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${obraEndpoint}/${documentId}` : `${obraEndpoint}/${id}`
    console.log('[API Obras DELETE] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    const response = await strapiClient.delete<any>(strapiEndpoint)
    console.log('[API Obras DELETE] ✅ Obra eliminada en Strapi')

    return NextResponse.json({
      success: true,
      message: 'Obra eliminada exitosamente' + (wooCommerceDeleted ? ' en WooCommerce y Strapi' : ' en Strapi'),
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
    
    // Primero obtener la obra de Strapi para obtener el documentId y woocommerce_id
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

    // Obtener el ID del atributo
    const attributeId = await getObraAttributeId()

    // Buscar en WooCommerce por slug (documentId) o por woocommerce_id
    let woocommerceId: string | null = null
    const woocommerceIdFromStrapi = obraStrapi?.attributes?.woocommerce_id || 
                                    obraStrapi?.woocommerce_id
    
    if (woocommerceIdFromStrapi) {
      woocommerceId = woocommerceIdFromStrapi.toString()
    } else if (documentId && attributeId) {
      // Buscar por slug (documentId) en WooCommerce
      try {
        console.log('[API Obras PUT] 🔍 Buscando término en WooCommerce por slug:', documentId)
        const wcTerms = await wooCommerceClient.get<any[]>(
          `products/attributes/${attributeId}/terms`,
          { slug: documentId.toString() }
        )
        if (wcTerms && wcTerms.length > 0) {
          woocommerceId = wcTerms[0].id.toString()
          console.log('[API Obras PUT] ✅ Término encontrado en WooCommerce por slug:', woocommerceId)
        }
      } catch (searchError: any) {
        console.warn('[API Obras PUT] ⚠️ No se pudo buscar por slug en WooCommerce:', searchError.message)
      }
    }

    // Actualizar en WooCommerce primero si tenemos el ID
    let wooCommerceTerm = null
    if (woocommerceId && attributeId) {
      try {
        console.log('[API Obras PUT] 🛒 Actualizando término en WooCommerce:', woocommerceId)
        
        const wooCommerceTermData: any = {}
        if (body.data.name || body.data.nombre) {
          wooCommerceTermData.name = (body.data.name || body.data.nombre).trim()
        }
        if (body.data.descripcion !== undefined || body.data.description !== undefined) {
          wooCommerceTermData.description = body.data.descripcion || body.data.description || ''
        }

        wooCommerceTerm = await wooCommerceClient.put<any>(
          `products/attributes/${attributeId}/terms/${woocommerceId}`,
          wooCommerceTermData
        )
        console.log('[API Obras PUT] ✅ Término actualizado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Obras PUT] ⚠️ Error al actualizar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Actualizar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${obraEndpoint}/${documentId}` : `${obraEndpoint}/${id}`
    console.log('[API Obras PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    // El schema de Strapi para obras usa 'nombre', no 'name'
    const obraData: any = {
      data: {}
    }

    // Aceptar tanto 'name' como 'nombre' del formulario, pero guardar como 'nombre' en Strapi
    if (body.data.name) obraData.data.nombre = body.data.name
    if (body.data.nombre) obraData.data.nombre = body.data.nombre
    if (body.data.descripcion !== undefined) obraData.data.descripcion = body.data.descripcion
    if (body.data.description !== undefined) obraData.data.descripcion = body.data.description

    // Si se creó en WooCommerce y no teníamos ID, guardarlo
    if (wooCommerceTerm && !woocommerceId) {
      obraData.data.woocommerce_id = wooCommerceTerm.id.toString()
    }

    const strapiResponse = await strapiClient.put<any>(endpoint, obraData)
    console.log('[API Obras PUT] ✅ Obra actualizada en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceTerm,
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Obra actualizada exitosamente' + (wooCommerceTerm ? ' en WooCommerce y Strapi' : ' en Strapi')
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

