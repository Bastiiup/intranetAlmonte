import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('[Debug Precios] Investigando estructura...')
    
    // Intentar obtener precios existentes
    let preciosData = null
    let error1 = null
    
    try {
      preciosData = await strapiClient.get<any>('/api/precios?populate=*&pagination[pageSize]=5')
      console.log('[Debug Precios] ✅ Endpoint /api/precios funciona')
    } catch (e: any) {
      error1 = e.message
      console.log('[Debug Precios] ❌ Endpoint /api/precios falló:', error1)
    }
    
    // Intentar obtener un libro con sus precios
    let libroConPrecios = null
    let error2 = null
    
    try {
      const libros = await strapiClient.get<any>('/api/libros?populate[precios]=*&pagination[pageSize]=1')
      let libro: any = null
      
      if (Array.isArray(libros)) {
        libro = libros[0]
      } else if (libros.data && Array.isArray(libros.data)) {
        libro = libros.data[0]
      } else if (libros.data) {
        libro = libros.data
      } else {
        libro = libros
      }
      
      libroConPrecios = libro
      console.log('[Debug Precios] ✅ Libro con precios obtenido')
    } catch (e: any) {
      error2 = e.message
      console.log('[Debug Precios] ❌ Error al obtener libro con precios:', error2)
    }
    
    // Extraer estructura de precios
    let estructuraPrecios: string[] = []
    let primerPrecio: any = null
    let preciosDelLibro: any[] = []
    
    if (preciosData) {
      let precios: any[] = []
      if (Array.isArray(preciosData)) {
        precios = preciosData
      } else if (preciosData.data && Array.isArray(preciosData.data)) {
        precios = preciosData.data
      } else if (preciosData.data) {
        precios = [preciosData.data]
      }
      
      if (precios.length > 0) {
        primerPrecio = precios[0]
        estructuraPrecios = Object.keys(primerPrecio)
        if (primerPrecio.attributes) {
          estructuraPrecios = estructuraPrecios.concat(Object.keys(primerPrecio.attributes))
        }
      }
    }
    
    if (libroConPrecios) {
      const attrs = libroConPrecios.attributes || {}
      preciosDelLibro = 
        attrs.precios?.data || 
        attrs.PRECIOS?.data || 
        libroConPrecios.precios?.data || 
        libroConPrecios.PRECIOS?.data ||
        attrs.precios ||
        attrs.PRECIOS ||
        libroConPrecios.precios ||
        libroConPrecios.PRECIOS ||
        []
    }
    
    return NextResponse.json({
      success: true,
      endpoints: {
        '/api/precios': {
          funciona: !error1,
          error: error1,
          totalPrecios: preciosData ? (Array.isArray(preciosData) ? preciosData.length : (preciosData.data?.length || 0)) : 0,
          estructura: estructuraPrecios,
          primerPrecio: primerPrecio,
          muestra: preciosData ? (Array.isArray(preciosData) ? preciosData.slice(0, 2) : (preciosData.data?.slice(0, 2) || [])) : []
        },
        'libro_con_precios': {
          funciona: !error2,
          error: error2,
          libroId: libroConPrecios?.id,
          libroNombre: libroConPrecios?.attributes?.nombre_libro || libroConPrecios?.nombre_libro,
          totalPrecios: preciosDelLibro.length,
          precios: preciosDelLibro.slice(0, 3),
          estructuraPrecios: preciosDelLibro[0] ? Object.keys(preciosDelLibro[0]) : null,
          estructuraPreciosAttrs: preciosDelLibro[0]?.attributes ? Object.keys(preciosDelLibro[0].attributes) : null
        }
      },
      recomendaciones: {
        endpointPrecios: error1 ? 'No funciona /api/precios' : 'Funciona /api/precios',
        relacionLibro: preciosDelLibro.length > 0 ? 'Libro tiene precios relacionados' : 'Libro no tiene precios',
        camposPrecio: estructuraPrecios.length > 0 ? estructuraPrecios : 'No se pudo determinar'
      }
    })
  } catch (error: any) {
    console.error('[Debug Precios] ❌ Error general:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

