import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/etiquetas?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET etiquetas] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET etiquetas] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las etiquetas: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Etiquetas POST] 📝 Creando etiqueta:', body)

    // Validar nombre obligatorio (el schema usa 'name')
    if (!body.data?.name && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la etiqueta es obligatorio'
      }, { status: 400 })
    }

    const nombreEtiqueta = body.data.name || body.data.nombre

    // Crear etiqueta en WooCommerce primero
    console.log('[API Etiquetas POST] 🛒 Creando etiqueta en WooCommerce...')
    
    const wooCommerceTagData: any = {
      name: nombreEtiqueta.trim(),
      description: body.data.descripcion || body.data.description || '',
    }

    // Crear en WooCommerce primero
    const wooCommerceTag = await wooCommerceClient.post<any>('products/tags', wooCommerceTagData)
    console.log('[API Etiquetas POST] ✅ Etiqueta creada en WooCommerce:', {
      id: wooCommerceTag.id,
      name: wooCommerceTag.name
    })

    const etiquetaEndpoint = '/api/etiquetas'
    console.log('[API Etiquetas POST] Usando endpoint Strapi:', etiquetaEndpoint)

    // Crear en Strapi después
    let strapiTag = null
    try {
      console.log('[API Etiquetas POST] 📚 Creando etiqueta en Strapi...')
      
      // Preparar datos para Strapi (usar nombres del schema real: name, descripcion)
      const etiquetaData: any = {
        data: {
          name: nombreEtiqueta.trim(), // El schema usa 'name'
          descripcion: body.data.descripcion || body.data.description || null,
          woocommerce_id: wooCommerceTag.id.toString(), // Guardar ID de WooCommerce
        }
      }

      strapiTag = await strapiClient.post<any>(etiquetaEndpoint, etiquetaData)
      console.log('[API Etiquetas POST] ✅ Etiqueta creada en Strapi:', {
        id: strapiTag.data?.id || strapiTag.id,
        documentId: strapiTag.data?.documentId
      })
    } catch (strapiError: any) {
      console.error('[API Etiquetas POST] ⚠️ Error al crear etiqueta en Strapi (no crítico):', strapiError.message)
      // No fallar si Strapi falla, la etiqueta ya está en WooCommerce
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceTag,
        strapi: strapiTag?.data || null,
      },
      message: 'Etiqueta creada exitosamente en WooCommerce' + (strapiTag ? ' y Strapi' : ' (Strapi falló)')
    })

  } catch (error: any) {
    console.error('[API Etiquetas POST] ❌ ERROR al crear etiqueta:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la etiqueta',
      details: error.details
    }, { status: error.status || 500 })
  }
}

