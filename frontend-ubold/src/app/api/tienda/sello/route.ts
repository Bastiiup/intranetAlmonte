import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_sello" en WooCommerce
async function getSelloAttributeId(): Promise<number | null> {
  try {
    // Buscar atributo por slug "pa_sello" o "sello"
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_sello' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
    // Si no se encuentra por slug, buscar por nombre
    const allAttributes = await wooCommerceClient.get<any[]>('products/attributes')
    const selloAttribute = allAttributes.find((attr: any) => 
      attr.slug === 'pa_sello' || 
      attr.slug === 'sello' ||
      attr.name?.toLowerCase().includes('sello')
    )
    
    if (selloAttribute) {
      return selloAttribute.id
    }
    
    console.warn('[API Sello] ⚠️ No se encontró el atributo "pa_sello" en WooCommerce')
    return null
  } catch (error: any) {
    console.error('[API Sello] ❌ Error al obtener ID del atributo:', error.message)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/sellos?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET sello] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET sello] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar los sellos: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Sello POST] 📝 Creando sello:', body)

    // Validar campos obligatorios según schema de Strapi
    if (!body.data?.id_sello && body.data?.id_sello !== 0) {
      return NextResponse.json({
        success: false,
        error: 'El ID del sello es obligatorio'
      }, { status: 400 })
    }

    if (!body.data?.nombre_sello && !body.data?.nombreSello && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre del sello es obligatorio'
      }, { status: 400 })
    }

    const idSello = body.data.id_sello || body.data.idSello
    const nombreSello = body.data.nombre_sello || body.data.nombreSello || body.data.nombre
    const selloEndpoint = '/api/sellos'
    console.log('[API Sello POST] Usando endpoint Strapi:', selloEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    // El documentId se usará como slug en WooCommerce para hacer el match
    console.log('[API Sello POST] 📚 Creando sello en Strapi primero...')
    
    // El schema de Strapi para sello usa: id_sello* (Number), nombre_sello* (Text), acronimo, logo, website, editorial, colecciones, libros
    const selloData: any = {
      data: {
        id_sello: typeof idSello === 'string' ? parseInt(idSello) : idSello,
        nombre_sello: nombreSello.trim(),
        acronimo: body.data.acronimo || body.data.acronimo || null,
        website: body.data.website || body.data.website || null,
        editorial: body.data.editorial || null,
      }
    }

    const strapiSello = await strapiClient.post<any>(selloEndpoint, selloData)
    const documentId = strapiSello.data?.documentId || strapiSello.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API Sello POST] ✅ Sello creado en Strapi:', {
      id: strapiSello.data?.id || strapiSello.id,
      documentId: documentId
    })

    // Obtener el ID del atributo "pa_sello" en WooCommerce
    const attributeId = await getSelloAttributeId()
    
    if (!attributeId) {
      console.warn('[API Sello POST] ⚠️ No se pudo obtener el ID del atributo, eliminando de Strapi')
      try {
        await strapiClient.delete<any>(`${selloEndpoint}/${documentId}`)
      } catch (deleteError: any) {
        console.error('[API Sello POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
      }
      return NextResponse.json({
        success: false,
        error: 'No se encontró el atributo "pa_sello" en WooCommerce. Verifica que el atributo esté configurado.'
      }, { status: 400 })
    }

    // Crear término del atributo en WooCommerce usando el documentId como slug
    // IMPORTANTE: Siempre usar documentId como slug para poder hacer match después
    console.log('[API Sello POST] 🛒 Creando término en WooCommerce con slug=documentId...')
    
    const wooCommerceTermData: any = {
      name: nombreSello.trim(),
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
      
      console.log('[API Sello POST] ✅ Término creado en WooCommerce:', {
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
      console.log('[API Sello POST] ✅ Término creado en WooCommerce, match por documentId:', documentId)
    } catch (wooError: any) {
      // Manejar caso especial: término ya existe en WooCommerce
      if (wooError.code === 'term_exists' && wooError.details?.data?.resource_id) {
        const existingTermId = wooError.details.data.resource_id
        console.log('[API Sello POST] 🔄 Término ya existe en WooCommerce, obteniendo término existente:', existingTermId)
        
        try {
          // Obtener el término existente de WooCommerce
          wooCommerceTerm = await wooCommerceClient.get<any>(`products/attributes/${attributeId}/terms/${existingTermId}`)
          console.log('[API Sello POST] ✅ Término existente obtenido de WooCommerce:', {
            id: wooCommerceTerm.id,
            name: wooCommerceTerm.name,
            slug: wooCommerceTerm.slug
          })

          // No guardamos woocommerce_id en Strapi porque no existe en el schema
          // El match se hace usando documentId como slug en WooCommerce
          console.log('[API Sello POST] ✅ Término existente encontrado en WooCommerce, match por documentId:', documentId)
        } catch (getError: any) {
          console.error('[API Sello POST] ❌ Error al obtener término existente de WooCommerce:', getError.message)
          // Si falla al obtener el término existente, eliminar de Strapi
          try {
            await strapiClient.delete<any>(`${selloEndpoint}/${documentId}`)
            console.log('[API Sello POST] 🗑️ Sello eliminado de Strapi debido a error al obtener término existente')
          } catch (deleteError: any) {
            console.error('[API Sello POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
          }
          throw getError
        }
      } else {
        // Para otros errores, eliminar de Strapi para mantener consistencia
        console.error('[API Sello POST] ⚠️ Error al crear término en WooCommerce:', wooError.message)
        try {
          await strapiClient.delete<any>(`${selloEndpoint}/${documentId}`)
          console.log('[API Sello POST] 🗑️ Sello eliminado de Strapi debido a error en WooCommerce')
        } catch (deleteError: any) {
          console.error('[API Sello POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
        }
        throw wooError
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceTerm,
        strapi: strapiSello.data || strapiSello,
      },
      message: 'Sello creado exitosamente en Strapi y WooCommerce'
    })

  } catch (error: any) {
    console.error('[API Sello POST] ❌ ERROR al crear sello:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el sello',
      details: error.details
    }, { status: error.status || 500 })
  }
}

