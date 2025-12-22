import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el cliente de WooCommerce según la plataforma
function getWooCommerceClientForPlatform(platform: string) {
  // Por ahora usamos el cliente por defecto
  // TODO: Implementar lógica para seleccionar cliente según platform (woo_moraleja, woo_escolar)
  return wooCommerceClient
}

// Función helper para mapear tipo_cupon de Strapi a discount_type de WooCommerce
function mapDiscountType(tipoCupon: string | null): string {
  if (!tipoCupon) return 'fixed_cart'
  
  const mapping: Record<string, string> = {
    'fixed_cart': 'fixed_cart',
    'fixed_product': 'fixed_product',
    'percent': 'percent',
    'percent_product': 'percent_product',
  }
  
  return mapping[tipoCupon.toLowerCase()] || 'fixed_cart'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('[API /tienda/cupones/[id] GET] Obteniendo cupón:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
    })
    
    // PASO 1: Intentar con filtro si es numérico
    if (!isNaN(parseInt(id))) {
      try {
        const filteredResponse = await strapiClient.get<any>(
          `/api/wo-cupones?filters[id][$eq]=${id}&populate=*`
        )
        
        let cupon: any
        if (Array.isArray(filteredResponse)) {
          cupon = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          cupon = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          cupon = filteredResponse.data
        } else {
          cupon = filteredResponse
        }
        
        if (cupon && (cupon.id || cupon.documentId)) {
          console.log('[API /tienda/cupones/[id] GET] ✅ Cupón encontrado con filtro')
          return NextResponse.json({
            success: true,
            data: cupon
          }, { status: 200 })
        }
      } catch (filterError: any) {
        console.warn('[API /tienda/cupones/[id] GET] ⚠️ Error al obtener con filtro:', filterError.message)
      }
    }
    
    // PASO 2: Buscar en lista completa
    try {
      const allCupones = await strapiClient.get<any>(
        `/api/wo-cupones?populate=*&pagination[pageSize]=1000`
      )
      
      let cupones: any[] = []
      
      if (Array.isArray(allCupones)) {
        cupones = allCupones
      } else if (Array.isArray(allCupones.data)) {
        cupones = allCupones.data
      } else if (allCupones.data && Array.isArray(allCupones.data.data)) {
        cupones = allCupones.data.data
      } else if (allCupones.data && !Array.isArray(allCupones.data)) {
        cupones = [allCupones.data]
      }
      
      const cuponEncontrado = cupones.find((c: any) => {
        const cuponReal = c.attributes && Object.keys(c.attributes).length > 0 ? c.attributes : c
        
        const cId = cuponReal.id?.toString() || c.id?.toString()
        const cDocId = cuponReal.documentId?.toString() || c.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        return (
          cId === idStr ||
          cDocId === idStr ||
          (!isNaN(idNum) && (cuponReal.id === idNum || c.id === idNum))
        )
      })
      
      if (cuponEncontrado) {
        console.log('[API /tienda/cupones/[id] GET] ✅ Cupón encontrado en lista completa')
        return NextResponse.json({
          success: true,
          data: cuponEncontrado
        }, { status: 200 })
      }
    } catch (listError: any) {
      console.warn('[API /tienda/cupones/[id] GET] ⚠️ Error al buscar en lista completa:', listError.message)
    }
    
    // PASO 3: Intentar endpoint directo
    try {
      const response = await strapiClient.get<any>(`/api/wo-cupones/${id}?populate=*`)
      
      let cupon: any
      if (response.data) {
        cupon = response.data
      } else {
        cupon = response
      }
      
      if (cupon) {
        console.log('[API /tienda/cupones/[id] GET] ✅ Cupón encontrado con endpoint directo')
        return NextResponse.json({
          success: true,
          data: cupon
        }, { status: 200 })
      }
    } catch (directError: any) {
      console.error('[API /tienda/cupones/[id] GET] ❌ Error al obtener cupón:', directError.message)
    }
    
    return NextResponse.json({
      success: false,
      error: 'Cupón no encontrado',
    }, { status: 404 })
    
  } catch (error: any) {
    console.error('[API /tienda/cupones/[id] GET] ❌ Error general:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al obtener cupón',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[API Cupones DELETE] 🗑️ Eliminando cupón:', id)

    const cuponEndpoint = '/api/wo-cupones'
    
    // Primero obtener el cupón de Strapi para obtener el documentId y wooId
    let documentId: string | null = null
    let wooId: number | null = null
    let originPlatform: string = 'woo_moraleja'
    
    try {
      const cuponResponse = await strapiClient.get<any>(`${cuponEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let cupones: any[] = []
      if (Array.isArray(cuponResponse)) {
        cupones = cuponResponse
      } else if (cuponResponse.data && Array.isArray(cuponResponse.data)) {
        cupones = cuponResponse.data
      } else if (cuponResponse.data) {
        cupones = [cuponResponse.data]
      }
      const cuponStrapi = cupones[0]
      documentId = cuponStrapi?.documentId || cuponStrapi?.data?.documentId || id
      // Aceptar tanto camelCase como snake_case para compatibilidad
      wooId = cuponStrapi?.woo_id || cuponStrapi?.wooId || cuponStrapi?.data?.woo_id || cuponStrapi?.data?.wooId || null
      originPlatform = cuponStrapi?.origin_platform || cuponStrapi?.originPlatform || cuponStrapi?.data?.origin_platform || cuponStrapi?.data?.originPlatform || 'woo_moraleja'
    } catch (error: any) {
      console.warn('[API Cupones DELETE] ⚠️ No se pudo obtener cupón de Strapi:', error.message)
      documentId = id
    }

    // Eliminar en WooCommerce primero si tenemos el ID
    let wooCommerceDeleted = false
    if (wooId) {
      try {
        const wcClient = getWooCommerceClientForPlatform(originPlatform)
        console.log('[API Cupones DELETE] 🛒 Eliminando cupón en WooCommerce:', wooId)
        await wcClient.delete<any>(`coupons/${wooId}`, true)
        wooCommerceDeleted = true
        console.log('[API Cupones DELETE] ✅ Cupón eliminado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Cupones DELETE] ⚠️ Error al eliminar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Eliminar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${cuponEndpoint}/${documentId}` : `${cuponEndpoint}/${id}`
    console.log('[API Cupones DELETE] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    let strapiResponse: any = null
    try {
      strapiResponse = await strapiClient.delete<any>(strapiEndpoint)
      console.log('[API Cupones DELETE] ✅ Cupón eliminado en Strapi')
    } catch (deleteError: any) {
      // Ignorar errores si la respuesta no es JSON válido (puede ser 204 No Content)
      if (deleteError.message && !deleteError.message.includes('JSON') && !deleteError.message.includes('Unexpected end')) {
        throw deleteError
      } else {
        console.log('[API Cupones DELETE] ✅ Cupón eliminado en Strapi (respuesta no JSON, probablemente exitosa)')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cupón eliminado exitosamente' + (wooCommerceDeleted ? ' en WooCommerce y Strapi' : ' en Strapi'),
      data: strapiResponse || { deleted: true }
    })

  } catch (error: any) {
    console.error('[API Cupones DELETE] ❌ ERROR al eliminar cupón:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar el cupón',
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
    console.log('[API Cupones PUT] ✏️ Actualizando cupón:', id, body)

    const cuponEndpoint = '/api/wo-cupones'
    
    // Primero obtener el cupón de Strapi para obtener el documentId y wooId
    let cuponStrapi: any
    let documentId: string | null = null
    let wooId: number | null = null
    let originPlatform: string = 'woo_moraleja'
    
    try {
      const cuponResponse = await strapiClient.get<any>(`${cuponEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let cupones: any[] = []
      if (Array.isArray(cuponResponse)) {
        cupones = cuponResponse
      } else if (cuponResponse.data && Array.isArray(cuponResponse.data)) {
        cupones = cuponResponse.data
      } else if (cuponResponse.data) {
        cupones = [cuponResponse.data]
      }
      cuponStrapi = cupones[0]
      documentId = cuponStrapi?.documentId || cuponStrapi?.data?.documentId || id
      wooId = cuponStrapi?.wooId || cuponStrapi?.data?.wooId || null
      originPlatform = body.data.origin_platform || body.data.originPlatform || cuponStrapi?.origin_platform || cuponStrapi?.originPlatform || cuponStrapi?.data?.origin_platform || cuponStrapi?.data?.originPlatform || 'woo_moraleja'
    } catch (error: any) {
      console.warn('[API Cupones PUT] ⚠️ No se pudo obtener cupón de Strapi:', error.message)
      documentId = id
    }

    // Validar origin_platform (aceptar tanto originPlatform como origin_platform)
    const validPlatforms = ['woo_moraleja', 'woo_escolar', 'otros']
    const platformToValidate = body.data.origin_platform || body.data.originPlatform
    if (platformToValidate && !validPlatforms.includes(platformToValidate)) {
      return NextResponse.json({
        success: false,
        error: `origin_platform debe ser uno de: ${validPlatforms.join(', ')}`
      }, { status: 400 })
    }

    // Actualizar en WooCommerce primero si tenemos el ID
    let wooCommerceCupon = null
    if (wooId) {
      try {
        const wcClient = getWooCommerceClientForPlatform(originPlatform)
        console.log('[API Cupones PUT] 🛒 Actualizando cupón en WooCommerce:', wooId)
        
        const wooCommerceCuponData: any = {}
        
        if (body.data.codigo) {
          wooCommerceCuponData.code = body.data.codigo.trim()
        }
        if (body.data.tipo_cupon !== undefined) {
          wooCommerceCuponData.discount_type = mapDiscountType(body.data.tipo_cupon)
        }
        if (body.data.importe_cupon !== undefined) {
          wooCommerceCuponData.amount = String(body.data.importe_cupon)
        }
        if (body.data.descripcion !== undefined) {
          wooCommerceCuponData.description = body.data.descripcion || ''
        }
        if (body.data.uso_limite !== undefined) {
          wooCommerceCuponData.usage_limit = body.data.uso_limite || null
        }
        if (body.data.fecha_caducidad !== undefined) {
          wooCommerceCuponData.expiry_date = body.data.fecha_caducidad || null
        }
        if (body.data.producto_ids !== undefined) {
          const requiresProducts = body.data.tipo_cupon === 'fixed_product' || body.data.tipo_cupon === 'percent_product'
          if (Array.isArray(body.data.producto_ids) && body.data.producto_ids.length > 0) {
            const productIds = body.data.producto_ids
              .map((id: any) => {
                const numId = parseInt(String(id))
                return isNaN(numId) ? null : numId
              })
              .filter((id: number | null) => id !== null) as number[]
            
            if (productIds.length > 0) {
              wooCommerceCuponData.product_ids = productIds
            } else if (requiresProducts) {
              wooCommerceCuponData.product_ids = []
            }
          } else if (requiresProducts) {
            wooCommerceCuponData.product_ids = []
          }
        }

        wooCommerceCupon = await wcClient.put<any>(
          `coupons/${wooId}`,
          wooCommerceCuponData
        )
        console.log('[API Cupones PUT] ✅ Cupón actualizado en WooCommerce')
      } catch (wooError: any) {
        console.error('[API Cupones PUT] ⚠️ Error al actualizar en WooCommerce (no crítico):', wooError.message)
      }
    }

    // Actualizar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${cuponEndpoint}/${documentId}` : `${cuponEndpoint}/${id}`
    console.log('[API Cupones PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    const cuponData: any = {
      data: {}
    }

    if (body.data.codigo !== undefined) cuponData.data.codigo = body.data.codigo.trim()
    if (body.data.tipo_cupon !== undefined) cuponData.data.tipo_cupon = body.data.tipo_cupon || null
    if (body.data.importe_cupon !== undefined) cuponData.data.importe_cupon = body.data.importe_cupon ? parseFloat(body.data.importe_cupon) : null
    if (body.data.descripcion !== undefined) cuponData.data.descripcion = body.data.descripcion || null
    if (body.data.producto_ids !== undefined) cuponData.data.producto_ids = body.data.producto_ids || null
    if (body.data.uso_limite !== undefined) cuponData.data.uso_limite = body.data.uso_limite ? parseInt(body.data.uso_limite) : null
    if (body.data.fecha_caducidad !== undefined) cuponData.data.fecha_caducidad = body.data.fecha_caducidad || null
    // Aceptar tanto originPlatform como origin_platform para compatibilidad
    if (body.data.origin_platform !== undefined) {
      cuponData.data.origin_platform = body.data.origin_platform
    } else if (body.data.originPlatform !== undefined) {
      cuponData.data.origin_platform = body.data.originPlatform
    }

    // Si se actualizó en WooCommerce, actualizar raw_woo_data (usar snake_case para Strapi)
    if (wooCommerceCupon) {
      cuponData.data.raw_woo_data = wooCommerceCupon
      cuponData.data.external_ids = {
        wooCommerce: {
          id: wooCommerceCupon.id,
          code: wooCommerceCupon.code,
        }
      }
    }

    const strapiResponse = await strapiClient.put<any>(strapiEndpoint, cuponData)
    console.log('[API Cupones PUT] ✅ Cupón actualizado en Strapi')

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceCupon,
        strapi: strapiResponse.data || strapiResponse,
      },
      message: 'Cupón actualizado exitosamente' + (wooCommerceCupon ? ' en WooCommerce y Strapi' : ' en Strapi')
    })

  } catch (error: any) {
    console.error('[API Cupones PUT] ❌ ERROR al actualizar cupón:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar el cupón',
      details: error.details
    }, { status: error.status || 500 })
  }
}
