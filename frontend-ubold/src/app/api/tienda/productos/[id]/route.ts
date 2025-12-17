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
    } catch (getError: any) {
      console.error('[API /tienda/productos/[id]] Error al obtener producto actual:', getError.message)
    }
    
    // Preparar datos para Strapi
    // En Strapi v4/v5, cuando los datos vienen directamente (sin attributes),
    // el formato de actualización también debe ser directo dentro de { data: { ... } }
    const updateData: any = {
      data: {}
    }
    
    if (body.nombre_libro !== undefined) {
      updateData.data.nombre_libro = body.nombre_libro
    }
    if (body.descripcion !== undefined) {
      updateData.data.descripcion = body.descripcion
    }
    if (body.portada_libro !== undefined) {
      // Si viene un ID de imagen, asignarlo directamente
      if (typeof body.portada_libro === 'number') {
        updateData.data.portada_libro = body.portada_libro
      } else if (body.portada_libro === null) {
        updateData.data.portada_libro = null
      }
    }
    
    console.log('[API /tienda/productos/[id]] Actualizando producto:', {
      id: productoId,
      endpoint: endpointUsed,
      updateData,
      productoActual: productoActual ? {
        tieneAttributes: !!productoActual.attributes,
        keys: Object.keys(productoActual).slice(0, 10),
      } : null,
    })
    
    const response = await strapiClient.put<any>(
      endpointUsed,
      updateData
    )
    
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
