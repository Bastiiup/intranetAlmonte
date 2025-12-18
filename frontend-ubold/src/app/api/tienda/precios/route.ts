import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

// GET - Obtener precios de un libro
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const libroId = searchParams.get('libro')
    
    if (!libroId) {
      return NextResponse.json({
        success: false,
        error: 'ID de libro requerido'
      }, { status: 400 })
    }
    
    console.log('[API Precios GET] Obteniendo precios para libro:', libroId)
    
    // Buscar libro con sus precios usando diferentes variaciones de populate
    const populateOptions = [
      'populate[precios]=*',
      'populate[PRECIOS]=*',
      'populate[precios][populate]=*',
      'populate=*'
    ]
    
    let libro: any = null
    let precios: any[] = []
    
    for (const populate of populateOptions) {
      try {
        const response = await strapiClient.get<any>(
          `/api/libros?filters[id][$eq]=${libroId}&${populate}`
        )
        
        // Extraer libro de la respuesta
        if (Array.isArray(response)) {
          libro = response[0]
        } else if (response.data && Array.isArray(response.data)) {
          libro = response.data[0]
        } else if (response.data) {
          libro = response.data
        } else {
          libro = response
        }
        
        // Intentar obtener precios de diferentes formas
        const attrs = libro?.attributes || {}
        precios = 
          attrs.precios?.data || 
          attrs.PRECIOS?.data || 
          libro.precios?.data || 
          libro.PRECIOS?.data ||
          attrs.precios ||
          attrs.PRECIOS ||
          libro.precios ||
          libro.PRECIOS ||
          []
        
        if (precios.length > 0 || libro) {
          console.log(`[API Precios GET] ✅ Encontrado con populate: ${populate}`)
          break
        }
      } catch (err: any) {
        console.log(`[API Precios GET] Populate ${populate} falló:`, err.message)
        continue
      }
    }
    
    if (!libro) {
      return NextResponse.json({
        success: false,
        error: 'Libro no encontrado'
      }, { status: 404 })
    }
    
    console.log('[API Precios GET] ✅ Precios encontrados:', precios.length)
    
    return NextResponse.json({
      success: true,
      data: Array.isArray(precios) ? precios : [],
      libro: {
        id: libro.id,
        nombre: libro.attributes?.nombre_libro || libro.nombre_libro
      }
    })
    
  } catch (error: any) {
    console.error('[API Precios GET] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST - Crear nuevo precio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[API Precios POST] Creando precio:', body)
    
    // Estructura básica - ajustar según estructura real de Strapi
    // Por ahora usamos campos comunes, se ajustará después de ver la estructura real
    const precioData: any = {
      data: {
        precio: body.monto || body.precio,
        PRECIO: body.monto || body.precio,
      }
    }
    
    // Si hay relación con libro, agregarla
    if (body.libroId) {
      precioData.data.libro = body.libroId
      precioData.data.LIBRO = body.libroId
    }
    
    // Agregar otros campos si vienen en el body
    if (body.canal) precioData.data.canal = body.canal
    if (body.moneda) precioData.data.moneda = body.moneda
    if (body.fechaInicio) precioData.data.fecha_inicio = body.fechaInicio
    if (body.fechaFin) precioData.data.fecha_fin = body.fechaFin
    
    const response = await strapiClient.post<any>('/api/precios', precioData)
    
    console.log('[API Precios POST] ✅ Precio creado:', response)
    
    return NextResponse.json({
      success: true,
      data: response.data || response
    })
    
  } catch (error: any) {
    console.error('[API Precios POST] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.details
    }, { status: 500 })
  }
}

