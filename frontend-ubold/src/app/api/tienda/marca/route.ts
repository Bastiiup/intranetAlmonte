import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para obtener el ID del atributo "pa_marca" en WooCommerce
async function getMarcaAttributeId(): Promise<number | null> {
  try {
    // Buscar atributo por slug "pa_marca" o "marca"
    const attributes = await wooCommerceClient.get<any[]>('products/attributes', { slug: 'pa_marca' })
    
    if (attributes && attributes.length > 0) {
      return attributes[0].id
    }
    
    // Si no se encuentra por slug, buscar por nombre
    const allAttributes = await wooCommerceClient.get<any[]>('products/attributes')
    const marcaAttribute = allAttributes.find((attr: any) => 
      attr.slug === 'pa_marca' || 
      attr.slug === 'marca' ||
      attr.name?.toLowerCase().includes('marca')
    )
    
    if (marcaAttribute) {
      return marcaAttribute.id
    }
    
    console.warn('[API Marca] ⚠️ No se encontró el atributo "pa_marca" en WooCommerce')
    return null
  } catch (error: any) {
    console.error('[API Marca] ❌ Error al obtener ID del atributo:', error.message)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const response = await strapiClient.get<any>('/api/marcas?populate=*&pagination[pageSize]=1000')
    
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
    
    console.log('[API GET marca] ✅ Items obtenidos:', items.length)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API GET marca] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las marcas: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Marca POST] 📝 Creando marca:', body)

    // Validar campos obligatorios según schema de Strapi
    // Schema real: name* (Text), descripcion, imagen, marca_padre, marcas_hijas, externalIds
    if (!body.data?.name && !body.data?.nombre_marca && !body.data?.nombreMarca && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la marca es obligatorio'
      }, { status: 400 })
    }

    const nombreMarca = body.data.name || body.data.nombre_marca || body.data.nombreMarca || body.data.nombre
    const marcaEndpoint = '/api/marcas'
    console.log('[API Marca POST] Usando endpoint Strapi:', marcaEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    // El documentId se usará como slug en WooCommerce para hacer el match
    console.log('[API Marca POST] 📚 Creando marca en Strapi primero...')
    
    // El schema de Strapi para marca usa: name* (Text), descripcion, imagen, marca_padre, marcas_hijas, externalIds
    const marcaData: any = {
      data: {
        name: nombreMarca.trim(),
        descripcion: body.data.descripcion || null,
      }
    }

    // Manejar marca_padre (manyToOne relation)
    if (body.data.marca_padre) {
      marcaData.data.marca_padre = body.data.marca_padre
    }

    // Manejar marcas_hijas (oneToMany relation)
    if (body.data.marcas_hijas && body.data.marcas_hijas.length > 0) {
      marcaData.data.marcas_hijas = body.data.marcas_hijas
    }

    // Manejar imagen (Media)
    if (body.data.imagen) {
      marcaData.data.imagen = body.data.imagen
    }

    const strapiMarca = await strapiClient.post<any>(marcaEndpoint, marcaData)
    const documentId = strapiMarca.data?.documentId || strapiMarca.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API Marca POST] ✅ Marca creada en Strapi:', {
      id: strapiMarca.data?.id || strapiMarca.id,
      documentId: documentId
    })

    // Obtener el ID del atributo "pa_marca" en WooCommerce
    const attributeId = await getMarcaAttributeId()
    
    if (!attributeId) {
      console.warn('[API Marca POST] ⚠️ No se pudo obtener el ID del atributo, eliminando de Strapi')
      try {
        await strapiClient.delete<any>(`${marcaEndpoint}/${documentId}`)
      } catch (deleteError: any) {
        console.error('[API Marca POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
      }
      return NextResponse.json({
        success: false,
        error: 'No se encontró el atributo "pa_marca" en WooCommerce. Verifica que el atributo esté configurado.'
      }, { status: 400 })
    }

    // Crear término del atributo en WooCommerce usando el documentId como slug
    // IMPORTANTE: Siempre usar documentId como slug para poder hacer match después
    console.log('[API Marca POST] 🛒 Creando término en WooCommerce con slug=documentId...')
    
    const wooCommerceTermData: any = {
      name: nombreMarca.trim(),
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
      
      console.log('[API Marca POST] ✅ Término creado en WooCommerce:', {
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
      console.log('[API Marca POST] ✅ Término creado en WooCommerce, match por documentId:', documentId)
    } catch (wooError: any) {
      // Manejar caso especial: término ya existe en WooCommerce
      if (wooError.code === 'term_exists' && wooError.details?.data?.resource_id) {
        const existingTermId = wooError.details.data.resource_id
        console.log('[API Marca POST] 🔄 Término ya existe en WooCommerce, obteniendo término existente:', existingTermId)
        
        try {
          // Obtener el término existente de WooCommerce
          wooCommerceTerm = await wooCommerceClient.get<any>(`products/attributes/${attributeId}/terms/${existingTermId}`)
          console.log('[API Marca POST] ✅ Término existente obtenido de WooCommerce:', {
            id: wooCommerceTerm.id,
            name: wooCommerceTerm.name,
            slug: wooCommerceTerm.slug
          })

          // No guardamos woocommerce_id en Strapi porque no existe en el schema
          // El match se hace usando documentId como slug en WooCommerce
          console.log('[API Marca POST] ✅ Término existente encontrado en WooCommerce, match por documentId:', documentId)
        } catch (getError: any) {
          console.error('[API Marca POST] ❌ Error al obtener término existente de WooCommerce:', getError.message)
          // Si falla al obtener el término existente, eliminar de Strapi
          try {
            await strapiClient.delete<any>(`${marcaEndpoint}/${documentId}`)
            console.log('[API Marca POST] 🗑️ Marca eliminada de Strapi debido a error al obtener término existente')
          } catch (deleteError: any) {
            console.error('[API Marca POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
          }
          throw getError
        }
      } else {
        // Para otros errores, eliminar de Strapi para mantener consistencia
        console.error('[API Marca POST] ⚠️ Error al crear término en WooCommerce:', wooError.message)
        try {
          await strapiClient.delete<any>(`${marcaEndpoint}/${documentId}`)
          console.log('[API Marca POST] 🗑️ Marca eliminada de Strapi debido a error en WooCommerce')
        } catch (deleteError: any) {
          console.error('[API Marca POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
        }
        throw wooError
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceTerm,
        strapi: strapiMarca.data || strapiMarca,
      },
      message: 'Marca creada exitosamente en Strapi y WooCommerce'
    })

  } catch (error: any) {
    console.error('[API Marca POST] ❌ ERROR al crear marca:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la marca',
      details: error.details
    }, { status: error.status || 500 })
  }
}

