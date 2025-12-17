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
    
    // Intentar primero con el ID numérico
    let endpointUsed = `/api/libros/${id}`
    let response: any
    
    try {
      response = await strapiClient.get<any>(
        `${endpointUsed}?populate=*`
      )
      
      // Si la respuesta tiene data, retornarla
      if (response.data) {
        console.log('[API /tienda/productos/[id]] Producto obtenido por ID:', {
          id,
          endpoint: endpointUsed,
          hasData: !!response.data,
        })
        
        return NextResponse.json({
          success: true,
          data: response.data,
        }, { status: 200 })
      }
    } catch (idError: any) {
      console.log('[API /tienda/productos/[id]] Error con ID numérico, intentando con documentId:', {
        id,
        error: idError.message,
      })
    }
    
    // Si falla con ID numérico, intentar buscar por documentId
    // Primero obtener todos los productos y buscar el que coincida
    try {
      const allProducts = await strapiClient.get<any>(
        `/api/libros?populate=*&pagination[pageSize]=1000`
      )
      
      const productos = Array.isArray(allProducts.data) ? allProducts.data : []
      const productoEncontrado = productos.find((p: any) => 
        p.id?.toString() === id || 
        p.documentId === id ||
        p.id === parseInt(id)
      )
      
      if (productoEncontrado) {
        console.log('[API /tienda/productos/[id]] Producto encontrado por búsqueda:', {
          id,
          productoId: productoEncontrado.id,
          documentId: productoEncontrado.documentId,
        })
        
        return NextResponse.json({
          success: true,
          data: productoEncontrado,
        }, { status: 200 })
      }
    } catch (searchError: any) {
      console.error('[API /tienda/productos/[id]] Error en búsqueda:', searchError.message)
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
    console.error('[API /tienda/productos/[id]] Error al obtener producto:', {
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
    
    // Obtener el ID real del producto (puede ser numérico o documentId)
    let productoId = id
    
    // Si el ID no es numérico, buscar el producto para obtener su ID numérico
    if (isNaN(parseInt(id))) {
      const allProducts = await strapiClient.get<any>(
        `/api/libros?populate=*&pagination[pageSize]=1000`
      )
      const productos = Array.isArray(allProducts.data) ? allProducts.data : []
      const productoEncontrado = productos.find((p: any) => 
        p.id?.toString() === id || 
        p.documentId === id
      )
      
      if (!productoEncontrado) {
        return NextResponse.json(
          { success: false, error: 'Producto no encontrado' },
          { status: 404 }
        )
      }
      
      productoId = productoEncontrado.id.toString()
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
