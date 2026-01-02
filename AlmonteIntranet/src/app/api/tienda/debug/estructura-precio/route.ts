import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('[Debug Precio] Investigando estructura...')
    
    // Intentar obtener un libro con sus precios populados
    const populateOptions = [
      'populate[precios]=*',
      'populate[PRECIOS]=*',
      'populate[precios][populate]=*',
      'populate=*'
    ]
    
    let libro: any = null
    let precios: any[] = []
    let populateUsado = ''
    
    for (const populate of populateOptions) {
      try {
        console.log(`[Debug Precio] Intentando populate: ${populate}`)
        const response = await strapiClient.get<any>(
          `/api/libros?${populate}&pagination[pageSize]=1`
        )
        
        // Extraer libro
        if (Array.isArray(response)) {
          libro = response[0]
        } else if (response.data && Array.isArray(response.data)) {
          libro = response.data[0]
        } else if (response.data) {
          libro = response.data
        } else {
          libro = response
        }
        
        // Intentar obtener precios
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
          populateUsado = populate
          console.log(`[Debug Precio] ✅ Encontrado con populate: ${populate}`)
          break
        }
      } catch (err: any) {
        console.log(`[Debug Precio] Populate ${populate} falló:`, err.message)
        continue
      }
    }
    
    if (!libro) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener ningún libro',
        populateIntentados: populateOptions
      }, { status: 404 })
    }
    
    const primerPrecio = precios[0]
    
    // Extraer estructura detallada
    let estructuraPrimerPrecio: string[] = []
    let estructuraAttrs: string[] = []
    let ejemploCompleto: any = null
    
    if (primerPrecio) {
      estructuraPrimerPrecio = Object.keys(primerPrecio)
      
      if (primerPrecio.attributes) {
        estructuraAttrs = Object.keys(primerPrecio.attributes)
      }
      
      ejemploCompleto = primerPrecio
    }
    
    // Buscar libros que SÍ tengan precios
    let libroConPrecios: any = null
    let preciosEncontrados: any[] = []
    
    try {
      console.log('[Debug Precio] Buscando libros con precios...')
      const todosLosLibros = await strapiClient.get<any>(
        '/api/libros?populate[precios]=*&pagination[pageSize]=50'
      )
      
      let libros: any[] = []
      if (Array.isArray(todosLosLibros)) {
        libros = todosLosLibros
      } else if (todosLosLibros.data && Array.isArray(todosLosLibros.data)) {
        libros = todosLosLibros.data
      }
      
      // Buscar el primer libro que tenga precios
      for (const lib of libros) {
        const attrs = lib?.attributes || {}
        const preciosLib = 
          attrs.precios?.data || 
          attrs.PRECIOS?.data || 
          lib.precios?.data || 
          lib.PRECIOS?.data ||
          attrs.precios ||
          attrs.PRECIOS ||
          lib.precios ||
          lib.PRECIOS ||
          []
        
        if (preciosLib.length > 0) {
          libroConPrecios = lib
          preciosEncontrados = preciosLib
          console.log(`[Debug Precio] ✅ Encontrado libro con ${preciosLib.length} precios`)
          break
        }
      }
    } catch (e: any) {
      console.log('[Debug Precio] Error al buscar libros con precios:', e.message)
    }
    
    // Intentar diferentes endpoints de precios
    const endpointsPrecios = [
      '/api/precios',
      '/api/precio',
      '/api/product-precios',
      '/api/producto-precios',
      '/api/libro-precios'
    ]
    
    const resultadosEndpoints: any = {}
    
    for (const endpoint of endpointsPrecios) {
      try {
        const response = await strapiClient.get<any>(`${endpoint}?populate=*&pagination[pageSize]=3`)
        resultadosEndpoints[endpoint] = {
          funciona: true,
          data: Array.isArray(response) ? response.slice(0, 2) : (response.data?.slice(0, 2) || [])
        }
        console.log(`[Debug Precio] ✅ Endpoint ${endpoint} funciona`)
      } catch (e: any) {
        resultadosEndpoints[endpoint] = {
          funciona: false,
          error: e.message
        }
      }
    }
    
    // Si encontramos un libro con precios, usar esos datos
    let precioEjemplo = primerPrecio
    let estructuraEjemplo = estructuraPrimerPrecio
    let estructuraAttrsEjemplo = estructuraAttrs
    
    if (libroConPrecios && preciosEncontrados.length > 0) {
      precioEjemplo = preciosEncontrados[0]
      estructuraEjemplo = Object.keys(precioEjemplo)
      if (precioEjemplo.attributes) {
        estructuraAttrsEjemplo = Object.keys(precioEjemplo.attributes)
      }
    }
    
    return NextResponse.json({
      success: true,
      populateUsado,
      libroConsultado: {
        id: libro.id,
        documentId: libro.documentId,
        nombre: libro.attributes?.nombre_libro || libro.nombre_libro,
        tienePrecios: precios.length > 0
      },
      libroConPrecios: libroConPrecios ? {
        id: libroConPrecios.id,
        documentId: libroConPrecios.documentId,
        nombre: libroConPrecios.attributes?.nombre_libro || libroConPrecios.nombre_libro,
        totalPrecios: preciosEncontrados.length
      } : null,
      estructuraPrecio: {
        estructuraPrimerPrecio: estructuraEjemplo,
        estructuraAttrs: estructuraAttrsEjemplo,
        ejemploCompleto: precioEjemplo,
        todosLosCampos: estructuraEjemplo.concat(estructuraAttrsEjemplo).filter((v, i, a) => a.indexOf(v) === i)
      },
      endpointsPrecios: resultadosEndpoints,
      recomendacion: {
        puedeCrearDirecto: Object.values(resultadosEndpoints).some((r: any) => r.funciona),
        endpointRecomendado: Object.entries(resultadosEndpoints).find(([_, r]: [string, any]) => r.funciona)?.[0] || null,
        necesitaActualizarLibro: !Object.values(resultadosEndpoints).some((r: any) => r.funciona) && libroConPrecios === null
      },
      instrucciones: {
        paso1: 'Revisa "estructuraPrecio.estructuraPrimerPrecio" para ver campos del precio',
        paso2: 'Revisa "estructuraPrecio.estructuraAttrs" para ver campos dentro de attributes',
        paso3: 'Revisa "estructuraPrecio.ejemploCompleto" para ver estructura completa',
        paso4: 'Revisa "endpointsPrecios" para ver qué endpoints funcionan',
        paso5: 'Si "recomendacion.puedeCrearDirecto" es true, usa POST al endpoint recomendado',
        paso6: 'Si es false, necesitas crear precios actualizando el libro directamente'
      }
    })
    
  } catch (error: any) {
    console.error('[Debug Precio] ❌ Error general:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

