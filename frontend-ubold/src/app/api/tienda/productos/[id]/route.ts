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
    
    // PASO 1: Usar filtros para obtener el producto (Strapi v5 requiere documentId)
    if (!isNaN(parseInt(id))) {
      try {
        console.log('[API /tienda/productos/[id] GET] 🔍 Buscando con filtro:', {
          idBuscado: id,
          endpoint: `/api/libros?filters[id][$eq]=${id}&populate=*`
        })
        
        const filteredResponse = await strapiClient.get<any>(
          `/api/libros?filters[id][$eq]=${id}&populate=*`
        )
        
        // Extraer producto de la respuesta filtrada
        let producto: any
        if (Array.isArray(filteredResponse)) {
          producto = filteredResponse[0]
        } else if (filteredResponse.data && Array.isArray(filteredResponse.data)) {
          producto = filteredResponse.data[0]
        } else if (filteredResponse.data) {
          producto = filteredResponse.data
        } else {
          producto = filteredResponse
        }
        
        if (producto && (producto.id || producto.documentId)) {
          console.log('[API /tienda/productos/[id] GET] ✅ Producto encontrado con filtro:', {
            idBuscado: id,
            productoId: producto.id,
            documentId: producto.documentId,
          })
          
          return NextResponse.json({
            success: true,
            data: producto,
          }, { status: 200 })
        }
      } catch (filterError: any) {
        // Si falla con filtro, continuar a buscar en lista completa
        console.warn('[API /tienda/productos/[id] GET] ⚠️ Error al obtener con filtro:', {
          status: filterError.status,
          message: filterError.message,
          continuandoConBusqueda: true,
        })
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
  try {
    const { id } = await params
    const body = await request.json()

    console.log('[API PUT] 🎯 INICIANDO - ID recibido:', id)
    console.log('[API PUT] 🎯 Body recibido:', body)

    // CRÍTICO: Usar filtro en lugar de GET directo (Strapi v5)
    const endpoint = `/api/libros?filters[id][$eq]=${id}&populate=*`
    console.log('[API PUT] 🌐 Endpoint con FILTRO:', endpoint)

    const response = await strapiClient.get<any>(endpoint)

    console.log('[API PUT] 📦 Respuesta completa:', JSON.stringify(response, null, 2))

    // Extraer producto
    let producto: any
    if (Array.isArray(response)) {
      producto = response[0]
    } else if (response.data && Array.isArray(response.data)) {
      producto = response.data[0]
    } else if (response.data) {
      producto = response.data
    } else {
      producto = response
    }

    if (!producto || !producto.documentId) {
      console.error('[API PUT] ❌ No se encontró producto o falta documentId')
      return NextResponse.json({
        success: false,
        error: `Producto con ID ${id} no encontrado`,
        debug: { response }
      }, { status: 404 })
    }

    console.log('[API PUT] ✅ Producto encontrado:', {
      id: producto.id,
      documentId: producto.documentId,
      nombre: producto.nombre_libro
    })

    // Preparar actualización
    const updateData: any = { data: {} }
    
    if (body.nombre_libro !== undefined) updateData.data.nombre_libro = body.nombre_libro
    
    // Descripción - Rich text blocks requiere formato especial
    if (body.descripcion !== undefined) {
      if (typeof body.descripcion === 'string') {
        // Si viene como string, convertir a formato blocks
        updateData.data.descripcion = [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: body.descripcion
              }
            ]
          }
        ]
      } else {
        // Si ya viene en formato blocks, usar directamente
        updateData.data.descripcion = body.descripcion
      }
      
      console.log('[API PUT] Descripción a enviar:', {
        tipoOriginal: typeof body.descripcion,
        valorOriginal: body.descripcion,
        tipoFinal: typeof updateData.data.descripcion,
        valorFinal: JSON.stringify(updateData.data.descripcion)
      })
    }
    
    if (body.portada_libro !== undefined) updateData.data.portada_libro = body.portada_libro
    
    // NOTA: precio_base NO existe en la colección "libros"
    // Los precios se manejan en la colección separada "Precio" (relación oneToMany)

    console.log('[API PUT] 📤 PUT a documentId:', producto.documentId)
    console.log('[API PUT] 📤 Datos:', updateData)

    // CRÍTICO: Usar documentId para el PUT
    const updateResponse = await strapiClient.put<any>(
      `/api/libros/${producto.documentId}`,
      updateData
    )

    console.log('[API PUT] ✅ PUT exitoso:', updateResponse)

    return NextResponse.json({
      success: true,
      data: updateResponse.data || updateResponse
    })

  } catch (error: any) {
    console.error('[API PUT] ❌ ERROR:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
