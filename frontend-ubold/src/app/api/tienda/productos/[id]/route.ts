/**
 * API Route para obtener y actualizar un producto específico desde Strapi por ID
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { logActivity, createLogDescription } from '@/lib/logging'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validar que el ID no sea una palabra reservada (categorias, etiquetas, etc.)
    // Esto previene que rutas como /api/tienda/productos/categorias sean tratadas como IDs de producto
    const reservedWords = ['categorias', 'etiquetas', 'marcas', 'autores', 'obras', 'sellos', 'serie-coleccion', 'colecciones', 'editoriales', 'canales']
    if (reservedWords.includes(id.toLowerCase())) {
      const rutaCorrecta = `/api/tienda/${id}`
      console.warn('[API /tienda/productos/[id] GET] ⚠️ Intento de acceso a ruta reservada:', {
        id,
        rutaIncorrecta: `/api/tienda/productos/${id}`,
        rutaCorrecta,
        mensaje: 'Esta ruta no es válida para productos. Use la ruta correcta para este recurso.'
      })
      return NextResponse.json(
        { 
          success: false,
          error: `Ruta no válida. La ruta /api/tienda/productos/${id} no existe. Use ${rutaCorrecta} en su lugar.`,
          data: null,
          hint: `Si está buscando ${id}, use el endpoint: ${rutaCorrecta}`,
          rutaCorrecta,
        },
        { status: 404 }
      )
    }
    
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
          
          // Registrar log de visualización
          const attrs = producto.attributes || {}
          const data = (attrs && Object.keys(attrs).length > 0) ? attrs : producto
          const nombreProducto = data.nombre_libro || data.isbn_libro || id
          
          logActivity(request as any, {
            accion: 'ver',
            entidad: 'producto',
            entidadId: id,
            descripcion: createLogDescription('ver', 'producto', nombreProducto),
          }).catch(() => {})
          
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

    console.log('[API PUT] 🎯 ID:', id)
    console.log('[API PUT] 📦 Body original:', body)
    console.log('[API PUT] 🔑 Keys del body:', Object.keys(body))

    // CRÍTICO: Verificar que el body no tenga campos en MAYÚSCULAS
    const bodyKeys = Object.keys(body)
    const hasUppercaseKeys = bodyKeys.some(k => k !== k.toLowerCase())
    
    if (hasUppercaseKeys) {
      console.error('[API PUT] 🚨 ALERTA: Body tiene campos en MAYÚSCULAS!')
      console.error('[API PUT] Keys:', bodyKeys)
      
      // Convertir FORZADAMENTE a minúsculas
      const normalizedBody: any = {}
      for (const [key, value] of Object.entries(body)) {
        normalizedBody[key.toLowerCase()] = value
      }
      console.log('[API PUT] ✅ Body normalizado:', normalizedBody)
      // Usar el body normalizado en lugar del original
      Object.assign(body, normalizedBody)
    }

    // Obtener producto
    const endpoint = `/api/libros?filters[id][$eq]=${id}&populate=*`
    const response = await strapiClient.get<any>(endpoint)

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
      return NextResponse.json({
        success: false,
        error: `Producto con ID ${id} no encontrado`
      }, { status: 404 })
    }

    console.log('[API PUT] ✅ Producto encontrado:', producto.documentId)

    // Preparar datos - FORZAR minúsculas SOLO
    const updateData: any = { data: {} }

    // Campos básicos - SOLO minúsculas
    if (body.nombre_libro !== undefined) {
      updateData.data.nombre_libro = body.nombre_libro
    }

    if (body.isbn_libro !== undefined) {
      updateData.data.isbn_libro = body.isbn_libro
    }

    if (body.subtitulo_libro !== undefined) {
      updateData.data.subtitulo_libro = body.subtitulo_libro
    }

    // Descripción - Rich Text Blocks
    if (body.descripcion !== undefined) {
      if (Array.isArray(body.descripcion)) {
        updateData.data.descripcion = body.descripcion
      } else if (typeof body.descripcion === 'string') {
        if (body.descripcion.trim() === '') {
          updateData.data.descripcion = null
        } else {
          updateData.data.descripcion = [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: body.descripcion.trim() }]
            }
          ]
        }
      }
      
      console.log('[API PUT] Descripción formateada:', JSON.stringify(updateData.data.descripcion))
    }

    // Imagen - CRÍTICO: minúsculas
    if (body.portada_libro !== undefined) {
      updateData.data.portada_libro = body.portada_libro
    }

    // Campos numéricos
    if (body.numero_edicion !== undefined && body.numero_edicion !== '') {
      updateData.data.numero_edicion = parseInt(body.numero_edicion)
    }

    if (body.agno_edicion !== undefined && body.agno_edicion !== '') {
      updateData.data.agno_edicion = parseInt(body.agno_edicion)
    }

    // Enumeraciones
    if (body.idioma !== undefined && body.idioma !== '') {
      updateData.data.idioma = body.idioma
    }

    if (body.tipo_libro !== undefined && body.tipo_libro !== '') {
      updateData.data.tipo_libro = body.tipo_libro
    }

    if (body.estado_edicion !== undefined && body.estado_edicion !== '') {
      updateData.data.estado_edicion = body.estado_edicion
    }

    // Estado de publicación - IMPORTANTE: Strapi espera valores con mayúscula inicial
    // Puede venir en body.estado_publicacion o body.data.estado_publicacion
    const estadoPublicacionInput = body.data?.estado_publicacion !== undefined ? body.data.estado_publicacion : body.estado_publicacion
    
    if (estadoPublicacionInput !== undefined && estadoPublicacionInput !== '') {
      // Normalizar a formato con mayúscula inicial para Strapi: "Publicado", "Pendiente", "Borrador"
      let estadoNormalizado: string
      if (typeof estadoPublicacionInput === 'string') {
        const estadoLower = estadoPublicacionInput.toLowerCase()
        estadoNormalizado = estadoLower === 'publicado' ? 'Publicado' :
                           estadoLower === 'pendiente' ? 'Pendiente' :
                           estadoLower === 'borrador' ? 'Borrador' :
                           estadoPublicacionInput // Si ya viene correcto, mantenerlo
      } else {
        estadoNormalizado = estadoPublicacionInput
      }
      updateData.data.estado_publicacion = estadoNormalizado
      console.log('[API PUT] 📝 Estado de publicación actualizado:', estadoNormalizado)
    }

    // Relaciones simples
    if (body.obra) updateData.data.obra = body.obra
    if (body.autor_relacion) updateData.data.autor_relacion = body.autor_relacion
    if (body.editorial) updateData.data.editorial = body.editorial
    if (body.sello) updateData.data.sello = body.sello
    if (body.coleccion) updateData.data.coleccion = body.coleccion

    // Relaciones múltiples
    if (body.canales?.length > 0) updateData.data.canales = body.canales
    if (body.marcas?.length > 0) updateData.data.marcas = body.marcas
    if (body.etiquetas?.length > 0) updateData.data.etiquetas = body.etiquetas
    if (body.categorias_producto?.length > 0) {
      updateData.data.categorias_producto = body.categorias_producto
    }

    // IDs numéricos
    if (body.id_autor) updateData.data.id_autor = parseInt(body.id_autor)
    if (body.id_editorial) updateData.data.id_editorial = parseInt(body.id_editorial)
    if (body.id_sello) updateData.data.id_sello = parseInt(body.id_sello)
    if (body.id_coleccion) updateData.data.id_coleccion = parseInt(body.id_coleccion)
    if (body.id_obra) updateData.data.id_obra = parseInt(body.id_obra)

    // VERIFICACIÓN FINAL antes de enviar
    const finalKeys = Object.keys(updateData.data)
    const stillHasUppercase = finalKeys.some(k => k !== k.toLowerCase())
    
    if (stillHasUppercase) {
      console.error('[API PUT] 🚨 ERROR CRÍTICO: Todavía hay MAYÚSCULAS!')
      console.error('[API PUT] Keys problemáticos:', finalKeys.filter(k => k !== k.toLowerCase()))
      throw new Error('Error interno: Datos con formato incorrecto')
    }

    console.log('[API PUT] 📤 Datos finales a enviar:', JSON.stringify(updateData, null, 2))
    console.log('[API PUT] ✅ Todos los campos en minúsculas')

    // Guardar datos anteriores para el log
    const attrsAnteriores = producto.attributes || {}
    const datosAnteriores = (attrsAnteriores && Object.keys(attrsAnteriores).length > 0) ? attrsAnteriores : producto
    const nombreAnterior = datosAnteriores.nombre_libro || datosAnteriores.isbn_libro || id
    
    // Actualizar
    const updateResponse = await strapiClient.put<any>(
      `/api/libros/${producto.documentId}`,
      updateData
    )

    console.log('[API PUT] ✅ Actualización exitosa')
    
    // Registrar log de actualización
    const nombreNuevo = updateData.data.nombre_libro || nombreAnterior
    logActivity(request, {
      accion: 'actualizar',
      entidad: 'producto',
      entidadId: producto.documentId || id,
      descripcion: createLogDescription('actualizar', 'producto', nombreNuevo, `Producto "${nombreNuevo}"`),
      datosAnteriores: datosAnteriores ? { nombre: nombreAnterior } : undefined,
      datosNuevos: updateData.data,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      data: updateResponse.data || updateResponse
    })

  } catch (error: any) {
    console.error('[API PUT] ❌ ERROR:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.details
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar rol del usuario
    const colaboradorCookie = request.cookies.get('auth_colaborador')?.value
    if (colaboradorCookie) {
      try {
        const colaborador = JSON.parse(colaboradorCookie)
        if (colaborador.rol !== 'super_admin') {
          return NextResponse.json({
            success: false,
            error: 'No tienes permisos para eliminar productos'
          }, { status: 403 })
        }
      } catch (e) {
        // Si hay error parseando, continuar (podría ser que no esté autenticado)
      }
    }

    const { id } = await params
    console.log('[API Productos DELETE] 🗑️ Eliminando producto:', id)

    const productoEndpoint = '/api/libros'

    // Primero obtener el producto de Strapi para verificar estado_publicacion
    let productoStrapi: any = null
    
    try {
      const productoResponse = await strapiClient.get<any>(`${productoEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let productos: any[] = []
      if (Array.isArray(productoResponse)) {
        productos = productoResponse
      } else if (productoResponse.data && Array.isArray(productoResponse.data)) {
        productos = productoResponse.data
      } else if (productoResponse.data) {
        productos = [productoResponse.data]
      }
      productoStrapi = productos[0]
    } catch (error: any) {
      // Si falla, intentar obtener todas y buscar
      console.warn('[API Productos DELETE] ⚠️ No se pudo obtener producto de Strapi, intentando búsqueda alternativa:', error.message)
      try {
        const allResponse = await strapiClient.get<any>(`${productoEndpoint}?populate=*&pagination[pageSize]=1000`)
        const allProductos = Array.isArray(allResponse) 
          ? allResponse 
          : (allResponse.data && Array.isArray(allResponse.data) ? allResponse.data : [])
        
        productoStrapi = allProductos.find((p: any) => 
          p.id?.toString() === id || 
          p.documentId === id ||
          (p.attributes && (p.attributes.id?.toString() === id || p.attributes.documentId === id))
        )
      } catch (searchError: any) {
        console.error('[API Productos DELETE] Error en búsqueda alternativa:', searchError.message)
      }
    }

    if (!productoStrapi) {
      return NextResponse.json({
        success: false,
        error: 'Producto no encontrado'
      }, { status: 404 })
    }

    // Obtener estado_publicacion del producto
    const attrs = productoStrapi.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (productoStrapi as any)
    let estadoPublicacion = getField(data, 'estado_publicacion', 'estadoPublicacion', 'ESTADO_PUBLICACION') || ''
    
    // Normalizar estado a minúsculas para comparación
    if (estadoPublicacion) {
      estadoPublicacion = estadoPublicacion.toLowerCase()
    }

    // En Strapi v4, usar documentId (string) para eliminar, no el id numérico
    const productoDocumentId = productoStrapi.documentId || productoStrapi.data?.documentId || productoStrapi.id?.toString() || id
    console.log('[API Productos DELETE] Usando documentId para eliminar:', productoDocumentId)

    await strapiClient.delete(`/api/libros/${productoDocumentId}`)
    
    if (estadoPublicacion === 'publicado') {
      console.log('[API Productos DELETE] ✅ Producto eliminado en Strapi. El lifecycle eliminará de WooCommerce si estaba publicado.')
    } else {
      console.log('[API Productos DELETE] ✅ Producto eliminado en Strapi (solo Strapi, no estaba publicada en WooCommerce)')
    }
    
    return NextResponse.json({
      success: true,
      message: estadoPublicacion === 'publicado' 
        ? 'Producto eliminado exitosamente en Strapi. El lifecycle eliminará de WooCommerce.' 
        : 'Producto eliminado exitosamente en Strapi'
    })
  } catch (error: any) {
    console.error('[API Productos DELETE] ❌ Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al eliminar el producto'
    }, { status: 500 })
  }
}

// Helper para obtener campo con múltiples variaciones
function getField(obj: any, ...fieldNames: string[]): any {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}
