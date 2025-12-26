import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient, { WooCommerceTag } from '@/lib/woocommerce/client'

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

    // Validar nombre obligatorio
    if (!body.data?.name && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la etiqueta es obligatorio'
      }, { status: 400 })
    }

    const nombre = body.data.name || body.data.nombre
    const etiquetaEndpoint = '/api/etiquetas'
    console.log('[API Etiquetas POST] Usando endpoint Strapi:', etiquetaEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    console.log('[API Etiquetas POST] 📚 Creando etiqueta en Strapi primero...')
    
    const etiquetaData: any = {
      data: {
        name: nombre.trim(),
        descripcion: body.data.descripcion || null,
      }
    }

    const strapiTag = await strapiClient.post<any>(etiquetaEndpoint, etiquetaData)
    const documentId = strapiTag.data?.documentId || strapiTag.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener documentId de Strapi')
    }

    console.log('[API Etiquetas POST] ✅ Etiqueta creada en Strapi con documentId:', documentId)

    // Crear en WooCommerce con slug=documentId
    console.log('[API Etiquetas POST] 🛒 Creando etiqueta en WooCommerce...')
    try {
      const wooCommerceTag = await wooCommerceClient.post<WooCommerceTag>('products/tags', {
        name: nombre.trim(),
        slug: documentId, // Usar documentId como slug
      })

      const wooCommerceId = String(wooCommerceTag?.id || '')
      if (!wooCommerceId || wooCommerceId === '') {
        throw new Error('No se pudo obtener el ID de WooCommerce')
      }
      console.log('[API Etiquetas POST] ✅ Etiqueta creada en WooCommerce con ID:', wooCommerceId)

      // Actualizar Strapi con woocommerce_id
      const updateEndpoint = `${etiquetaEndpoint}/${documentId}`
      await strapiClient.put(updateEndpoint, {
        data: {
          woocommerce_id: wooCommerceId
        }
      })

      console.log('[API Etiquetas POST] ✅ Strapi actualizado con woocommerce_id:', wooCommerceId)

      return NextResponse.json({
        success: true,
        data: {
          strapi: strapiTag.data || strapiTag,
          woocommerce: wooCommerceTag,
        },
        message: 'Etiqueta creada exitosamente en Strapi y WooCommerce'
      })
    } catch (wooError: any) {
      console.error('[API Etiquetas POST] ❌ Error al crear en WooCommerce:', wooError.message)
      
      // Eliminar de Strapi si falla WooCommerce
      try {
        const deleteEndpoint = `${etiquetaEndpoint}/${documentId}`
        await strapiClient.delete(deleteEndpoint)
        console.log('[API Etiquetas POST] 🗑️ Etiqueta eliminada de Strapi debido a error en WooCommerce')
      } catch (deleteError: any) {
        console.error('[API Etiquetas POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
      }

      return NextResponse.json({
        success: false,
        error: `Error al crear en WooCommerce: ${wooError.message}`,
        details: 'La etiqueta fue eliminada de Strapi debido al error'
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[API Etiquetas POST] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la etiqueta'
    }, { status: error.status || 500 })
  }
}

