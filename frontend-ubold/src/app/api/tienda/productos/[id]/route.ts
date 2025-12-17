/**
 * API Route para obtener y actualizar un producto específico desde Strapi por ID
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('[API /tienda/productos/[id] GET] Obteniendo producto:', {
      id,
      esNumerico: !isNaN(parseInt(id)),
      endpoint: `/api/libros/${id}`,
    })
    
    // ESTRATEGIA OPTIMIZADA:
    // 1. Intentar endpoint directo primero (más eficiente)
    // 2. Si falla con 404, buscar en lista completa (por si es documentId)
    // 3. Si falla con otro error, retornar error específico
    
    // PASO 1: Intentar obtener directamente por ID numérico
    if (!isNaN(parseInt(id))) {
      try {
        const directResponse = await strapiClient.get<any>(`/api/libros/${id}?populate=*`)
        
        // Strapi puede devolver los datos en response.data o directamente
        const producto = directResponse.data || directResponse
        
        if (producto && (producto.id || producto.documentId)) {
          console.log('[API /tienda/productos/[id] GET] ✅ Producto encontrado por ID directo:', {
            idBuscado: id,
            productoId: producto.id,
            documentId: producto.documentId,
          })
          
          return NextResponse.json({
            success: true,
            data: producto,
          }, { status: 200 })
        }
      } catch (directError: any) {
        // Si es 404, el producto no existe con ese ID numérico
        // Continuar a buscar por documentId en la lista completa
        if (directError.status === 404) {
          console.log('[API /tienda/productos/[id] GET] ⚠️ Producto no encontrado por ID numérico, buscando por documentId...')
        } else {
          // Si es otro error (502, 500, etc), loguear pero continuar con búsqueda alternativa
          console.warn('[API /tienda/productos/[id] GET] ⚠️ Error al obtener por ID directo:', {
            status: directError.status,
            message: directError.message,
            continuandoConBusqueda: true,
          })
        }
      }
    }
    
    // PASO 2: Buscar en lista completa (por si el ID es documentId o si el endpoint directo falló)
    try {
      console.log('[API /tienda/productos/[id] GET] Buscando en lista completa de productos...')
      
      const allProducts = await strapiClient.get<any>(
        `/api/libros?populate=*&pagination[pageSize]=1000`
      )
      
      // Strapi puede devolver los datos en diferentes estructuras:
      // 1. { data: [...] } - formato estándar
      // 2. { data: { data: [...] } } - formato anidado
      // 3. [...] - array directo (menos común)
      let productos: any[] = []
      
      if (Array.isArray(allProducts)) {
        productos = allProducts
      } else if (Array.isArray(allProducts.data)) {
        productos = allProducts.data
      } else if (allProducts.data && Array.isArray(allProducts.data.data)) {
        productos = allProducts.data.data
      } else if (allProducts.data && !Array.isArray(allProducts.data)) {
        // Si data es un objeto único, convertirlo a array
        productos = [allProducts.data]
      }
      
      console.log('[API /tienda/productos/[id] GET] Estructura de respuesta procesada:', {
        esArray: Array.isArray(allProducts),
        tieneData: !!allProducts.data,
        dataEsArray: Array.isArray(allProducts.data),
        totalProductos: productos.length,
        estructura: {
          tipo: typeof allProducts,
          keys: Object.keys(allProducts || {}),
          dataTipo: typeof allProducts.data,
          dataKeys: allProducts.data ? Object.keys(allProducts.data) : [],
        },
      })
      
      console.log('[API /tienda/productos/[id] GET] Lista obtenida:', {
        total: productos.length,
        idBuscado: id,
        primerosIds: productos.slice(0, 5).map((p: any) => ({
          id: p.id,
          documentId: p.documentId,
        })),
      })
      
      // Buscar por id numérico o documentId
      // IMPORTANTE: Los datos pueden venir directamente o dentro de attributes
      const productoEncontrado = productos.find((p: any) => {
        // Obtener el objeto real (puede estar en p o p.attributes)
        const productoReal = p.attributes && Object.keys(p.attributes).length > 0 ? p.attributes : p
        
        const pId = productoReal.id?.toString() || p.id?.toString()
        const pDocId = productoReal.documentId?.toString() || p.documentId?.toString()
        const idStr = id.toString()
        const idNum = parseInt(idStr)
        
        // Comparar como string y como número
        const encontrado = (
          pId === idStr ||
          pDocId === idStr ||
          (!isNaN(idNum) && (productoReal.id === idNum || p.id === idNum)) ||
          pDocId === idStr
        )
        
        if (encontrado) {
          console.log('[API /tienda/productos/[id] GET] ✅ Coincidencia encontrada:', {
            idBuscado: id,
            pId,
            pDocId,
            productoId: productoReal.id || p.id,
            documentId: productoReal.documentId || p.documentId,
          })
        }
        
        return encontrado
      })
      
      if (productoEncontrado) {
        console.log('[API /tienda/productos/[id] GET] ✅ Producto encontrado en lista:', {
          idBuscado: id,
          productoId: productoEncontrado.id,
          documentId: productoEncontrado.documentId,
        })
        
        return NextResponse.json({
          success: true,
          data: productoEncontrado,
        }, { status: 200 })
      }
      
      // Si no se encontró en la lista, retornar 404 con información útil
      const idsDisponibles = productos.map((p: any) => ({
        id: p.id,
        documentId: p.documentId,
        nombre: p.nombre_libro || p.NOMBRE_LIBRO || p.nombreLibro || 'Sin nombre',
      }))
      
      console.error('[API /tienda/productos/[id] GET] ❌ Producto no encontrado:', {
        idBuscado: id,
        tipoId: typeof id,
        esNumerico: !isNaN(parseInt(id)),
        totalProductos: productos.length,
        idsDisponibles: idsDisponibles.slice(0, 10),
      })
      
      return NextResponse.json(
        { 
          success: false,
          error: `Producto con ID "${id}" no encontrado. Verifica que el ID sea correcto.`,
          data: null,
          debug: {
            idBuscado: id,
            tipoId: typeof id,
            totalProductos: productos.length,
            idsDisponibles: idsDisponibles.slice(0, 10),
            mensaje: `IDs disponibles: ${idsDisponibles.map((p: any) => `id:${p.id} o documentId:${p.documentId}`).join(', ')}`,
          },
        },
        { status: 404 }
      )
    } catch (listError: any) {
      console.error('[API /tienda/productos/[id] GET] ❌ Error al obtener lista de productos:', {
        status: listError.status,
        message: listError.message,
        details: listError.details,
      })
      
      return NextResponse.json(
        { 
          success: false,
          error: `Error al buscar producto: ${listError.message || 'Error desconocido'}`,
          data: null,
        },
        { status: listError.status || 500 }
      )
    }
  } catch (error: any) {
    console.error('[API /tienda/productos/[id] GET] ❌ Error general:', {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack,
    })
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener producto',
        data: null,
      },
      { status: error.status || 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API /tienda/productos/[id] PUT] ===== INICIANDO PUT =====')
  
  try {
    // PASO 1: Obtener parámetros y body
    const { id } = await params
    console.log('[API /tienda/productos/[id] PUT] Params recibidos:', { 
      id, 
      tipoId: typeof id,
      esNumerico: !isNaN(parseInt(id))
    })
    
    let body: any = {}
    try {
      const bodyText = await request.text()
      console.log('[API /tienda/productos/[id] PUT] Body recibido (texto):', bodyText)
      body = JSON.parse(bodyText)
      console.log('[API /tienda/productos/[id] PUT] Body recibido (JSON):', JSON.stringify(body, null, 2))
      console.log('[API /tienda/productos/[id] PUT] Campos recibidos:', Object.keys(body))
    } catch (parseError: any) {
      console.error('[API /tienda/productos/[id] PUT] ❌ Error al parsear body:', parseError)
      return NextResponse.json(
        { success: false, error: 'Error al parsear el cuerpo de la petición' },
        { status: 400 }
      )
    }
    
    // LOGS DETALLADOS DE ENTRADA
    const token = process.env.STRAPI_API_TOKEN
    const tieneToken = !!token
    const tokenLength = token ? token.length : 0
    
    console.log('[API PUT] 🔍 DATOS DE ENTRADA:', {
      idRecibido: id,
      tipoDeId: typeof id,
      idNumerico: parseInt(id),
      esNumeroValido: !isNaN(parseInt(id)),
      bodyRecibido: body
    })
    
    console.log('[API PUT] 🔐 CONFIGURACIÓN STRAPI:', {
      tieneToken,
      tokenLength,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'NO CONFIGURADO',
      strapiUrl: process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl',
      todasLasEnvVars: Object.keys(process.env).filter(k => k.includes('STRAPI')).join(', ')
    })
    
    console.log('[API PUT] 📍 Endpoint que se va a llamar:', `/api/libros/${id}`)
    console.log('[API PUT] 🌐 URL completa Strapi:', `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}/api/libros/${id}?populate=*`)
    
    // Validar que el token esté configurado
    if (!token) {
      console.error('[API PUT] ❌ STRAPI_API_TOKEN NO ESTÁ CONFIGURADO')
      return NextResponse.json(
        { 
          success: false, 
          error: 'STRAPI_API_TOKEN no está configurado. Por favor, configura la variable de entorno en Railway.',
          debug: {
            idBuscado: id,
            tieneToken: false,
            instrucciones: 'Ve a Railway → Variables → Agrega STRAPI_API_TOKEN'
          }
        },
        { status: 500 }
      )
    }
    
    // PASO 2: Obtener producto directamente por ID
    // IMPORTANTE: Si el ID es un documentId (string no numérico), necesitamos buscar en la lista
    let productoId: number | null = null
    let productoActual: any = null
    
    const esIdNumerico = !isNaN(parseInt(id)) && id.toString() === parseInt(id).toString()
    
    console.log('[API /tienda/productos/[id] PUT] Intentando obtener producto:', {
      idBuscado: id,
      esIdNumerico,
      endpoint: `/api/libros/${id}?populate=*`
    })
    
    // Si es ID numérico, intentar GET directo primero
    if (esIdNumerico) {
      try {
        const directResponse = await strapiClient.get<any>(`/api/libros/${id}?populate=*`)
        
        console.log('[API /tienda/productos/[id] PUT] Respuesta completa del GET:', {
          tieneData: !!directResponse.data,
          tieneIdDirecto: !!directResponse.id,
          keys: Object.keys(directResponse),
          respuestaCompleta: JSON.stringify(directResponse, null, 2).substring(0, 500) + '...'
        })
        
        // Manejar ambas estructuras: response.data.id o response.id
        if (directResponse.data && directResponse.data.id) {
          productoActual = directResponse.data
          productoId = directResponse.data.id
          console.log('[API /tienda/productos/[id] PUT] ✅ Producto encontrado en response.data:', {
            id: directResponse.data.id,
            documentId: directResponse.data.documentId,
            nombre: directResponse.data.nombre_libro
          })
        } else if (directResponse.id) {
          productoActual = directResponse
          productoId = directResponse.id
          console.log('[API /tienda/productos/[id] PUT] ✅ Producto encontrado en response directo:', {
            id: directResponse.id,
            documentId: directResponse.documentId,
            nombre: directResponse.nombre_libro
          })
        } else {
          console.error('[API /tienda/productos/[id] PUT] ❌ Respuesta no tiene estructura esperada:', {
            respuesta: directResponse
          })
          return NextResponse.json(
            { 
              success: false, 
              error: 'La respuesta de Strapi no tiene la estructura esperada',
              debug: { respuesta: directResponse }
            },
            { status: 500 }
          )
        }
      } catch (getError: any) {
        console.error('[API /tienda/productos/[id] PUT] ❌ Error al obtener producto por ID numérico:', {
          status: getError.status,
          message: getError.message,
          details: getError.details,
        })
        
        // Si es 404 con ID numérico, el producto realmente no existe
        if (getError.status === 404) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Producto con ID "${id}" no encontrado en Strapi`,
              debug: {
                idBuscado: id,
                status: getError.status,
                message: getError.message,
                endpoint: `/api/libros/${id}?populate=*`
              }
            },
            { status: 404 }
          )
        }
        
        // Si es otro error, retornar error específico
        return NextResponse.json(
          { 
            success: false, 
            error: `Error al obtener producto: ${getError.message}`,
            debug: {
              idBuscado: id,
              status: getError.status,
              message: getError.message,
            }
          },
          { status: getError.status || 500 }
        )
      }
    } else {
      // Si NO es ID numérico (es documentId), buscar en lista completa
      console.log('[API /tienda/productos/[id] PUT] ID no es numérico, buscando por documentId en lista completa...')
      
      try {
        const allProducts = await strapiClient.get<any>(
          `/api/libros?populate=*&pagination[pageSize]=1000`
        )
        
        let productos: any[] = []
        if (Array.isArray(allProducts)) {
          productos = allProducts
        } else if (Array.isArray(allProducts.data)) {
          productos = allProducts.data
        } else if (allProducts.data && Array.isArray(allProducts.data.data)) {
          productos = allProducts.data.data
        }
        
        console.log('[API /tienda/productos/[id] PUT] Buscando producto por documentId:', {
          idBuscado: id,
          totalProductos: productos.length,
        })
        
        // Buscar por documentId o id
        productoActual = productos.find((p: any) => 
          p.documentId === id || p.id?.toString() === id || p.id === parseInt(id)
        )
        
        if (productoActual && productoActual.id) {
          productoId = productoActual.id
          console.log('[API /tienda/productos/[id] PUT] ✅ Producto encontrado por documentId:', {
            idBuscado: id,
            idNumerico: productoId,
            documentId: productoActual.documentId,
            nombre: productoActual.nombre_libro
          })
        } else {
          console.error('[API /tienda/productos/[id] PUT] ❌ Producto no encontrado por documentId:', {
            idBuscado: id,
            totalProductos: productos.length,
            primerosIds: productos.slice(0, 3).map((p: any) => ({ id: p.id, documentId: p.documentId }))
          })
          return NextResponse.json(
            { 
              success: false, 
              error: `Producto con ID/documentId "${id}" no encontrado en Strapi`,
              debug: {
                idBuscado: id,
                totalProductos: productos.length,
              }
            },
            { status: 404 }
          )
        }
      } catch (listError: any) {
        console.error('[API /tienda/productos/[id] PUT] ❌ Error al buscar en lista completa:', {
          status: listError.status,
          message: listError.message,
          details: listError.details,
        })
        return NextResponse.json(
          { 
            success: false, 
            error: `Error al buscar producto: ${listError.message}`,
            debug: {
              idBuscado: id,
              status: listError.status,
            }
          },
          { status: listError.status || 500 }
        )
      }
    }
    
    // PASO 3: Validar que tenemos un ID numérico válido
    if (!productoId || isNaN(Number(productoId))) {
      console.error('[API /tienda/productos/[id] PUT] ❌ ID numérico inválido:', {
        productoId,
        tipo: typeof productoId,
        productoActual
      })
      return NextResponse.json(
        { success: false, error: 'El producto encontrado no tiene un ID numérico válido' },
        { status: 500 }
      )
    }
    
    console.log('[API /tienda/productos/[id] PUT] ✅ Producto encontrado y validado:', {
      idOriginal: id,
      idNumerico: productoId,
      documentId: productoActual?.documentId,
      nombre: productoActual?.nombre_libro
    })
    
    // PASO 4: Preparar datos para Strapi v4/v5
    // Strapi requiere formato: { data: { campo: valor } }
    const updateData: any = {
      data: {}
    }
    
    // Mapear campos según la estructura real de Strapi
    // Solo incluir campos que realmente existen y que se están actualizando
    if (body.nombre_libro !== undefined) {
      updateData.data.nombre_libro = body.nombre_libro
      console.log('[API /tienda/productos/[id] PUT] Agregando nombre_libro:', body.nombre_libro)
    }
    if (body.descripcion !== undefined) {
      updateData.data.descripcion = body.descripcion
      console.log('[API /tienda/productos/[id] PUT] Agregando descripcion:', body.descripcion)
    }
    if (body.portada_libro !== undefined) {
      // Para relaciones de Media en Strapi:
      // - number: ID de la imagen existente
      // - null: eliminar la imagen
      // - object con id: usar solo el id
      if (typeof body.portada_libro === 'number') {
        updateData.data.portada_libro = body.portada_libro
        console.log('[API /tienda/productos/[id] PUT] Agregando portada_libro (number):', body.portada_libro)
      } else if (body.portada_libro === null) {
        updateData.data.portada_libro = null
        console.log('[API /tienda/productos/[id] PUT] Eliminando portada_libro (null)')
      } else if (typeof body.portada_libro === 'object' && body.portada_libro.id) {
        updateData.data.portada_libro = body.portada_libro.id
        console.log('[API /tienda/productos/[id] PUT] Agregando portada_libro (object.id):', body.portada_libro.id)
      }
    }
    
    // Validar que hay campos para actualizar
    if (Object.keys(updateData.data).length === 0) {
      console.error('[API /tienda/productos/[id] PUT] ❌ No hay campos para actualizar')
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      )
    }
    
    const endpointUsed = `/api/libros/${productoId}`
    
    console.log('[API /tienda/productos/[id] PUT] Datos a enviar en PUT:', {
      idOriginal: id,
      idNumerico: productoId,
      endpoint: endpointUsed,
      camposActualizados: Object.keys(updateData.data),
      updateDataCompleto: JSON.stringify(updateData, null, 2),
    })
    
    // PASO 5: Enviar actualización a Strapi
    try {
      const response = await strapiClient.put<any>(
        endpointUsed,
        updateData
      )
      
      console.log('[API /tienda/productos/[id] PUT] Respuesta completa del PUT:', {
        tieneData: !!response.data,
        tieneIdDirecto: !!response.id,
        keys: Object.keys(response),
        respuestaCompleta: JSON.stringify(response, null, 2).substring(0, 1000) + '...'
      })
      
      // Strapi puede devolver los datos en response.data o directamente
      const productoActualizado = response.data || response
      
      console.log('[API /tienda/productos/[id] PUT] ✅ Actualización exitosa:', {
        idOriginal: id,
        idNumerico: productoId,
        tieneRespuesta: !!productoActualizado,
        respuestaKeys: productoActualizado ? Object.keys(productoActualizado).slice(0, 10) : [],
        productoActualizado: JSON.stringify(productoActualizado, null, 2).substring(0, 500) + '...'
      })
      
      return NextResponse.json({
        success: true,
        data: productoActualizado,
        message: 'Producto actualizado correctamente',
      }, { status: 200 })
    } catch (putError: any) {
      console.error('[API /tienda/productos/[id] PUT] ❌ Error en PUT a Strapi:', {
        message: putError.message,
        status: putError.status,
        details: putError.details,
        endpoint: endpointUsed,
        idUsado: productoId,
        idOriginal: id,
        updateDataEnviado: JSON.stringify(updateData, null, 2),
        errorCompleto: JSON.stringify(putError, null, 2).substring(0, 1000) + '...'
      })
      
      // Proporcionar información útil sobre el error
      let errorMessage = putError.message || 'Error al actualizar producto'
      
      if (putError.status === 400) {
        errorMessage = `Error de validación: ${putError.details || putError.message}. Verifica que los campos existan en Strapi.`
      } else if (putError.status === 403 || putError.status === 401) {
        errorMessage = 'Error de permisos: El token de autenticación no tiene permisos para actualizar productos.'
      } else if (putError.status === 404) {
        errorMessage = `Producto con ID ${productoId} no encontrado en Strapi.`
      } else if (putError.status === 502) {
        errorMessage = 'Error de conexión con Strapi: El servidor rechazó la petición. Verifica el formato de los datos.'
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          details: putError.details,
          debug: {
            idOriginal: id,
            idNumericoUsado: productoId,
            endpoint: endpointUsed,
            updateDataEnviado: updateData
          },
        },
        { status: putError.status || 500 }
      )
    }
  } catch (error: any) {
    console.error('[API /tienda/productos/[id] PUT] ❌ Error general:', {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack,
    })
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al actualizar producto',
      },
      { status: error.status || 500 }
    )
  }
}
