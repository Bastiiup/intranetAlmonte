import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

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

    // Validar nombre obligatorio
    if (!body.data?.nombre && !body.data?.name) {
      return NextResponse.json({
        success: false,
        error: 'El nombre de la categoría es obligatorio'
      }, { status: 400 })
    }

    // Encontrar el endpoint correcto
    const categoriaEndpoint = await findCategoriaEndpoint()
    console.log('[API Categorias POST] Usando endpoint:', categoriaEndpoint)

    // Preparar datos para Strapi
    const categoriaData: any = {
      data: {
        nombre: body.data.nombre || body.data.name,
        slug: body.data.slug || null,
        descripcion: body.data.descripcion || body.data.description || null,
        activo: body.data.activo !== undefined ? body.data.activo : (body.data.isActive !== undefined ? body.data.isActive : true),
      }
    }

    // Agregar imagen si existe
    if (body.data.imagen) {
      categoriaData.data.imagen = body.data.imagen
    }

    // Crear en Strapi
    const response = await strapiClient.post<any>(categoriaEndpoint, categoriaData)

    console.log('[API Categorias POST] ✅ Categoría creada exitosamente:', {
      id: response.data?.id || response.id,
      nombre: response.data?.nombre || response.data?.name
    })

    return NextResponse.json({
      success: true,
      data: response.data || response,
      message: 'Categoría creada exitosamente'
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

