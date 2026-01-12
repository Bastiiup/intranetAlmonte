/**
 * API Route para gestionar clientes de WooCommerce
 * 
 * Endpoints:
 * - GET: Buscar clientes
 * - POST: Crear cliente rápido
 */

import { NextRequest, NextResponse } from 'next/server'
import wooCommerceClient, { createWooCommerceClient } from '@/lib/woocommerce/client'
import { buildWooCommerceAddress, createAddressMetaData, type DetailedAddress } from '@/lib/woocommerce/address-utils'
import { enviarClienteABothWordPress } from '@/lib/clientes/utils'
import { getServerPlatform } from '@/lib/platform/server'
import { getWooCommercePlatformParam } from '@/lib/platform/filters'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Obtener plataforma del colaborador
    const userPlatform = await getServerPlatform()
    const platformParam = getWooCommercePlatformParam(userPlatform)
    
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const perPage = parseInt(searchParams.get('per_page') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    
    // Si el colaborador tiene plataforma específica, usar ese cliente de WooCommerce
    // Si es 'general', usar el cliente por defecto (que puede ser moraleja)
    const wooClient = platformParam 
      ? createWooCommerceClient(platformParam === 'escolar' ? 'woo_escolar' : 'woo_moraleja')
      : wooCommerceClient

    const params: Record<string, any> = {
      per_page: perPage,
      page: page,
    }

    if (search) {
      params.search = search
    }
    
    console.log('[API /woocommerce/customers GET] Obteniendo clientes', {
      platform: userPlatform,
      platformParam,
      filtered: !!platformParam,
    })

    const customers = await wooClient.get<any[]>('customers', params)

    return NextResponse.json({
      success: true,
      data: customers,
    })
  } catch (error: any) {
    console.error('Error al obtener clientes de WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener clientes',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar campos requeridos
    if (!body.email || !body.first_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email y nombre son requeridos',
        },
        { status: 400 }
      )
    }

    // Preparar datos de billing si vienen direcciones detalladas
    let billingData: any = {}
    let shippingData: any = {}
    let metaData: Array<{ key: string; value: string }> = []

    if (body.billing) {
      // Si viene con campos detallados, construir address_1 y address_2
      const billingDetailed: DetailedAddress = {
        calle: body.billing.calle || '',
        numero: body.billing.numero || '',
        dpto: body.billing.dpto || '',
        block: body.billing.block || '',
        condominio: body.billing.condominio || '',
        city: body.billing.city || '',
        state: body.billing.state || '',
        postcode: body.billing.postcode || '',
        country: body.billing.country || 'CL',
      }

      const billingWooCommerce = buildWooCommerceAddress(billingDetailed)
      metaData.push(...createAddressMetaData('billing', billingDetailed))

      billingData = {
        first_name: body.first_name,
        last_name: body.last_name || '',
        email: body.email,
        phone: body.billing.phone || body.phone || '',
        company: body.billing.company || body.company || '',
        address_1: billingWooCommerce.address_1,
        address_2: billingWooCommerce.address_2,
        city: billingDetailed.city || '',
        state: billingDetailed.state || '',
        postcode: billingDetailed.postcode || '',
        country: billingDetailed.country || 'CL',
      }
    } else if (body.phone) {
      billingData = { phone: body.phone }
    }

    if (body.shipping) {
      const shippingDetailed: DetailedAddress = {
        calle: body.shipping.calle || '',
        numero: body.shipping.numero || '',
        dpto: body.shipping.dpto || '',
        block: body.shipping.block || '',
        condominio: body.shipping.condominio || '',
        city: body.shipping.city || '',
        state: body.shipping.state || '',
        postcode: body.shipping.postcode || '',
        country: body.shipping.country || 'CL',
      }

      const shippingWooCommerce = buildWooCommerceAddress(shippingDetailed)
      metaData.push(...createAddressMetaData('shipping', shippingDetailed))

      shippingData = {
        first_name: body.first_name,
        last_name: body.last_name || '',
        address_1: shippingWooCommerce.address_1,
        address_2: shippingWooCommerce.address_2,
        city: shippingDetailed.city || '',
        state: shippingDetailed.state || '',
        postcode: shippingDetailed.postcode || '',
        country: shippingDetailed.country || 'CL',
      }
    }

    // Crear cliente en WordPress (ambos)
    let wordPressResults: any = null
    let customer: any = null
    try {
      console.log('[API POST] 🛒 Creando cliente en WordPress...')
      
      // Preparar datos para WordPress
      const customerData: any = {
        email: body.email,
        first_name: body.first_name,
        last_name: body.last_name || '',
        username: body.email.split('@')[0] + '_' + Date.now(),
        password: body.password || `temp_${Date.now()}`,
        ...(Object.keys(billingData).length > 0 && { billing: billingData }),
        ...(Object.keys(shippingData).length > 0 && { shipping: shippingData }),
        ...(metaData.length > 0 && { meta_data: metaData }),
      }

      // Enviar a ambos WordPress
      console.log('[API POST] 🚀 Iniciando envío a ambos WordPress...')
      wordPressResults = await enviarClienteABothWordPress({
        email: body.email.trim(),
        first_name: body.first_name.trim(),
        last_name: body.last_name?.trim() || '',
      })
      
      // Log detallado de resultados
      console.log('[API POST] 📊 Resultados de WordPress:', {
        escolar: {
          success: wordPressResults.escolar.success,
          created: wordPressResults.escolar.created,
          error: wordPressResults.escolar.error,
          hasData: !!wordPressResults.escolar.data,
        },
        moraleja: {
          success: wordPressResults.moraleja.success,
          created: wordPressResults.moraleja.created,
          error: wordPressResults.moraleja.error,
          hasData: !!wordPressResults.moraleja.data,
        },
      })
      
      // Obtener el cliente creado del primer WordPress exitoso
      if (wordPressResults.escolar.success && wordPressResults.escolar.data) {
        customer = wordPressResults.escolar.data
        console.log('[API POST] ✅ Usando cliente de Librería Escolar:', customer.id)
      } else if (wordPressResults.moraleja.success && wordPressResults.moraleja.data) {
        customer = wordPressResults.moraleja.data
        console.log('[API POST] ✅ Usando cliente de Editorial Moraleja:', customer.id)
      } else {
        // Si ambos fallaron, intentar crear en el WordPress principal como fallback
        console.log('[API POST] ⚠️ Ambos WordPress fallaron, intentando WordPress principal como fallback...')
        try {
          customer = await wooCommerceClient.post<any>('customers', customerData)
          console.log('[API POST] ✅ Cliente creado en WordPress principal (fallback):', {
            id: customer.id,
            email: customer.email
          })
        } catch (wpError: any) {
          console.error('[API POST] ❌ Error al crear en WordPress principal (fallback):', wpError.message)
        }
      }
      
      // Validar que al menos uno haya funcionado
      if (!wordPressResults.escolar.success && !wordPressResults.moraleja.success) {
        console.error('[API POST] ⚠️ ADVERTENCIA: No se pudo crear el cliente en ninguno de los WordPress')
        console.error('[API POST] Error Escolar:', wordPressResults.escolar.error)
        console.error('[API POST] Error Moraleja:', wordPressResults.moraleja.error)
      } else {
        console.log('[API POST] ✅ Cliente procesado en WordPress:', {
          escolar: wordPressResults.escolar.success ? '✅' : '❌',
          moraleja: wordPressResults.moraleja.success ? '✅' : '❌',
        })
      }
    } catch (wpError: any) {
      console.error('[API POST] ⚠️ Error al enviar a WordPress (no crítico):', wpError.message)
      // Continuar aunque falle WordPress
    }

    // Nota: Strapi se actualizará automáticamente desde WordPress, no es necesario hacerlo manualmente aquí

    // Construir mensaje de respuesta
    const partesMensaje: string[] = []
    if (wordPressResults?.escolar?.success || wordPressResults?.moraleja?.success) {
      partesMensaje.push('WordPress')
    }
    
    const mensaje = partesMensaje.length > 0 
      ? `Cliente creado exitosamente en: ${partesMensaje.join(', ')}`
      : 'Error al crear cliente en WordPress'
    
    console.log('[API POST] 📋 Resumen final:', {
      wordpress: (wordPressResults?.escolar?.success || wordPressResults?.moraleja?.success) ? '✅' : '❌',
    })

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: customer || null,
        wordpress: wordPressResults || null,
      },
      message: mensaje
    })
  } catch (error: any) {
    console.error('Error al crear cliente en WooCommerce:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear cliente',
        status: error.status || 500,
        details: error.details,
      },
      { status: error.status || 500 }
    )
  }
}

