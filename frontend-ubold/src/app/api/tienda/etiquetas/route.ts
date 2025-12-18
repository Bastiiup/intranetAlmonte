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

    const etiquetaEndpoint = '/api/etiquetas'
    console.log('[API Etiquetas POST] Usando endpoint Strapi:', etiquetaEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    console.log('[API Etiquetas POST] 📚 Creando etiqueta en Strapi primero...')
    
    // Preparar datos para Strapi (usar nombres del schema real: name, descripcion)
    const etiquetaData: any = {
      data: {
        name: nombreEtiqueta.trim(), // El schema usa 'name'
        descripcion: body.data.descripcion || body.data.description || null,
      }
    }

    const strapiTag = await strapiClient.post<any>(etiquetaEndpoint, etiquetaData)
    const documentId = strapiTag.data?.documentId || strapiTag.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API Etiquetas POST] ✅ Etiqueta creada en Strapi:', {
      id: strapiTag.data?.id || strapiTag.id,
      documentId: documentId
    })

    // Crear etiqueta en WooCommerce usando el documentId como slug
    console.log('[API Etiquetas POST] 🛒 Creando etiqueta en WooCommerce con slug=documentId...')
    
    const wooCommerceTagData: any = {
      name: nombreEtiqueta.trim(),
      description: body.data.descripcion || body.data.description || '',
      slug: documentId.toString(), // Usar documentId como slug para el match
    }

    // Crear en WooCommerce
    let wooCommerceTag = null
    try {
      wooCommerceTag = await wooCommerceClient.post<any>('products/tags', wooCommerceTagData)
      console.log('[API Etiquetas POST] ✅ Etiqueta creada en WooCommerce:', {
        id: wooCommerceTag.id,
        name: wooCommerceTag.name,
        slug: wooCommerceTag.slug
      })

      // Actualizar Strapi con el woocommerce_id
      const updateData = {
        data: {
          woocommerce_id: wooCommerceTag.id.toString()
        }
      }
      await strapiClient.put<any>(`${etiquetaEndpoint}/${documentId}`, updateData)
      console.log('[API Etiquetas POST] ✅ woocommerce_id guardado en Strapi')
    } catch (wooError: any) {
      // Manejar caso especial: etiqueta ya existe en WooCommerce
      if (wooError.code === 'term_exists' && wooError.details?.data?.resource_id) {
        const existingTagId = wooError.details.data.resource_id
        console.log('[API Etiquetas POST] 🔄 Etiqueta ya existe en WooCommerce, obteniendo etiqueta existente:', existingTagId)
        
        try {
          // Obtener la etiqueta existente de WooCommerce
          wooCommerceTag = await wooCommerceClient.get<any>(`products/tags/${existingTagId}`)
          console.log('[API Etiquetas POST] ✅ Etiqueta existente obtenida de WooCommerce:', {
            id: wooCommerceTag.id,
            name: wooCommerceTag.name,
            slug: wooCommerceTag.slug
          })

          // Actualizar Strapi con el woocommerce_id de la etiqueta existente
          const updateData = {
            data: {
              woocommerce_id: wooCommerceTag.id.toString()
            }
          }
          await strapiClient.put<any>(`${etiquetaEndpoint}/${documentId}`, updateData)
          console.log('[API Etiquetas POST] ✅ woocommerce_id de etiqueta existente guardado en Strapi')
        } catch (getError: any) {
          console.error('[API Etiquetas POST] ❌ Error al obtener etiqueta existente de WooCommerce:', getError.message)
          // Si falla al obtener la etiqueta existente, eliminar de Strapi
          try {
            await strapiClient.delete<any>(`${etiquetaEndpoint}/${documentId}`)
            console.log('[API Etiquetas POST] 🗑️ Etiqueta eliminada de Strapi debido a error al obtener etiqueta existente')
          } catch (deleteError: any) {
            console.error('[API Etiquetas POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
          }
          throw getError
        }
      } else {
        // Para otros errores, eliminar de Strapi para mantener consistencia
        console.error('[API Etiquetas POST] ⚠️ Error al crear etiqueta en WooCommerce (no crítico):', wooError.message)
        try {
          await strapiClient.delete<any>(`${etiquetaEndpoint}/${documentId}`)
          console.log('[API Etiquetas POST] 🗑️ Etiqueta eliminada de Strapi debido a error en WooCommerce')
        } catch (deleteError: any) {
          console.error('[API Etiquetas POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
        }
        throw wooError
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceTag,
        strapi: strapiTag.data || strapiTag,
      },
      message: 'Etiqueta creada exitosamente en Strapi y WooCommerce'
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

