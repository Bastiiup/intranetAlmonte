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
    
    console.log('[API Precios POST] 📦 Body recibido:', body)
    console.log('[API Precios POST] 🔑 Keys originales:', Object.keys(body))

    // Validaciones según estructura real de Strapi
    if (!body.precio_venta || parseFloat(body.precio_venta) <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Precio de venta es requerido y debe ser mayor a 0'
      }, { status: 400 })
    }

    if (!body.libroId) {
      return NextResponse.json({
        success: false,
        error: 'ID de libro es requerido'
      }, { status: 400 })
    }

    if (!body.fecha_inicio) {
      return NextResponse.json({
        success: false,
        error: 'Fecha de inicio es requerida'
      }, { status: 400 })
    }

    // Obtener el libro para obtener su documentId
    console.log('[API Precios POST] Obteniendo libro:', body.libroId)
    
    const libroResponse = await strapiClient.get<any>(
      `/api/libros?filters[id][$eq]=${body.libroId}`
    )
    
    let libro: any
    if (Array.isArray(libroResponse)) {
      libro = libroResponse[0]
    } else if (libroResponse.data && Array.isArray(libroResponse.data)) {
      libro = libroResponse.data[0]
    } else if (libroResponse.data) {
      libro = libroResponse.data
    } else {
      libro = libroResponse
    }
    
    if (!libro || !libro.documentId) {
      throw new Error('Libro no encontrado')
    }
    
    console.log('[API Precios POST] ✅ Libro encontrado:', {
      id: libro.id,
      documentId: libro.documentId
    })
    
    // CRÍTICO: Preparar datos según estructura real de Strapi (todos en minúsculas)
    // Para relaciones manyToOne en Strapi v5, podemos usar el ID numérico o documentId
    // Intentemos primero con el ID numérico que es más común
    const precioData: any = {
      data: {
        precio_venta: parseFloat(body.precio_venta),  // REQUERIDO
        libro: libro.id,                               // Relación manyToOne - usar ID numérico
        fecha_inicio: body.fecha_inicio,               // REQUERIDO (formato ISO)
      }
    }
    
    // Campos opcionales
    if (body.precio_costo !== undefined && body.precio_costo !== null && body.precio_costo !== '') {
      precioData.data.precio_costo = parseFloat(body.precio_costo)
    }
    if (body.fecha_fin) {
      precioData.data.fecha_fin = body.fecha_fin
    }
    if (body.activo !== undefined) {
      precioData.data.activo = Boolean(body.activo)
    } else {
      // Por defecto activo si no se especifica
      precioData.data.activo = true
    }
    
    // VERIFICACIÓN: Asegurar que NO hay mayúsculas
    const keys = Object.keys(precioData.data)
    const hasUppercase = keys.some(k => k !== k.toLowerCase())
    
    if (hasUppercase) {
      console.error('[API Precios POST] 🚨 ERROR: Hay mayúsculas en keys!')
      console.error('[API Precios POST] Keys:', keys)
      
      // Normalizar forzadamente
      const normalized: any = {}
      for (const [key, value] of Object.entries(precioData.data)) {
        normalized[key.toLowerCase()] = value
      }
      precioData.data = normalized
      console.log('[API Precios POST] ✅ Normalizado:', Object.keys(precioData.data))
    }
    
    console.log('[API Precios POST] 📤 Datos finales:', JSON.stringify(precioData, null, 2))
    
    // MÉTODO ALTERNATIVO: Como el endpoint /api/precios no existe,
    // vamos a crear el precio actualizando el libro directamente
    // Esto funciona porque Strapi permite crear relaciones anidadas
    
    try {
      console.log('[API Precios POST] Intentando método alternativo: actualizar libro con nuevo precio')
      
      // Obtener precios actuales del libro
      const libroConPrecios = await strapiClient.get<any>(
        `/api/libros?filters[id][$eq]=${body.libroId}&populate[precios]=*`
      )
      
      let libroActual: any
      if (Array.isArray(libroConPrecios)) {
        libroActual = libroConPrecios[0]
      } else if (libroConPrecios.data && Array.isArray(libroConPrecios.data)) {
        libroActual = libroConPrecios.data[0]
      } else if (libroConPrecios.data) {
        libroActual = libroConPrecios.data
      } else {
        libroActual = libroConPrecios
      }
      
      // Obtener IDs de precios existentes
      const attrs = libroActual?.attributes || {}
      const preciosExistentes = 
        attrs.precios?.data || 
        libroActual.precios?.data ||
        attrs.precios ||
        libroActual.precios ||
        []
      
      const idsPreciosExistentes = preciosExistentes
        .map((p: any) => p.id || p.documentId)
        .filter((id: any) => id !== undefined && id !== null)
      
      console.log('[API Precios POST] Precios existentes:', idsPreciosExistentes.length)
      
      // Crear nuevo precio usando el endpoint de Strapi directamente
      // Primero intentar crear el precio directamente
      let nuevoPrecioId: number | null = null
      
      // Intentar crear el precio directamente en Strapi
      // Probar diferentes nombres de endpoint posibles
      const posiblesEndpoints = [
        '/api/precios',
        '/api/product-precios',
        '/api/producto-precios',
        '/api/libro-precios'
      ]
      
      console.log('[API Precios POST] Intentando crear precio directamente en Strapi...')
      console.log('[API Precios POST] Datos a enviar:', JSON.stringify(precioData, null, 2))
      
      let precioCreado: any
      let endpointUsado = ''
      let errorUltimo: any = null
      
      // Intentar cada endpoint hasta que uno funcione
      for (const endpoint of posiblesEndpoints) {
        try {
          console.log(`[API Precios POST] Intentando endpoint: ${endpoint}`)
          precioCreado = await strapiClient.post<any>(endpoint, precioData)
          endpointUsado = endpoint
          console.log(`[API Precios POST] ✅ Éxito con endpoint: ${endpoint}`)
          break
        } catch (error: any) {
          console.log(`[API Precios POST] ❌ Falló endpoint ${endpoint}:`, error.status, error.message)
          errorUltimo = error
          // Continuar con el siguiente endpoint
          continue
        }
      }
      
      // Si ningún endpoint funcionó, manejar el error
      if (!precioCreado) {
        const errorFinal = errorUltimo || new Error('No se pudo crear el precio en ningún endpoint')
        
        // Si es 404, el endpoint no existe
        if (errorFinal.status === 404) {
          return NextResponse.json({
            success: false,
            error: 'Ninguno de los endpoints de precios existe en Strapi',
            endpointsIntentados: posiblesEndpoints,
            ayuda: 'Verifica el nombre correcto del endpoint en Strapi o habilita los permisos'
          }, { status: 400 })
        }
        
        // Si es 405, el método no está permitido
        if (errorFinal.status === 405) {
          return NextResponse.json({
            success: false,
            error: 'El método POST no está permitido para los endpoints de precios',
            endpointsIntentados: posiblesEndpoints,
            ayuda: 'Verifica los permisos en Strapi'
          }, { status: 400 })
        }
        
        // Si es 400, podría ser un error de validación
        if (errorFinal.status === 400) {
          return NextResponse.json({
            success: false,
            error: errorFinal.message || 'Error de validación al crear precio',
            detalles: errorFinal.details || errorFinal,
            endpointsIntentados: posiblesEndpoints
          }, { status: 400 })
        }
        
        throw errorFinal
      }
      
      // Extraer ID del precio creado
      if (precioCreado.data) {
        nuevoPrecioId = precioCreado.data.id || precioCreado.data.documentId
      } else if (precioCreado.id) {
        nuevoPrecioId = precioCreado.id
      } else if (precioCreado.documentId) {
        nuevoPrecioId = precioCreado.documentId
      }
      
      console.log('[API Precios POST] ✅ Precio creado directamente, ID:', nuevoPrecioId)
      console.log('[API Precios POST] Endpoint usado:', endpointUsado)
      
      // El precio ya tiene la relación con libro porque lo incluimos en precioData
      // La relación manyToOne se establece automáticamente cuando creamos el precio con libro: libro.id
      
      return NextResponse.json({
        success: true,
        data: precioCreado.data || precioCreado,
        metodo: 'precio_creado_con_relacion',
        mensaje: 'Precio creado exitosamente con relación al libro',
        endpointUsado: endpointUsado
      })
      
      
    } catch (strapiError: any) {
      console.error('[API Precios POST] ❌ Error de Strapi:', strapiError)
      
      // Si es 405, explicar el problema
      if (strapiError.status === 405) {
        return NextResponse.json({
          success: false,
          error: 'La colección "precios" no acepta creación directa. Necesitas configurar los permisos en Strapi.',
          ayuda: 'Ve a Strapi → Settings → Users & Permissions → Roles → Public/Authenticated → Permissions → Precio → Marca "create"',
          alternativa: 'O usa el método alternativo de actualizar el libro directamente'
        }, { status: 400 })
      }
      
      // Si es 404, el endpoint no existe
      if (strapiError.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'El endpoint /api/precios no existe en Strapi. Necesitas crear precios de otra forma.',
          ayuda: 'Los precios se deben crear actualizando el libro directamente o habilitando el endpoint en Strapi'
        }, { status: 400 })
      }
      
      throw strapiError
    }
    
  } catch (error: any) {
    console.error('[API Precios POST] ❌ ERROR:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear precio',
      details: error.details
    }, { status: 500 })
  }
}

