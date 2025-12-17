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
    })
    
    // Intentar primero con el ID numérico directamente
    if (!isNaN(parseInt(id))) {
      const endpointUsed = `/api/libros/${id}?populate=*`
      
      try {
        const response = await strapiClient.get<any>(endpointUsed)
        
        // Strapi puede devolver los datos directamente o en response.data
        const producto = response.data || response
        
        if (producto) {
          console.log('[API /tienda/productos/[id] GET] Producto obtenido exitosamente:', {
            id,
            tieneId: !!producto.id,
            tieneDocumentId: !!producto.documentId,
          })
          
          return NextResponse.json({
            success: true,
            data: producto,
          }, { status: 200 })
        }
      } catch (idError: any) {
        console.error('[API /tienda/productos/[id] GET] Error con ID numérico:', {
          id,
          status: idError.status,
          message: idError.message,
          details: idError.details,
        })
        
        // Si es 404, retornar directamente
        if (idError.status === 404) {
          return NextResponse.json(
            { 
              success: false,
              error: `Producto con ID ${id} no encontrado`,
              data: null,
            },
            { status: 404 }
          )
        }
        
        // Si es 502, puede ser un problema de Strapi, intentar búsqueda alternativa
        if (idError.status === 502) {
          console.log('[API /tienda/productos/[id] GET] Error 502, intentando búsqueda alternativa...')
        }
      }
    }
    
    // Si falla o el ID no es numérico, buscar en todos los productos
    try {
      console.log('[API /tienda/productos/[id] GET] Buscando producto en lista completa...')
      
      const allProducts = await strapiClient.get<any>(
        `/api/libros?populate=*&pagination[pageSize]=1000`
      )
      
      const productos = Array.isArray(allProducts.data) ? allProducts.data : (allProducts.data ? [allProducts.data] : [])
      
      console.log('[API /tienda/productos/[id] GET] Productos obtenidos:', {
        total: productos.length,
        primerProducto: productos[0] ? {
          id: productos[0].id,
          documentId: productos[0].documentId,
        } : null,
      })
      
      const productoEncontrado = productos.find((p: any) => 
        p.id?.toString() === id || 
        p.documentId === id ||
        p.documentId?.toString() === id ||
        (!isNaN(parseInt(id)) && p.id === parseInt(id))
      )
      
      if (productoEncontrado) {
        console.log('[API /tienda/productos/[id] GET] Producto encontrado por búsqueda:', {
          idBuscado: id,
          productoId: productoEncontrado.id,
          documentId: productoEncontrado.documentId,
        })
        
        return NextResponse.json({
          success: true,
          data: productoEncontrado,
        }, { status: 200 })
      } else {
        console.error('[API /tienda/productos/[id] GET] Producto no encontrado:', {
          idBuscado: id,
          totalProductos: productos.length,
          idsDisponibles: productos.slice(0, 5).map((p: any) => ({
            id: p.id,
            documentId: p.documentId,
          })),
        })
      }
    } catch (searchError: any) {
      console.error('[API /tienda/productos/[id] GET] Error en búsqueda:', {
        message: searchError.message,
        status: searchError.status,
        details: searchError.details,
      })
    }
    
    // Si no se encontró, retornar error
    return NextResponse.json(
      { 
        success: false,
        error: `Producto con ID ${id} no encontrado`,
        data: null,
      },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('[API /tienda/productos/[id] GET] Error general:', {
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
      bodyRecibido: body,
    })
    
    // Obtener el ID real del producto (puede ser numérico o documentId)
    let productoId = id
    let productoEncontrado: any = null
    
    // Si el ID no es numérico, buscar el producto para obtener su ID numérico
    if (isNaN(parseInt(id))) {
      console.log('[API /tienda/productos/[id] PUT] ID no es numérico, buscando producto...')
      
      try {
        const allProducts = await strapiClient.get<any>(
          `/api/libros?populate=*&pagination[pageSize]=1000`
        )
        const productos = Array.isArray(allProducts.data) ? allProducts.data : []
        productoEncontrado = productos.find((p: any) => 
          p.id?.toString() === id || 
          p.documentId === id ||
          p.documentId?.toString() === id
        )
        
        if (!productoEncontrado) {
          console.error('[API /tienda/productos/[id] PUT] Producto no encontrado con ID:', id)
          return NextResponse.json(
            { success: false, error: `Producto con ID ${id} no encontrado` },
            { status: 404 }
          )
        }
        
        productoId = productoEncontrado.id.toString()
        console.log('[API /tienda/productos/[id] PUT] Producto encontrado:', {
          idOriginal: id,
          idNumerico: productoId,
          documentId: productoEncontrado.documentId,
        })
      } catch (searchError: any) {
        console.error('[API /tienda/productos/[id] PUT] Error al buscar producto:', searchError.message)
        return NextResponse.json(
          { success: false, error: `Error al buscar producto: ${searchError.message}` },
          { status: 500 }
        )
      }
    } else {
      // Si es numérico, verificar que el producto existe
      try {
        const getResponse = await strapiClient.get<any>(`/api/libros/${id}?populate=*`)
        productoEncontrado = getResponse.data || getResponse
        productoId = id
      } catch (getError: any) {
        console.error('[API /tienda/productos/[id] PUT] Producto no encontrado con ID numérico:', id)
        return NextResponse.json(
          { success: false, error: `Producto con ID ${id} no encontrado` },
          { status: 404 }
        )
      }
    }
    
    const endpointUsed = `/api/libros/${productoId}`
    
    // Obtener el producto actual para ver su estructura
    let productoActual: any = null
    try {
      const getResponse = await strapiClient.get<any>(`${endpointUsed}?populate=*`)
      productoActual = getResponse.data || getResponse
      
      console.log('[API /tienda/productos/[id]] Estructura del producto actual:', {
        tieneAttributes: !!productoActual?.attributes,
        keysDirectas: productoActual ? Object.keys(productoActual).filter(k => !['id', 'documentId', 'createdAt', 'updatedAt'].includes(k)).slice(0, 10) : [],
        keysAttributes: productoActual?.attributes ? Object.keys(productoActual.attributes).slice(0, 10) : [],
      })
    } catch (getError: any) {
      console.error('[API /tienda/productos/[id]] Error al obtener producto actual:', getError.message)
    }
    
    // Preparar datos para Strapi
    // Según la estructura del debug, los datos vienen directamente (sin attributes)
    // Pero Strapi espera el formato { data: { campo: valor } } para actualizaciones
    const updateData: any = {
      data: {}
    }
    
    // Mapear campos según la estructura real de Strapi
    if (body.nombre_libro !== undefined) {
      updateData.data.nombre_libro = body.nombre_libro
    }
    if (body.descripcion !== undefined) {
      updateData.data.descripcion = body.descripcion
    }
    if (body.portada_libro !== undefined) {
      // Para imágenes en Strapi, se puede asignar:
      // - Un número (ID de la imagen existente)
      // - null (para eliminar la imagen)
      // - Un objeto con id (para relaciones)
      if (typeof body.portada_libro === 'number') {
        // Si es un número, es el ID de la imagen
        updateData.data.portada_libro = body.portada_libro
      } else if (body.portada_libro === null) {
        updateData.data.portada_libro = null
      } else if (typeof body.portada_libro === 'object' && body.portada_libro.id) {
        // Si es un objeto con id, usar solo el id
        updateData.data.portada_libro = body.portada_libro.id
      }
    }
    
    console.log('[API /tienda/productos/[id]] Actualizando producto:', {
      id: productoId,
      endpoint: endpointUsed,
      bodyRecibido: body,
      updateData,
    })
    
    // Intentar actualizar con formato estándar de Strapi
    // Strapi espera: { data: { campo: valor } }
    let response: any
    try {
      response = await strapiClient.put<any>(
        endpointUsed,
        updateData
      )
      
      console.log('[API /tienda/productos/[id]] Actualización exitosa:', {
        hasResponse: !!response,
        hasData: !!response?.data,
      })
    } catch (putError: any) {
      console.error('[API /tienda/productos/[id]] Error en PUT:', {
        message: putError.message,
        status: putError.status,
        details: putError.details,
        endpoint: endpointUsed,
        updateDataEnviado: JSON.stringify(updateData, null, 2),
      })
      
      // Si el error es 502 (Bad Gateway), puede ser un problema de formato o de Strapi
      // Intentar obtener más información del error
      if (putError.status === 502) {
        // El 502 generalmente indica que Strapi rechazó la petición
        // Puede ser por formato incorrecto o campo que no existe
        console.error('[API /tienda/productos/[id]] Error 502 - Posibles causas:', {
          mensaje: 'Strapi rechazó la petición. Verificar:',
          causas: [
            '1. El campo no existe en el schema de Strapi',
            '2. El formato de datos es incorrecto',
            '3. El token de autenticación no tiene permisos',
            '4. El tipo de dato no coincide con el schema',
          ],
          camposIntentados: Object.keys(updateData.data),
          estructuraProducto: productoActual ? {
            camposDisponibles: Object.keys(productoActual).filter(k => 
              !['id', 'documentId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'localizations'].includes(k)
            ),
          } : 'No se pudo obtener estructura',
        })
      }
      
      throw putError
    }
    
    return NextResponse.json({
      success: true,
      data: response.data || response,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /tienda/productos/[id]] Error al actualizar producto:', {
      message: error.message,
      status: error.status,
      details: error.details,
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
