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

    // Crear categoría en WooCommerce primero
    console.log('[API Categorias POST] 🛒 Creando categoría en WooCommerce...')
    
    const wooCommerceCategoryData: any = {
      name: nombreCategoria.trim(),
      description: body.data.descripcion || body.data.description || '',
    }

    // Crear en WooCommerce primero
    const wooCommerceCategory = await wooCommerceClient.post<any>('products/categories', wooCommerceCategoryData)
    console.log('[API Categorias POST] ✅ Categoría creada en WooCommerce:', {
      id: wooCommerceCategory.id,
      name: wooCommerceCategory.name
    })

    // Encontrar el endpoint correcto
    const categoriaEndpoint = await findCategoriaEndpoint()
    console.log('[API Categorias POST] Usando endpoint Strapi:', categoriaEndpoint)

    // Crear en Strapi después
    let strapiCategory = null
    try {
      console.log('[API Categorias POST] 📚 Creando categoría en Strapi...')
      
      // Preparar datos para Strapi (usar nombres del schema real: name, descripcion, imagen)
      const categoriaData: any = {
        data: {
          name: nombreCategoria.trim(), // El schema usa 'name'
          descripcion: body.data.descripcion || body.data.description || null,
          woocommerce_id: wooCommerceCategory.id.toString(), // Guardar ID de WooCommerce
        }
      }

      // Agregar imagen si existe (el schema tiene campo 'imagen' de tipo media)
      if (body.data.imagen) {
        categoriaData.data.imagen = body.data.imagen
      }

      strapiCategory = await strapiClient.post<any>(categoriaEndpoint, categoriaData)
      console.log('[API Categorias POST] ✅ Categoría creada en Strapi:', {
        id: strapiCategory.data?.id || strapiCategory.id,
        documentId: strapiCategory.data?.documentId
      })
    } catch (strapiError: any) {
      console.error('[API Categorias POST] ⚠️ Error al crear categoría en Strapi (no crítico):', strapiError.message)
      // No fallar si Strapi falla, la categoría ya está en WooCommerce
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceCategory,
        strapi: strapiCategory?.data || null,
      },
      message: 'Categoría creada exitosamente en WooCommerce' + (strapiCategory ? ' y Strapi' : ' (Strapi falló)')
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

