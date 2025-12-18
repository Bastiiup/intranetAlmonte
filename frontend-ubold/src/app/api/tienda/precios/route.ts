import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

// Lista de posibles endpoints según la convención de Strapi
const POSIBLES_ENDPOINTS = [
  '/api/precios',
  '/api/product-precios',
  '/api/producto-precios',
  '/api/product-precio',
  '/api/producto-precio',
  '/api/precio',
  '/api/libro-precios',
  '/api/libro-precio',
  '/api/prices',
  '/api/product-prices',
]

// GET - Obtener precios de un libro
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const libroId = searchParams.get('libro')
    
    if (!libroId) {
      return NextResponse.json({
        success: false,
        error: 'ID de libro es requerido'
      }, { status: 400 })
    }
    
    console.log('[API Precios GET] Obteniendo precios para libro:', libroId)
    
    // Obtener libro con precios
    const response = await strapiClient.get<any>(
      `/api/libros?filters[id][$eq]=${libroId}&populate[precios]=*`
    )
    
    let libro: any
    if (Array.isArray(response)) {
      libro = response[0]
    } else if (response.data && Array.isArray(response.data)) {
      libro = response.data[0]
    } else if (response.data) {
      libro = response.data
    } else {
      libro = response
    }
    
    const attrs = libro?.attributes || {}
    const precios = 
      attrs.precios?.data || 
      attrs.PRECIOS?.data || 
      libro.precios?.data || 
      libro.PRECIOS?.data ||
      attrs.precios ||
      attrs.PRECIOS ||
      libro.precios ||
      libro.PRECIOS ||
      []
    
    console.log('[API Precios GET] ✅ Precios encontrados:', precios.length)
    
    return NextResponse.json({
      success: true,
      data: precios
    })
    
  } catch (error: any) {
    console.error('[API Precios GET] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST - Crear precio (probando múltiples endpoints)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[API Precios POST] 📦 Datos recibidos:', body)

    // Validaciones
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

    // Obtener libro
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
    
    if (!libro || !libro.id) {
      throw new Error('Libro no encontrado')
    }
    
    console.log('[API Precios POST] ✅ Libro encontrado:', {
      id: libro.id,
      documentId: libro.documentId,
      nombre: libro.attributes?.nombre_libro || libro.nombre_libro
    })
    
    // Preparar datos del precio según la estructura confirmada
    const precioData = {
      data: {
        precio_venta: parseFloat(body.precio_venta),
        libro: libro.id,  // ID numérico para la relación manyToOne
        fecha_inicio: body.fecha_inicio,
        activo: true,
        precio_costo: body.precio_costo ? parseFloat(body.precio_costo) : null,
        fecha_fin: body.fecha_fin || null
      }
    }
    
    // Verificar minúsculas
    const keys = Object.keys(precioData.data)
    const hasUppercase = keys.some(k => k !== k.toLowerCase())
    
    if (hasUppercase) {
      console.error('[API Precios POST] 🚨 Hay mayúsculas:', keys)
      throw new Error('Error interno: campos en mayúsculas')
    }
    
    console.log('[API Precios POST] 📤 Datos preparados:', JSON.stringify(precioData, null, 2))
    
    // PROBAR MÚLTIPLES ENDPOINTS HASTA ENCONTRAR EL CORRECTO
    let ultimoError: any = null
    let endpointCorrecto: string | null = null
    
    for (const endpoint of POSIBLES_ENDPOINTS) {
      try {
        console.log(`[API Precios POST] 🔍 Probando endpoint: ${endpoint}`)
        
        const response = await strapiClient.post<any>(endpoint, precioData)
        
        // Si llegamos aquí, funcionó!
        console.log(`[API Precios POST] ✅ ÉXITO con endpoint: ${endpoint}`)
        endpointCorrecto = endpoint
        
        return NextResponse.json({
          success: true,
          data: response.data || response,
          message: `Precio creado exitosamente usando ${endpoint}`,
          endpoint_usado: endpoint
        })
        
      } catch (error: any) {
        console.log(`[API Precios POST] ❌ Falló ${endpoint}:`, error.status || error.message)
        ultimoError = error
        
        // Si no es 404 ni 405, probablemente es otro error (datos incorrectos)
        if (error.status && error.status !== 404 && error.status !== 405) {
          throw error
        }
        
        // Continuar probando el siguiente endpoint
        continue
      }
    }
    
    // Si llegamos aquí, ningún endpoint funcionó con POST directo
    console.error('[API Precios POST] ❌ NINGÚN ENDPOINT ACEPTA POST DIRECTAMENTE')
    console.error('[API Precios POST] Último error:', ultimoError)
    console.log('[API Precios POST] 🔄 Intentando método alternativo: crear precio actualizando libro...')
    
    // MÉTODO ALTERNATIVO: Crear el precio como objeto y agregarlo al libro directamente
    // En Strapi v5, algunas relaciones oneToMany se crean actualizando el objeto padre
    try {
      // Obtener precios actuales del libro usando el ID numérico
      const libroConPrecios = await strapiClient.get<any>(
        `/api/libros/${libro.id}?populate[precios]=*`
      )
      
      let libroActual: any
      if (libroConPrecios.data) {
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
      
      // Crear el precio como objeto nuevo y agregarlo a la relación
      // IMPORTANTE: NO incluir el campo "libro" porque Strapi lo maneja automáticamente
      // cuando agregamos el precio a la relación del libro
      const nuevoPrecioObjeto = {
        precio_venta: parseFloat(body.precio_venta),
        fecha_inicio: body.fecha_inicio,
        activo: true,
        precio_costo: body.precio_costo ? parseFloat(body.precio_costo) : null,
        fecha_fin: body.fecha_fin || null
        // NO incluir "libro" aquí - Strapi lo maneja automáticamente
      }
      
      console.log('[API Precios POST] Objeto precio a crear (sin campo libro):', JSON.stringify(nuevoPrecioObjeto, null, 2))
      
      // Intentar actualizar el libro agregando el nuevo precio
      // Método 1: Usar "connect" con un array que incluye el nuevo objeto
      const updateData1 = {
        data: {
          precios: {
            connect: [...idsPreciosExistentes],
            create: [nuevoPrecioObjeto]
          }
        }
      }
      
      console.log('[API Precios POST] Intentando método 1: connect + create')
      console.log('[API Precios POST] Datos:', JSON.stringify(updateData1, null, 2))
      
      try {
        const libroActualizado1 = await strapiClient.put<any>(
          `/api/libros/${libro.documentId}`,
          updateData1
        )
        
        console.log('[API Precios POST] ✅ ÉXITO con método alternativo (connect + create)')
        
        return NextResponse.json({
          success: true,
          data: libroActualizado1.data || libroActualizado1,
          message: 'Precio creado actualizando el libro directamente',
          metodo: 'libro_update_connect_create'
        })
      } catch (error1: any) {
        console.log('[API Precios POST] Método 1 falló:', error1.message)
        
        // Método 2: Usar "set" con array que incluye IDs existentes + objeto nuevo
        // En Strapi v5, podemos mezclar IDs y objetos nuevos
        const updateData2 = {
          data: {
            precios: {
              set: [...idsPreciosExistentes.map(id => ({ id })), nuevoPrecioObjeto]
            }
          }
        }
        
        console.log('[API Precios POST] Intentando método 2: set con IDs + objeto nuevo')
        console.log('[API Precios POST] Datos:', JSON.stringify(updateData2, null, 2))
        
        try {
          const libroActualizado2 = await strapiClient.put<any>(
            `/api/libros/${libro.id}`,
            updateData2
          )
          
          console.log('[API Precios POST] ✅ ÉXITO con método alternativo (set con objeto)')
          
          return NextResponse.json({
            success: true,
            data: libroActualizado2.data || libroActualizado2,
            message: 'Precio creado actualizando el libro directamente',
            metodo: 'libro_update_set_object'
          })
        } catch (error2: any) {
          console.log('[API Precios POST] Método 2 falló:', error2.message)
          
          // Método 3: Usar "connectOrCreate" (si está disponible en Strapi v5)
          const updateData3 = {
            data: {
              precios: {
                connectOrCreate: [
                  ...idsPreciosExistentes.map(id => ({ id })),
                  {
                    create: nuevoPrecioObjeto
                  }
                ]
              }
            }
          }
          
          console.log('[API Precios POST] Intentando método 3: connectOrCreate')
          console.log('[API Precios POST] Datos:', JSON.stringify(updateData3, null, 2))
          
          try {
            const libroActualizado3 = await strapiClient.put<any>(
              `/api/libros/${libro.documentId}`,
              updateData3
            )
            
            console.log('[API Precios POST] ✅ ÉXITO con método alternativo (array directo)')
            
            return NextResponse.json({
              success: true,
              data: libroActualizado3.data || libroActualizado3,
              message: 'Precio creado actualizando el libro directamente',
              metodo: 'libro_update_array_directo'
            })
          } catch (error3: any) {
            console.error('[API Precios POST] ❌ TODOS LOS MÉTODOS ALTERNATIVOS FALLARON')
            console.error('[API Precios POST] Error método 3:', error3)
            
            // Si todos fallan, devolver error con toda la información
            return NextResponse.json({
              success: false,
              error: 'No se pudo crear el precio con ningún método',
              detalles: {
                endpoints_probados: POSIBLES_ENDPOINTS,
                metodos_alternativos_probados: ['connect+create', 'set+object', 'array_directo'],
                errores: {
                  endpoints: ultimoError?.message,
                  metodo1: error1?.message,
                  metodo2: error2?.message,
                  metodo3: error3?.message
                }
              },
              ayuda: 'El endpoint de precios no acepta POST. Necesitas verificar en Strapi cómo se crean los precios, o crear un endpoint personalizado.'
            }, { status: 400 })
          }
        }
      }
    } catch (errorAlt: any) {
      console.error('[API Precios POST] ❌ Error en método alternativo:', errorAlt)
      
      return NextResponse.json({
        success: false,
        error: 'Error al intentar método alternativo',
        detalles: errorAlt.message,
        endpoints_probados: POSIBLES_ENDPOINTS
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('[API Precios POST] ❌ ERROR GENERAL:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear precio',
      details: error.details
    }, { status: 500 })
  }
}
