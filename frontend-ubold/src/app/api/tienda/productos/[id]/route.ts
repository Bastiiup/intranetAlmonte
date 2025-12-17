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
  try {
    const { id } = await params
    const body = await request.json()

    console.log('[API PUT] 🔍 Iniciando PUT para ID:', id)

    // PASO 1: Obtener el producto usando filtro (Strapi v5 requiere documentId para GET individual)
    const response = await strapiClient.get<any>(
      `/api/libros?filters[id][$eq]=${id}&populate=*`
    )

    console.log('[API PUT] 📦 Respuesta de Strapi:', JSON.stringify(response, null, 2))

    // Extraer el producto de la respuesta (manejar diferentes estructuras)
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
      console.error('[API PUT] ❌ Producto no encontrado o sin documentId')
      return NextResponse.json({
        success: false,
        error: `Producto con ID ${id} no encontrado`
      }, { status: 404 })
    }

    console.log('[API PUT] ✅ Producto encontrado:', {
      id: producto.id,
      documentId: producto.documentId,
      nombre: producto.nombre_libro
    })

    // PASO 2: Preparar datos para actualizar
    const updateData: any = { data: {} }
    
    if (body.nombre_libro !== undefined) {
      updateData.data.nombre_libro = body.nombre_libro
    }
    if (body.descripcion !== undefined) {
      updateData.data.descripcion = body.descripcion
    }
    if (body.portada_libro !== undefined) {
      updateData.data.portada_libro = body.portada_libro
    }

    console.log('[API PUT] 📤 Enviando PUT a documentId:', producto.documentId)
    console.log('[API PUT] 📤 Datos a enviar:', JSON.stringify(updateData, null, 2))

    // PASO 3: Actualizar usando documentId (requerido por Strapi v5)
    const updateResponse = await strapiClient.put<any>(
      `/api/libros/${producto.documentId}`,
      updateData
    )

    console.log('[API PUT] ✅ Respuesta del PUT:', JSON.stringify(updateResponse, null, 2))

    return NextResponse.json({
      success: true,
      data: updateResponse.data || updateResponse
    })

  } catch (error: any) {
    console.error('[API PUT] ❌ ERROR GENERAL:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      details: error
    }, { status: 500 })
  }
}
