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
    const { id } = await params
    console.log('[API /tienda/productos/[id] PUT] Params recibidos:', { id, tipoId: typeof id })
    
    let body: any = {}
    try {
      const bodyText = await request.text()
      console.log('[API /tienda/productos/[id] PUT] Body recibido (texto):', bodyText)
      body = JSON.parse(bodyText)
      console.log('[API /tienda/productos/[id] PUT] Body recibido (JSON):', body)
    } catch (parseError: any) {
      console.error('[API /tienda/productos/[id] PUT] Error al parsear body:', parseError)
      return NextResponse.json(
        { success: false, error: 'Error al parsear el cuerpo de la petición' },
        { status: 400 }
      )
    }
    
    console.log('[API /tienda/productos/[id] PUT] Iniciando actualización:', {
      idRecibido: id,
      tipoId: typeof id,
      esNumerico: !isNaN(parseInt(id)),
      camposRecibidos: Object.keys(body),
      bodyRecibido: body,
      urlCompleta: request.url,
      method: request.method,
    })
    
    // PASO 1: Obtener el ID numérico real del producto (Strapi requiere ID numérico para PUT)
    // Estrategia: 
    // 1. Intentar obtener directamente por ID numérico primero (más eficiente)
    // 2. Si falla, buscar en lista completa (por si es documentId)
    let productoId: number | null = null
    let productoActual: any = null
    
    // Intentar obtener directamente por ID numérico primero
    if (!isNaN(parseInt(id))) {
      try {
        console.log('[API /tienda/productos/[id] PUT] Intentando obtener producto directamente por ID:', id)
        const directResponse = await strapiClient.get<any>(`/api/libros/${id}?populate=*`)
        const producto = directResponse.data || directResponse
        
        if (producto && producto.id) {
          productoActual = producto
          productoId = producto.id
          console.log('[API /tienda/productos/[id] PUT] ✅ Producto encontrado por ID directo:', {
            idBuscado: id,
            productoId: productoId,
            documentId: producto.documentId,
          })
        }
      } catch (directError: any) {
        console.log('[API /tienda/productos/[id] PUT] ⚠️ No se pudo obtener por ID directo, buscando en lista:', {
          status: directError.status,
          message: directError.message,
        })
      }
    }
    
    // Si no se encontró por ID directo, buscar en lista completa
    if (!productoActual) {
      try {
        console.log('[API /tienda/productos/[id] PUT] Buscando producto en lista completa...')
        
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
      
      console.log('[API /tienda/productos/[id] PUT] Estructura de respuesta procesada:', {
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
        idBuscado: id,
        primerosIds: productos.slice(0, 5).map((p: any) => ({
          id: p.id,
          documentId: p.documentId,
          nombre: p.nombre_libro || 'Sin nombre',
        })),
      })
      
      // Buscar por id numérico o documentId
      // IMPORTANTE: Los datos pueden venir directamente o dentro de attributes
      const idStr = id.toString()
      const idNum = parseInt(idStr)
      
      console.log('[API /tienda/productos/[id] PUT] Buscando producto con:', {
        idBuscado: id,
        idStr,
        idNum,
        esNumerico: !isNaN(idNum),
        totalProductos: productos.length,
        primerosProductos: productos.slice(0, 3).map((p: any) => ({
          id: p.id,
          documentId: p.documentId,
          idTipo: typeof p.id,
          documentIdTipo: typeof p.documentId,
        })),
      })
      
      const productoEncontrado = productos.find((p: any) => {
        // Los datos vienen directamente (sin attributes según la estructura que vimos)
        const pId = p.id
        const pDocId = p.documentId
        
        // Comparar de múltiples formas
        const encontrado = (
          pId?.toString() === idStr ||
          pDocId?.toString() === idStr ||
          (!isNaN(idNum) && pId === idNum) ||
          (!isNaN(idNum) && pId?.toString() === idNum.toString())
        )
        
        if (encontrado) {
          console.log('[API /tienda/productos/[id] PUT] ✅ Coincidencia encontrada:', {
            idBuscado: id,
            productoId: pId,
            documentId: pDocId,
            productoCompleto: p,
          })
        }
        
        return encontrado
      })
      
        // Si encontramos el producto, usar su ID directamente
        if (!productoEncontrado) {
          const idsDisponibles = productos.map((p: any) => ({
            id: p.id,
            documentId: p.documentId,
            nombre: p.nombre_libro || 'Sin nombre',
          }))
          
          console.error('[API /tienda/productos/[id] PUT] ❌ Producto no encontrado en lista:', {
            idBuscado: id,
            tipoId: typeof id,
            esNumerico: !isNaN(parseInt(id)),
            totalProductos: productos.length,
            idsDisponibles: idsDisponibles.slice(0, 10),
            muestraProductos: productos.slice(0, 3).map((p: any) => ({
              id: p.id,
              documentId: p.documentId,
              keys: Object.keys(p).slice(0, 10),
            })),
          })
          return NextResponse.json(
            { 
              success: false, 
              error: `Producto con ID "${id}" no encontrado`,
              debug: {
                idBuscado: id,
                tipoId: typeof id,
                totalProductos: productos.length,
                idsDisponibles: idsDisponibles.slice(0, 10),
                mensaje: `IDs disponibles: ${idsDisponibles.map((p: any) => `id:${p.id} (${p.nombre}) o documentId:${p.documentId}`).join(', ')}`,
              },
            },
            { status: 404 }
          )
        }
        
        productoActual = productoEncontrado
        productoId = productoEncontrado.id
        
        console.log('[API /tienda/productos/[id] PUT] Producto encontrado en lista, usando ID:', {
          idOriginal: id,
          idNumerico: productoId,
          documentId: productoEncontrado.documentId,
        })
      } catch (searchError: any) {
        console.error('[API /tienda/productos/[id] PUT] ❌ Error al buscar producto en lista:', {
          message: searchError.message,
          status: searchError.status,
          details: searchError.details,
        })
        return NextResponse.json(
          { success: false, error: `Error al buscar producto: ${searchError.message}` },
          { status: searchError.status || 500 }
        )
      }
    }
    
    // Verificar que encontramos el producto
    if (!productoActual || !productoId) {
      console.error('[API /tienda/productos/[id] PUT] ❌ Producto no encontrado después de todas las búsquedas:', {
        idBuscado: id,
        tieneProducto: !!productoActual,
        tieneId: !!productoId,
      })
      return NextResponse.json(
        { 
          success: false, 
          error: `Producto con ID "${id}" no encontrado en Strapi`,
          debug: {
            idOriginal: id,
            idNumericoUsado: productoId,
            endpoint: `/api/libros/${productoId || id}`,
          },
        },
        { status: 404 }
      )
    }
    
    if (!productoId || isNaN(productoId)) {
      console.error('[API /tienda/productos/[id] PUT] ❌ ID numérico inválido:', {
        productoId,
        tipo: typeof productoId,
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
    })
    
    // PASO 2: Preparar datos para Strapi v4/v5
    // Strapi requiere formato: { data: { campo: valor } }
    const updateData: any = {
      data: {}
    }
    
    // Mapear campos según la estructura real de Strapi
    // Solo incluir campos que realmente existen y que se están actualizando
    if (body.nombre_libro !== undefined) {
      updateData.data.nombre_libro = body.nombre_libro
    }
    if (body.descripcion !== undefined) {
      updateData.data.descripcion = body.descripcion
    }
    if (body.portada_libro !== undefined) {
      // Para relaciones de Media en Strapi:
      // - number: ID de la imagen existente
      // - null: eliminar la imagen
      // - object con id: usar solo el id
      if (typeof body.portada_libro === 'number') {
        updateData.data.portada_libro = body.portada_libro
      } else if (body.portada_libro === null) {
        updateData.data.portada_libro = null
      } else if (typeof body.portada_libro === 'object' && body.portada_libro.id) {
        updateData.data.portada_libro = body.portada_libro.id
      }
    }
    
    // Validar que hay campos para actualizar
    if (Object.keys(updateData.data).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      )
    }
    
    // Validar que tenemos un ID numérico válido antes de continuar
    if (!productoId || isNaN(Number(productoId))) {
      console.error('[API /tienda/productos/[id] PUT] ❌ ID numérico inválido:', {
        idOriginal: id,
        productoId,
        tipo: typeof productoId,
      })
      return NextResponse.json(
        { success: false, error: `ID numérico inválido: ${productoId}` },
        { status: 400 }
      )
    }
    
    const endpointUsed = `/api/libros/${productoId}`
    
    console.log('[API /tienda/productos/[id] PUT] Enviando actualización a Strapi:', {
      idOriginal: id,
      idNumerico: productoId,
      endpoint: endpointUsed,
      camposActualizados: Object.keys(updateData.data),
      updateData: JSON.stringify(updateData, null, 2),
    })
    
    // PASO 3: Enviar actualización a Strapi
    let response: any
    try {
      response = await strapiClient.put<any>(
        endpointUsed,
        updateData
      )
      
      // Strapi puede devolver los datos en response.data o directamente
      const productoActualizado = response.data || response
      
      console.log('[API /tienda/productos/[id] PUT] ✅ Actualización exitosa:', {
        idOriginal: id,
        idNumerico: productoId,
        tieneRespuesta: !!productoActualizado,
        respuestaKeys: productoActualizado ? Object.keys(productoActualizado).slice(0, 10) : [],
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
        response: putError.response,
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
