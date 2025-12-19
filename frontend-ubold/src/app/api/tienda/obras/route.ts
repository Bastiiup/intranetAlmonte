import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_obra" en WooCommerce
async function getObraAttributeId(): Promise<number | null> {
  try {
    // Buscar atributo por slug "pa_obra" o "obra"
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_obra' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
    // Si no se encuentra por slug, buscar por nombre
    const allAttributes = await wooCommerceClient.get<any[]>('products/attributes')
    const obraAttribute = allAttributes.find((attr: any) => 
      attr.slug === 'pa_obra' || 
      attr.slug === 'obra' ||
      attr.name?.toLowerCase() === 'obra'
    )
    
    if (obraAttribute) {
      return obraAttribute.id
    }
    
    console.warn('[API Obras] ⚠️ No se encontró el atributo "pa_obra" en WooCommerce')
    return null
  } catch (error: any) {
    console.error('[API Obras] ❌ Error al obtener ID del atributo:', error.message)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/obras?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET obras] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET obras] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las obras: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Obras POST] 📝 Creando obra:', body)

    // Validar campos obligatorios según schema de Strapi
    if (!body.data?.codigo_obra && !body.data?.codigoObra) {
      return NextResponse.json({
        success: false,
        error: 'El código de la obra es obligatorio'
      }, { status: 400 })
    }

    if (!body.data?.nombre_obra && !body.data?.nombreObra && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la obra es obligatorio'
      }, { status: 400 })
    }

    const codigoObra = body.data.codigo_obra || body.data.codigoObra
    const nombreObra = body.data.nombre_obra || body.data.nombreObra || body.data.nombre
    const obraEndpoint = '/api/obras'
    console.log('[API Obras POST] Usando endpoint Strapi:', obraEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    // El documentId se usará como slug en WooCommerce para hacer el match
    console.log('[API Obras POST] 📚 Creando obra en Strapi primero...')
    
    // El schema de Strapi para obras usa: codigo_obra*, nombre_obra*, descripcion
    const obraData: any = {
      data: {
        codigo_obra: codigoObra.trim(),
        nombre_obra: nombreObra.trim(),
        descripcion: body.data.descripcion || body.data.description || null,
      }
    }

    const strapiObra = await strapiClient.post<any>(obraEndpoint, obraData)
    const documentId = strapiObra.data?.documentId || strapiObra.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API Obras POST] ✅ Obra creada en Strapi:', {
      id: strapiObra.data?.id || strapiObra.id,
      documentId: documentId
    })

    // Obtener el ID del atributo "pa_obra" en WooCommerce
    const attributeId = await getObraAttributeId()
    
    if (!attributeId) {
      console.warn('[API Obras POST] ⚠️ No se pudo obtener el ID del atributo, eliminando de Strapi')
      try {
        await strapiClient.delete<any>(`${obraEndpoint}/${documentId}`)
      } catch (deleteError: any) {
        console.error('[API Obras POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
      }
      return NextResponse.json({
        success: false,
        error: 'No se encontró el atributo "pa_obra" en WooCommerce. Verifica que el atributo esté configurado.'
      }, { status: 400 })
    }

    // Crear término del atributo en WooCommerce usando el documentId como slug
    // IMPORTANTE: Siempre usar documentId como slug para poder hacer match después
    console.log('[API Obras POST] 🛒 Creando término en WooCommerce con slug=documentId...')
    
    const wooCommerceTermData: any = {
      name: nombreObra.trim(), // Usar nombre_obra para WooCommerce
      description: body.data.descripcion || body.data.description || '',
      slug: documentId.toString(), // SIEMPRE usar documentId como slug para el match
    }

    // Crear término en WooCommerce
    let wooCommerceTerm = null
    try {
      const wooResponse = await wooCommerceClient.post<any>(
        `products/attributes/${attributeId}/terms`,
        wooCommerceTermData
      )
      
      // La respuesta puede venir directamente o dentro de .data
      wooCommerceTerm = wooResponse?.data || wooResponse
      
      console.log('[API Obras POST] ✅ Término creado en WooCommerce:', {
        id: wooCommerceTerm?.id,
        name: wooCommerceTerm?.name,
        slug: wooCommerceTerm?.slug,
        response: wooResponse
      })

      if (!wooCommerceTerm || !wooCommerceTerm.id) {
        throw new Error('La respuesta de WooCommerce no contiene un término válido')
      }

      // No guardamos woocommerce_id en Strapi porque no existe en el schema
      // El match se hace usando documentId como slug en WooCommerce
      console.log('[API Obras POST] ✅ Término creado en WooCommerce, match por documentId:', documentId)
    } catch (wooError: any) {
      // Manejar caso especial: término ya existe en WooCommerce
      if (wooError.code === 'term_exists' && wooError.details?.data?.resource_id) {
        const existingTermId = wooError.details.data.resource_id
        console.log('[API Obras POST] 🔄 Término ya existe en WooCommerce, obteniendo término existente:', existingTermId)
        
        try {
          // Obtener el término existente de WooCommerce
          wooCommerceTerm = await wooCommerceClient.get<any>(`products/attributes/${attributeId}/terms/${existingTermId}`)
          console.log('[API Obras POST] ✅ Término existente obtenido de WooCommerce:', {
            id: wooCommerceTerm.id,
            name: wooCommerceTerm.name,
            slug: wooCommerceTerm.slug
          })

          // No guardamos woocommerce_id en Strapi porque no existe en el schema
          // El match se hace usando documentId como slug en WooCommerce
          console.log('[API Obras POST] ✅ Término existente encontrado en WooCommerce, match por documentId:', documentId)
        } catch (getError: any) {
          console.error('[API Obras POST] ❌ Error al obtener término existente de WooCommerce:', getError.message)
          // Si falla al obtener el término existente, eliminar de Strapi
          try {
            await strapiClient.delete<any>(`${obraEndpoint}/${documentId}`)
            console.log('[API Obras POST] 🗑️ Obra eliminada de Strapi debido a error al obtener término existente')
          } catch (deleteError: any) {
            console.error('[API Obras POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
          }
          throw getError
        }
      } else {
        // Para otros errores, eliminar de Strapi para mantener consistencia
        console.error('[API Obras POST] ⚠️ Error al crear término en WooCommerce (no crítico):', wooError.message)
        try {
          await strapiClient.delete<any>(`${obraEndpoint}/${documentId}`)
          console.log('[API Obras POST] 🗑️ Obra eliminada de Strapi debido a error en WooCommerce')
        } catch (deleteError: any) {
          console.error('[API Obras POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
        }
        throw wooError
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceTerm,
        strapi: strapiObra.data || strapiObra,
      },
      message: 'Obra creada exitosamente en Strapi y WooCommerce'
    })

  } catch (error: any) {
    console.error('[API Obras POST] ❌ ERROR al crear obra:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la obra',
      details: error.details
    }, { status: error.status || 500 })
  }
}

