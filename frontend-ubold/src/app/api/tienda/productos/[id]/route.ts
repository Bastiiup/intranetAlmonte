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
      
      const productos = Array.isArray(allProducts.data) 
        ? allProducts.data 
        : (allProducts.data ? [allProducts.data] : [])
      
      console.log('[API /tienda/productos/[id] GET] Lista obtenida:', {
        total: productos.length,
        idBuscado: id,
        primerosIds: productos.slice(0, 5).map((p: any) => ({
          id: p.id,
          documentId: p.documentId,
        })),
      })
      
      // Buscar por id numérico o documentId
      const productoEncontrado = productos.find((p: any) => {
        const pId = p.id?.toString()
        const pDocId = p.documentId?.toString()
        const idStr = id.toString()
        
        // Comparar como string y como número
        return (
          pId === idStr ||
          pDocId === idStr ||
          (!isNaN(parseInt(idStr)) && p.id === parseInt(idStr)) ||
          (!isNaN(parseInt(idStr)) && p.documentId === idStr)
        )
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
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log('[API /tienda/productos/[id] PUT] Iniciando actualización:', {
      idRecibido: id,
      tipoId: typeof id,
      esNumerico: !isNaN(parseInt(id)),
      camposRecibidos: Object.keys(body),
      bodyRecibido: body,
    })
    
    // PASO 1: Obtener el ID numérico real del producto (Strapi requiere ID numérico para PUT)
    // Estrategia: Siempre buscar en lista completa para encontrar el producto
    // porque el ID puede ser numérico o documentId
    let productoId: number | null = null
    let productoActual: any = null
    
    try {
      console.log('[API /tienda/productos/[id] PUT] Buscando producto en lista completa...')
      
      const allProducts = await strapiClient.get<any>(
        `/api/libros?populate=*&pagination[pageSize]=1000`
      )
      const productos = Array.isArray(allProducts.data) ? allProducts.data : []
      
      console.log('[API /tienda/productos/[id] PUT] Productos obtenidos:', {
        total: productos.length,
        idBuscado: id,
        primerosIds: productos.slice(0, 5).map((p: any) => ({
          id: p.id,
          documentId: p.documentId,
        })),
      })
      
      // Buscar por id numérico o documentId
      const productoEncontrado = productos.find((p: any) => {
        const pId = p.id?.toString()
        const pDocId = p.documentId?.toString()
        const idStr = id.toString()
        
        return (
          pId === idStr ||
          pDocId === idStr ||
          (!isNaN(parseInt(idStr)) && p.id === parseInt(idStr)) ||
          p.documentId === idStr
        )
      })
      
      if (!productoEncontrado) {
        const idsDisponibles = productos.map((p: any) => ({
          id: p.id,
          documentId: p.documentId,
          nombre: p.nombre_libro || p.NOMBRE_LIBRO || p.nombreLibro || 'Sin nombre',
        }))
        
        console.error('[API /tienda/productos/[id] PUT] ❌ Producto no encontrado:', {
          idBuscado: id,
          tipoId: typeof id,
          esNumerico: !isNaN(parseInt(id)),
          totalProductos: productos.length,
          idsDisponibles: idsDisponibles.slice(0, 10),
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
              mensaje: `IDs disponibles: ${idsDisponibles.map(p => `id:${p.id} (${p.nombre}) o documentId:${p.documentId}`).join(', ')}`,
            },
          },
          { status: 404 }
        )
      }
      
      productoActual = productoEncontrado
      productoId = productoEncontrado.id
      
      if (!productoId || isNaN(productoId)) {
        console.error('[API /tienda/productos/[id] PUT] ❌ Producto encontrado pero sin ID numérico válido:', {
          productoEncontrado,
        })
        return NextResponse.json(
          { success: false, error: 'El producto encontrado no tiene un ID numérico válido' },
          { status: 500 }
        )
      }
      
      console.log('[API /tienda/productos/[id] PUT] ✅ Producto encontrado:', {
        idOriginal: id,
        idNumerico: productoId,
        documentId: productoActual?.documentId,
        tieneId: !!productoActual?.id,
      })
    } catch (searchError: any) {
      console.error('[API /tienda/productos/[id] PUT] ❌ Error al buscar producto:', {
        message: searchError.message,
        status: searchError.status,
        details: searchError.details,
      })
      return NextResponse.json(
        { success: false, error: `Error al buscar producto: ${searchError.message}` },
        { status: searchError.status || 500 }
      )
    }
    
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
