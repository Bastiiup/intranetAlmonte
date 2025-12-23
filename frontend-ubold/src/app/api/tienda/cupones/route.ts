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

// Función helper para mapear discount_type de WooCommerce a tipo_cupon de Strapi
function mapTipoCupon(discountType: string): string {
  const mapping: Record<string, string> = {
    'fixed_cart': 'fixed_cart',
    'fixed_product': 'fixed_product',
    'percent': 'percent',
    'percent_product': 'percent_product',
  }
  
  return mapping[discountType] || 'fixed_cart'
}

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/wo-cupones?populate=*&pagination[pageSize]=1000')
    
    let items: any[] = []
    if (Array.isArray(response)) {
      items = response
    } else if (response.data && Array.isArray(response.data)) {
      items = response.data
    } else if (response.data) {
      items = [response.data]
    } else {
      items = [response]
    }
    
    console.log('[API GET cupones] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET cupones] ❌ Error:', error.message)
    
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar los cupones: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Cupones POST] 📝 Creando cupón:', body)

    // Validar campos obligatorios según schema de Strapi
    if (!body.data?.codigo) {
      return NextResponse.json({
        success: false,
        error: 'El código del cupón es obligatorio'
      }, { status: 400 })
    }

    // Validar originPlatform (usar camelCase como en el schema)
    const validPlatforms = ['woo_moraleja', 'woo_escolar', 'otros']
    const originPlatform = body.data.originPlatform || body.data.origin_platform || 'woo_moraleja'
    if (!validPlatforms.includes(originPlatform)) {
      return NextResponse.json({
        success: false,
        error: `origin_platform debe ser uno de: ${validPlatforms.join(', ')}`
      }, { status: 400 })
    }

    const codigo = body.data.codigo.trim()
    const cuponEndpoint = '/api/wo-cupones'
    console.log('[API Cupones POST] Usando endpoint Strapi:', cuponEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    console.log('[API Cupones POST] 📚 Creando cupón en Strapi primero...')
    
    // Crear cupón en Strapi con todos los campos del schema (usar camelCase)
    const cuponData: any = {
      data: {
        codigo: codigo,
        tipo_cupon: body.data.tipo_cupon || null,
        importe_cupon: body.data.importe_cupon ? parseFloat(body.data.importe_cupon) : null,
        descripcion: body.data.descripcion || null,
        producto_ids: body.data.producto_ids && Array.isArray(body.data.producto_ids) && body.data.producto_ids.length > 0 
          ? body.data.producto_ids.map((id: any) => parseInt(String(id))).filter((id: number) => !isNaN(id))
          : null,
        uso_limite: body.data.uso_limite ? parseInt(body.data.uso_limite) : null,
        fecha_caducidad: body.data.fecha_caducidad || null,
        originPlatform: originPlatform, // Enumeration en Strapi
      }
    }

    const strapiCupon = await strapiClient.post<any>(cuponEndpoint, cuponData)
    const documentId = strapiCupon.data?.documentId || strapiCupon.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API Cupones POST] ✅ Cupón creado en Strapi:', {
      id: strapiCupon.data?.id || strapiCupon.id,
      documentId: documentId
    })

    // Crear cupón en WooCommerce
    const wcClient = getWooCommerceClientForPlatform(originPlatform)
    console.log('[API Cupones POST] 🛒 Creando cupón en WooCommerce...')
    
    const wooCommerceCuponData: any = {
      code: codigo,
      discount_type: mapDiscountType(body.data.tipo_cupon),
      amount: body.data.importe_cupon ? String(body.data.importe_cupon) : '0',
      description: body.data.descripcion || '',
      usage_limit: body.data.uso_limite ? parseInt(String(body.data.uso_limite)) : null,
      expiry_date: body.data.fecha_caducidad || null,
      individual_use: false,
      exclude_sale_items: false,
      free_shipping: false,
    }

    // Si hay producto_ids, agregar product_ids (convertir a números enteros)
    // Solo agregar si hay productos válidos y el tipo de cupón requiere productos
    const requiresProducts = body.data.tipo_cupon === 'fixed_product' || body.data.tipo_cupon === 'percent_product'
    if (body.data.producto_ids && Array.isArray(body.data.producto_ids) && body.data.producto_ids.length > 0) {
      const productIds = body.data.producto_ids
        .map((id: any) => {
          const numId = parseInt(String(id))
          return isNaN(numId) ? null : numId
        })
        .filter((id: number | null) => id !== null) as number[]
      
      // Solo agregar si hay IDs válidos
      if (productIds.length > 0) {
        wooCommerceCuponData.product_ids = productIds
      } else if (requiresProducts) {
        // Si el tipo requiere productos pero no hay IDs válidos, usar array vacío
        wooCommerceCuponData.product_ids = []
      }
    } else if (requiresProducts) {
      // Si el tipo requiere productos pero no se proporcionaron, usar array vacío
      wooCommerceCuponData.product_ids = []
    }

    // Crear cupón en WooCommerce
    let wooCommerceCupon = null
    try {
      const wooResponse = await wcClient.post<any>('coupons', wooCommerceCuponData)
      
      wooCommerceCupon = wooResponse?.data || wooResponse
      
      console.log('[API Cupones POST] ✅ Cupón creado en WooCommerce:', {
        id: wooCommerceCupon?.id,
        code: wooCommerceCupon?.code,
      })

      if (!wooCommerceCupon || !wooCommerceCupon.id) {
        throw new Error('La respuesta de WooCommerce no contiene un cupón válido')
      }

      // Actualizar Strapi con el wooId y rawWooData (usar camelCase como en el schema)
      const updateData: any = {
        data: {
          wooId: wooCommerceCupon.id,
          rawWooData: wooCommerceCupon,
          externalIds: {
            wooCommerce: {
              id: wooCommerceCupon.id,
              code: wooCommerceCupon.code,
            },
            originPlatform: originPlatform,
          }
        }
      }

      await strapiClient.put<any>(`${cuponEndpoint}/${documentId}`, updateData)
      console.log('[API Cupones POST] ✅ Strapi actualizado con datos de WooCommerce')
    } catch (wooError: any) {
      console.error('[API Cupones POST] ⚠️ Error al crear cupón en WooCommerce:', wooError.message)
      
      // Si falla WooCommerce, eliminar de Strapi para mantener consistencia
      try {
        const deleteResponse = await strapiClient.delete<any>(`${cuponEndpoint}/${documentId}`)
        console.log('[API Cupones POST] 🗑️ Cupón eliminado de Strapi debido a error en WooCommerce')
      } catch (deleteError: any) {
        // Ignorar errores de eliminación si la respuesta no es JSON válido (puede ser 204 No Content)
        if (deleteError.message && !deleteError.message.includes('JSON')) {
          console.error('[API Cupones POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
        } else {
          console.log('[API Cupones POST] 🗑️ Cupón eliminado de Strapi (respuesta no JSON, probablemente exitosa)')
        }
      }
      
      throw new Error(`Error al crear cupón en WooCommerce: ${wooError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceCupon,
        strapi: strapiCupon.data || strapiCupon,
      },
      message: 'Cupón creado exitosamente en Strapi y WooCommerce'
    })

  } catch (error: any) {
    console.error('[API Cupones POST] ❌ ERROR al crear cupón:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el cupón',
      details: error.details
    }, { status: error.status || 500 })
  }
}
