import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

export const dynamic = 'force-dynamic'

// Función helper para encontrar el endpoint correcto
async function findCategoriaEndpoint(): Promise<string> {
  const endpoints = ['/api/categorias-producto', '/api/categoria-productos', '/api/categorias']
  
  for (const endpoint of endpoints) {
    try {
      await strapiClient.get<any>(`${endpoint}?pagination[pageSize]=1`)
      return endpoint
    } catch {
      continue
    }
  }
  
  // Si ninguno funciona, usar el primero por defecto
  return endpoints[0]
}

export async function GET(request: NextRequest) {
  try {
    // PROBAR estos nombres en orden hasta encontrar el correcto
    let response: any
    let categoriaEndpoint = '/api/categorias-producto'
    
    try {
      // Intentar primero con /api/categorias-producto
      response = await strapiClient.get<any>(`${categoriaEndpoint}?populate=*&pagination[pageSize]=1000`)
    } catch (error: any) {
      // Si falla, probar con nombre alternativo
      console.log('[API Categorias] Primera URL falló, probando alternativa...')
      try {
        categoriaEndpoint = '/api/categoria-productos'
        response = await strapiClient.get<any>(`${categoriaEndpoint}?populate=*&pagination[pageSize]=1000`)
      } catch (error2: any) {
        // Último intento con categorias
        categoriaEndpoint = '/api/categorias'
        response = await strapiClient.get<any>(`${categoriaEndpoint}?populate=*&pagination[pageSize]=1000`)
      }
    }
    
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
    
    console.log('[API Categorias] ✅ Items obtenidos:', items.length, 'desde:', categoriaEndpoint)
    
    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error: any) {
    console.error('[API Categorias] ❌ Error:', error.message)
    
    // En lugar de devolver error 500, devolver array vacío
    return NextResponse.json({
      success: true,
      data: [],
      warning: `No se pudieron cargar las categorías: ${error.message}`
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API Categorias POST] 📝 Creando categoría:', body)

    // Validar nombre obligatorio (el schema usa 'name')
    if (!body.data?.name && !body.data?.nombre) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la categoría es obligatorio'
      }, { status: 400 })
    }

    const nombreCategoria = body.data.name || body.data.nombre

    // Encontrar el endpoint correcto
    const categoriaEndpoint = await findCategoriaEndpoint()
    console.log('[API Categorias POST] Usando endpoint Strapi:', categoriaEndpoint)

    // Crear en Strapi PRIMERO para obtener el documentId
    console.log('[API Categorias POST] 📚 Creando categoría en Strapi primero...')
    
    // Preparar datos para Strapi (usar nombres del schema real: name, descripcion, imagen)
    const categoriaData: any = {
      data: {
        name: nombreCategoria.trim(), // El schema usa 'name'
        descripcion: body.data.descripcion || body.data.description || null,
      }
    }

    // Agregar imagen si existe (el schema tiene campo 'imagen' de tipo media)
    if (body.data.imagen) {
      categoriaData.data.imagen = body.data.imagen
    }

    const strapiCategory = await strapiClient.post<any>(categoriaEndpoint, categoriaData)
    const documentId = strapiCategory.data?.documentId || strapiCategory.documentId
    
    if (!documentId) {
      throw new Error('No se pudo obtener el documentId de Strapi')
    }
    
    console.log('[API Categorias POST] ✅ Categoría creada en Strapi:', {
      id: strapiCategory.data?.id || strapiCategory.id,
      documentId: documentId
    })

    // Crear categoría en WooCommerce usando el documentId como slug
    console.log('[API Categorias POST] 🛒 Creando categoría en WooCommerce con slug=documentId...')
    
    const wooCommerceCategoryData: any = {
      name: nombreCategoria.trim(),
      description: body.data.descripcion || body.data.description || '',
      slug: documentId.toString(), // Usar documentId como slug para el match
    }

    // Crear en WooCommerce
    let wooCommerceCategory = null
    try {
      wooCommerceCategory = await wooCommerceClient.post<any>('products/categories', wooCommerceCategoryData)
      console.log('[API Categorias POST] ✅ Categoría creada en WooCommerce:', {
        id: wooCommerceCategory.id,
        name: wooCommerceCategory.name,
        slug: wooCommerceCategory.slug
      })

      // Actualizar Strapi con el woocommerce_id
      const updateData = {
        data: {
          woocommerce_id: wooCommerceCategory.id.toString()
        }
      }
      await strapiClient.put<any>(`${categoriaEndpoint}/${documentId}`, updateData)
      console.log('[API Categorias POST] ✅ woocommerce_id guardado en Strapi')
    } catch (wooError: any) {
      // Manejar caso especial: categoría ya existe en WooCommerce
      if (wooError.code === 'term_exists' && wooError.details?.data?.resource_id) {
        const existingCategoryId = wooError.details.data.resource_id
        console.log('[API Categorias POST] 🔄 Categoría ya existe en WooCommerce, obteniendo categoría existente:', existingCategoryId)
        
        try {
          // Obtener la categoría existente de WooCommerce
          wooCommerceCategory = await wooCommerceClient.get<any>(`products/categories/${existingCategoryId}`)
          console.log('[API Categorias POST] ✅ Categoría existente obtenida de WooCommerce:', {
            id: wooCommerceCategory.id,
            name: wooCommerceCategory.name,
            slug: wooCommerceCategory.slug
          })

          // Actualizar Strapi con el woocommerce_id de la categoría existente
          const updateData = {
            data: {
              woocommerce_id: wooCommerceCategory.id.toString()
            }
          }
          await strapiClient.put<any>(`${categoriaEndpoint}/${documentId}`, updateData)
          console.log('[API Categorias POST] ✅ woocommerce_id de categoría existente guardado en Strapi')
        } catch (getError: any) {
          console.error('[API Categorias POST] ❌ Error al obtener categoría existente de WooCommerce:', getError.message)
          // Si falla al obtener la categoría existente, eliminar de Strapi
          try {
            await strapiClient.delete<any>(`${categoriaEndpoint}/${documentId}`)
            console.log('[API Categorias POST] 🗑️ Categoría eliminada de Strapi debido a error al obtener categoría existente')
          } catch (deleteError: any) {
            console.error('[API Categorias POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
          }
          throw getError
        }
      } else {
        // Para otros errores, eliminar de Strapi para mantener consistencia
        console.error('[API Categorias POST] ⚠️ Error al crear categoría en WooCommerce (no crítico):', wooError.message)
        try {
          await strapiClient.delete<any>(`${categoriaEndpoint}/${documentId}`)
          console.log('[API Categorias POST] 🗑️ Categoría eliminada de Strapi debido a error en WooCommerce')
        } catch (deleteError: any) {
          console.error('[API Categorias POST] ⚠️ Error al eliminar de Strapi:', deleteError.message)
        }
        throw wooError
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceCategory,
        strapi: strapiCategory.data || strapiCategory,
      },
      message: 'Categoría creada exitosamente en Strapi y WooCommerce'
    })

  } catch (error: any) {
    console.error('[API Categorias POST] ❌ ERROR al crear categoría:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear la categoría',
      details: error.details
    }, { status: error.status || 500 })
  }
}

