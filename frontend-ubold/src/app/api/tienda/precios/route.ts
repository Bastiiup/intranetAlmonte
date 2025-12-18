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

    // Validaciones
    if (!body.monto || parseFloat(body.monto) <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Monto es requerido y debe ser mayor a 0'
      }, { status: 400 })
    }

    if (!body.libroId) {
      return NextResponse.json({
        success: false,
        error: 'ID de libro es requerido'
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
    
    // CRÍTICO: Preparar datos en minúsculas SOLO
    const precioData: any = {
      data: {
        precio: parseFloat(body.monto),  // minúsculas
        libro: libro.documentId,          // minúsculas
      }
    }
    
    // Agregar otros campos si vienen en el body (solo minúsculas)
    if (body.canal) precioData.data.canal = body.canal
    if (body.moneda) precioData.data.moneda = body.moneda
    if (body.fechaInicio) precioData.data.fecha_inicio = body.fechaInicio
    if (body.fechaFin) precioData.data.fecha_fin = body.fechaFin
    if (body.tipo) precioData.data.tipo = body.tipo
    
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
      
      try {
        console.log('[API Precios POST] Intentando crear precio directamente en Strapi...')
        const precioCreado = await strapiClient.post<any>('/api/precios', precioData)
        
        // Extraer ID del precio creado
        if (precioCreado.data) {
          nuevoPrecioId = precioCreado.data.id || precioCreado.data.documentId
        } else if (precioCreado.id) {
          nuevoPrecioId = precioCreado.id
        }
        
        console.log('[API Precios POST] ✅ Precio creado directamente, ID:', nuevoPrecioId)
      } catch (errorDirecto: any) {
        console.log('[API Precios POST] ⚠️ No se pudo crear precio directamente:', errorDirecto.message)
        
        // Si falla, usar método alternativo: crear precio como objeto y agregarlo al libro
        // Strapi puede crear relaciones anidadas
        console.log('[API Precios POST] Usando método alternativo: crear precio anidado en libro')
        
        const precioAnidado = {
          precio: parseFloat(body.monto),
          libro: libro.documentId
        }
        
        // Agregar otros campos si existen
        if (body.canal) precioAnidado.canal = body.canal
        if (body.moneda) precioAnidado.moneda = body.moneda
        
        // Actualizar libro agregando el nuevo precio
        const updateData = {
          data: {
            precios: [...idsPreciosExistentes, precioAnidado]
          }
        }
        
        console.log('[API Precios POST] Actualizando libro con nuevo precio anidado...')
        const libroActualizado = await strapiClient.put<any>(
          `/api/libros/${libro.documentId}`,
          updateData
        )
        
        console.log('[API Precios POST] ✅ Libro actualizado con nuevo precio')
        
        return NextResponse.json({
          success: true,
          data: libroActualizado.data || libroActualizado,
          metodo: 'precio_anidado_en_libro',
          mensaje: 'Precio creado actualizando el libro directamente'
        })
      }
      
      // Si se creó directamente, actualizar el libro para relacionarlo
      if (nuevoPrecioId) {
        console.log('[API Precios POST] Relacionando precio con libro...')
        
        const updateData = {
          data: {
            precios: [...idsPreciosExistentes, nuevoPrecioId]
          }
        }
        
        await strapiClient.put<any>(
          `/api/libros/${libro.documentId}`,
          updateData
        )
        
        console.log('[API Precios POST] ✅ Precio relacionado con libro')
        
        return NextResponse.json({
          success: true,
          data: { id: nuevoPrecioId },
          metodo: 'precio_directo_y_relacionado',
          mensaje: 'Precio creado y relacionado con el libro'
        })
      }
      
      throw new Error('No se pudo crear el precio')
      
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

