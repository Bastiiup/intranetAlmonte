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

    console.log('[API PUT] 🎯 ID:', id)
    console.log('[API PUT] 📦 Body original:', body)
    console.log('[API PUT] 🔑 Keys del body:', Object.keys(body))

    // CRÍTICO: Verificar que el body no tenga campos en MAYÚSCULAS
    // Normalizar camelCase a snake_case (ej: rawWooData -> raw_woo_data)
    const bodyKeys = Object.keys(body)
    const hasUppercaseKeys = bodyKeys.some(k => k !== k.toLowerCase())
    
    if (hasUppercaseKeys) {
      console.error('[API PUT] 🚨 ALERTA: Body tiene campos en MAYÚSCULAS!')
      console.error('[API PUT] Keys:', bodyKeys)
      
      // Función para convertir camelCase a snake_case
      const camelToSnake = (str: string): string => {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      }
      
      // Convertir FORZADAMENTE a snake_case
      const normalizedBody: any = {}
      for (const [key, value] of Object.entries(body)) {
        const normalizedKey = camelToSnake(key)
        normalizedBody[normalizedKey] = value
      }
      console.log('[API PUT] ✅ Body normalizado (camelCase -> snake_case):', Object.keys(normalizedBody))
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
    
    // ⚠️ CRÍTICO: Obtener estado_publicacion actual del producto
    // Si el producto está publicado, debemos mantenerlo publicado para que los lifecycles se ejecuten
    const attrs = producto.attributes || producto
    const estadoActual = attrs.estado_publicacion || attrs.estadoPublicacion || attrs.ESTADO_PUBLICACION
    console.log('[API PUT] 📝 Estado de publicación actual:', estadoActual)

    // ⚠️ NUEVO MÉTODO SIMPLIFICADO (Strapi actualizado):
    // - Strapi preserva automáticamente los externalIds (IDs de WooCommerce)
    // - NO necesitas incluir externalIds en el payload
    // - Solo envía los campos que cambien
    // - NO necesitas obtener el producto completo antes de actualizar
    
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

    // Descripción - Rich Text Blocks o HTML
    // Quill envía HTML, necesitamos convertirlo a blocks de Strapi
    if (body.descripcion !== undefined) {
      if (Array.isArray(body.descripcion)) {
        // Si ya viene como blocks, usar directamente
        updateData.data.descripcion = body.descripcion
      } else if (typeof body.descripcion === 'string') {
        const descripcionTrimmed = body.descripcion.trim()
        if (descripcionTrimmed === '') {
          updateData.data.descripcion = null
        } else {
          // Si viene como HTML (desde Quill), convertir a blocks de Strapi
          // Dividir por párrafos (<p> o saltos de línea)
          const htmlContent = descripcionTrimmed
          
          // Si contiene HTML, procesarlo
          if (htmlContent.includes('<')) {
            // Dividir por etiquetas <p> o </p>
            const paragraphs = htmlContent
              .split(/<p[^>]*>|<\/p>/)
              .filter((p: string) => p.trim() !== '' && !p.startsWith('<'))
              .map((p: string) => p.trim())
            
            if (paragraphs.length > 0) {
              updateData.data.descripcion = paragraphs.map((para: string) => {
                // Remover todas las etiquetas HTML y extraer solo texto
                const textOnly = para.replace(/<[^>]+>/g, '').trim()
                if (textOnly) {
                  return {
                    type: 'paragraph',
                    children: [{ type: 'text', text: textOnly }]
                  }
                }
                return null
              }).filter((b: any) => b !== null)
            } else {
              // Si no hay párrafos, extraer todo el texto
              const textOnly = htmlContent.replace(/<[^>]+>/g, '').trim()
              updateData.data.descripcion = textOnly ? [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', text: textOnly }]
                }
              ] : null
            }
          } else {
            // Si es texto plano, crear un párrafo
            updateData.data.descripcion = [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: descripcionTrimmed }]
              }
            ]
          }
        }
      }
      
      console.log('[API PUT] ✅ Descripción formateada para Strapi:', JSON.stringify(updateData.data.descripcion))
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
    // ⚠️ CRÍTICO: Si el producto ya está publicado, mantenerlo publicado para que los lifecycles se ejecuten
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
    } else {
      // ⚠️ CRÍTICO: Si no se envía estado_publicacion en el body, mantener el estado actual
      // Si el producto está publicado, mantenerlo publicado para que los lifecycles se ejecuten
      if (estadoActual) {
        const estadoLower = String(estadoActual).toLowerCase()
        if (estadoLower === 'publicado') {
          updateData.data.estado_publicacion = 'Publicado'
          console.log('[API PUT] ✅ Manteniendo estado_publicacion como "Publicado" para activar lifecycles')
        } else {
          // Si no está publicado, mantener el estado actual
          updateData.data.estado_publicacion = estadoActual
          console.log('[API PUT] ℹ️ Manteniendo estado_publicacion actual:', estadoActual)
        }
      } else {
        // Si no hay estado, establecer como "Publicado" por defecto para activar lifecycles
        updateData.data.estado_publicacion = 'Publicado'
        console.log('[API PUT] ✅ Estableciendo estado_publicacion como "Publicado" por defecto para activar lifecycles')
      }
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

    // === CAMPOS WOOCOMMERCE ===
    // Precio
    if (body.precio !== undefined) {
      updateData.data.precio = parseFloat(body.precio.toString()) || 0
    }
    if (body.precio_regular !== undefined) {
      updateData.data.precio_regular = parseFloat(body.precio_regular.toString()) || 0
    }
    if (body.precio_oferta !== undefined) {
      updateData.data.precio_oferta = parseFloat(body.precio_oferta.toString()) || 0
    }
    
    // ⚠️ IMPORTANTE: Los siguientes campos NO están en el schema de Strapi y NO deben enviarse:
    // - type (tipo de producto WooCommerce)
    // - virtual, downloadable, reviews_allowed (opciones WooCommerce)
    // - menu_order, purchase_note (campos WooCommerce)
    // - sku (se maneja como isbn_libro en Strapi)
    // Estos campos se manejan en Strapi a través de raw_woo_data en los lifecycles
    
    // Inventario
    // ⚠️ IMPORTANTE: Solo incluir campos que están en el schema de Strapi
    if (body.stock_quantity !== undefined) {
      updateData.data.stock_quantity = parseInt(body.stock_quantity.toString()) || 0
    }
    // ❌ NO incluir estos campos - no están en schema de Strapi:
    // - stock_status, backorders, manage_stock, sold_individually
    // Estos campos se manejan en Strapi a través de raw_woo_data en los lifecycles
    // if (body.stock_status !== undefined) {
    //   updateData.data.stock_status = body.stock_status
    // }
    // if (body.backorders !== undefined) {
    //   updateData.data.backorders = body.backorders
    // }
    // if (body.manage_stock !== undefined) {
    //   updateData.data.manage_stock = Boolean(body.manage_stock)
    // }
    // if (body.sold_individually !== undefined) {
    //   updateData.data.sold_individually = Boolean(body.sold_individually)
    // }
    
    // Peso y dimensiones
    // ⚠️ VERIFICAR: Estos campos pueden no estar en el schema de Strapi
    // Si dan error, comentarlos también
    // if (body.weight !== undefined) {
    //   updateData.data.weight = parseFloat(body.weight.toString()) || 0
    // }
    // if (body.length !== undefined) {
    //   updateData.data.length = parseFloat(body.length.toString()) || 0
    // }
    // if (body.width !== undefined) {
    //   updateData.data.width = parseFloat(body.width.toString()) || 0
    // }
    // if (body.height !== undefined) {
    //   updateData.data.height = parseFloat(body.height.toString()) || 0
    // }

    // Descripción corta
    // ❌ NO incluir descripcion_corta - no está en schema de Strapi
    // Se usa solo en raw_woo_data para WooCommerce
    // Strapi debe usar raw_woo_data.short_description en los lifecycles
    // if (body.descripcion_corta !== undefined) {
    //   updateData.data.descripcion_corta = body.descripcion_corta?.trim() || ''
    // }

    // Clase de envío
    // ⚠️ VERIFICAR: Este campo puede no estar en el schema de Strapi
    // if (body.shipping_class !== undefined) {
    //   updateData.data.shipping_class = body.shipping_class || ''
    // }

    // ⚠️ IMPORTANTE: raw_woo_data NO se puede enviar directamente a Strapi porque no está en el schema
    // Strapi lo rechaza con error "Invalid key raw_woo_data"
    // En su lugar, Strapi debe construir raw_woo_data en sus lifecycles desde los campos individuales:
    // - descripcion → raw_woo_data.description
    // - subtitulo_libro → raw_woo_data.short_description
    // 
    // El frontend envía raw_woo_data en el body para referencia, pero NO lo incluimos en updateData.data
    // porque Strapi lo rechazaría. Los lifecycles de Strapi deben usar descripcion y subtitulo_libro
    // para construir raw_woo_data correctamente.
    if (body.raw_woo_data || body.rawWooData) {
      const rawWooData = body.raw_woo_data || body.rawWooData
      console.log('[API PUT] ℹ️ raw_woo_data recibido del frontend (NO se envía a Strapi - no está en schema):', {
        tieneDescription: !!rawWooData?.description,
        tieneShortDescription: !!rawWooData?.short_description,
        descriptionLength: rawWooData?.description?.length || 0,
        shortDescriptionLength: rawWooData?.short_description?.length || 0,
      })
      console.log('[API PUT] ⚠️ Strapi construirá raw_woo_data desde descripcion y subtitulo_libro en lifecycles')
      console.log('[API PUT] ⚠️ Asegurar que descripcion y subtitulo_libro estén correctamente actualizados')
    }
    
    console.log('[API PUT] ℹ️ Datos que se enviarán a Strapi:')
    console.log('[API PUT]   - descripcion:', updateData.data.descripcion ? '✅ Presente' : '❌ Vacío')
    console.log('[API PUT]   - subtitulo_libro:', updateData.data.subtitulo_libro ? '✅ Presente' : '❌ Vacío')
    console.log('[API PUT]   - precio:', updateData.data.precio ? '✅ Presente' : '❌ Vacío')
    console.log('[API PUT]   - estado_publicacion:', updateData.data.estado_publicacion ? '✅ Presente' : '❌ Vacío')
    console.log('[API PUT]   - raw_woo_data: ❌ NO se envía (Strapi lo construye en lifecycles desde descripcion y subtitulo_libro)')

    // VERIFICACIÓN FINAL antes de enviar
    // Verificar que todos los campos estén en snake_case (minúsculas con guiones bajos)
    // ⚠️ IMPORTANTE: NO incluir rawWooData o raw_woo_data (Strapi lo rechaza)
    const finalKeys = Object.keys(updateData.data)
    const camelToSnake = (str: string): string => {
      return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    }
    
    // Remover rawWooData o raw_woo_data si están presentes (Strapi los rechaza)
    if (updateData.data.rawWooData) {
      delete updateData.data.rawWooData
      console.log('[API PUT] ⚠️ rawWooData removido del payload (Strapi lo rechaza)')
    }
    if (updateData.data.raw_woo_data) {
      delete updateData.data.raw_woo_data
      console.log('[API PUT] ⚠️ raw_woo_data removido del payload (Strapi lo rechaza)')
    }
    
    const keysWithUppercase = finalKeys.filter(k => {
      // Ignorar rawWooData y raw_woo_data (ya fueron removidos)
      if (k === 'rawWooData' || k === 'raw_woo_data') return false
      const normalized = camelToSnake(k)
      return k !== normalized && k !== k.toLowerCase()
    })
    
    if (keysWithUppercase.length > 0) {
      console.error('[API PUT] 🚨 ERROR CRÍTICO: Todavía hay campos con MAYÚSCULAS!')
      console.error('[API PUT] Keys problemáticos:', keysWithUppercase)
      console.error('[API PUT] Keys normalizados esperados:', keysWithUppercase.map(camelToSnake))
      throw new Error('Error interno: Datos con formato incorrecto')
    }

    console.log('[API PUT] 📤 Datos finales a enviar:', JSON.stringify(updateData, null, 2))
    console.log('[API PUT] ✅ Todos los campos en minúsculas')
    console.log('[API PUT] ℹ️ Strapi preservará automáticamente los externalIds (IDs de WooCommerce)')

    // Actualizar usando el método simplificado
    // Strapi preservará automáticamente los externalIds, no necesitamos incluirlos
    const updateResponse = await strapiClient.put<any>(
      `/api/libros/${producto.documentId}`,
      updateData
    )

    console.log('[API PUT] ✅ Actualización exitosa')

    // Registrar cambios en logs de actividades
    try {
      const { logActivity } = await import('@/lib/logging/service')
      
      // Obtener datos anteriores y nuevos para el log
      const attrs = producto.attributes || producto
      const datosAnteriores: any = {}
      const datosNuevos: any = {}
      const cambios: string[] = []

      // Detectar cambios en campos importantes
      if (body.nombre_libro !== undefined && body.nombre_libro !== attrs.nombre_libro) {
        datosAnteriores.nombre_libro = attrs.nombre_libro
        datosNuevos.nombre_libro = body.nombre_libro
        cambios.push('nombre')
      }

      if (body.precio !== undefined && parseFloat(body.precio.toString()) !== attrs.precio) {
        datosAnteriores.precio = attrs.precio
        datosNuevos.precio = parseFloat(body.precio.toString())
        cambios.push('precio')
      }

      if (body.precio_regular !== undefined && parseFloat(body.precio_regular.toString()) !== attrs.precio_regular) {
        datosAnteriores.precio_regular = attrs.precio_regular
        datosNuevos.precio_regular = parseFloat(body.precio_regular.toString())
        cambios.push('precio regular')
      }

      if (body.precio_oferta !== undefined && parseFloat(body.precio_oferta.toString()) !== attrs.precio_oferta) {
        datosAnteriores.precio_oferta = attrs.precio_oferta
        datosNuevos.precio_oferta = parseFloat(body.precio_oferta.toString())
        cambios.push('precio oferta')
      }

      if (body.descripcion !== undefined) {
        datosAnteriores.descripcion = attrs.descripcion
        datosNuevos.descripcion = body.descripcion
        cambios.push('descripción')
      }

      if (body.stock_quantity !== undefined && parseInt(body.stock_quantity.toString()) !== attrs.stock_quantity) {
        datosAnteriores.stock_quantity = attrs.stock_quantity
        datosNuevos.stock_quantity = parseInt(body.stock_quantity.toString())
        cambios.push('stock')
      }

      // Si hay cambios, registrar log
      if (cambios.length > 0) {
        const descripcion = `Actualizó ${cambios.join(', ')} del producto "${attrs.nombre_libro || 'Sin nombre'}"`
        
        await logActivity(request, {
          accion: 'actualizar',
          entidad: 'producto',
          entidadId: String(id),
          descripcion,
          datosAnteriores,
          datosNuevos
        })

        console.log('[API PUT] 📝 Log de actividad registrado:', { cambios, descripcion })
      }
    } catch (logError: any) {
      // No fallar la actualización si el log falla
      console.error('[API PUT] ⚠️ Error al registrar log (no crítico):', logError.message)
    }

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
