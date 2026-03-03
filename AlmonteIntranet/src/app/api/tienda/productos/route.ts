/**
 * API Route para obtener productos desde Strapi
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verificar que el token esté configurado
    const token = process.env.STRAPI_API_TOKEN
    if (!token) {
      console.error('[API /tienda/productos] STRAPI_API_TOKEN no está configurado')
      return NextResponse.json(
        { 
          success: false,
          error: 'STRAPI_API_TOKEN no está configurado. Verifica las variables de entorno.',
          data: [],
          meta: {},
        },
        { status: 500 }
      )
    }

    // Obtener parámetros de query string
    const { searchParams } = new URL(request.url)
    const pageSize = searchParams.get('pagination[pageSize]') || '1000'
    const page = searchParams.get('pagination[page]') || '1'

    // Endpoint correcto confirmado: /api/libros (verificado en test-strapi)
    const endpointUsed = '/api/libros'
    const queryString = `populate=*&pagination[pageSize]=${pageSize}&pagination[page]=${page}`
    const url = `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}${endpointUsed}?${queryString}`
    
    console.log('[API /tienda/productos] Intentando obtener productos:', {
      endpoint: endpointUsed,
      page,
      pageSize,
      url: url.replace(/Bearer\s+\w+/, 'Bearer [TOKEN]'), // Ocultar token en logs
      tieneToken: !!token,
    })
    
    // Usar populate=* que funciona correctamente
    // Solo especificar campos que realmente existen en Strapi (en minúsculas)
    const response = await strapiClient.get<any>(
      `${endpointUsed}?${queryString}`
    )
    
    // Log detallado para debugging
    console.log('[API /tienda/productos] Respuesta de Strapi exitosa:', {
      endpoint: endpointUsed,
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      count: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
    })
    
    // Log del primer producto para verificar estructura de imágenes
    if (response.data && (Array.isArray(response.data) ? response.data[0] : response.data)) {
      const primerProducto = Array.isArray(response.data) ? response.data[0] : response.data
      console.log('[API /tienda/productos] Primer producto estructura:', {
        id: primerProducto.id,
        tieneAttributes: !!primerProducto.attributes,
        keysAttributes: primerProducto.attributes ? Object.keys(primerProducto.attributes).slice(0, 5) : [],
      })
    }
    
    return NextResponse.json({
      success: true,
      data: response.data || [],
      meta: response.meta || {},
      endpoint: endpointUsed,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /tienda/productos] Error al obtener productos:', {
      message: error.message,
      status: error.status,
      details: error.details,
      stack: error.stack,
      url: process.env.NEXT_PUBLIC_STRAPI_URL,
      tieneToken: !!process.env.STRAPI_API_TOKEN,
    })
    
    // Si es un error 502, puede ser un problema de conexión con Strapi
    if (error.status === 502) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Error 502: No se pudo conectar con Strapi. Verifica que el servidor de Strapi esté disponible y que las variables de entorno estén configuradas correctamente.',
          data: [],
          meta: {},
        },
        { status: 502 }
      )
    }

    // Para errores 4xx/5xx de Strapi (por ejemplo, /api/libros rompiendo por relaciones),
    // devolvemos 200 con success=false y data vacía para no reventar la UI de Intranet.
    // Los módulos de tienda pueden leer success/error y mostrar un estado vacío controlado.
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener productos',
        data: [],
        meta: {},
      },
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  try {
    console.log('[API POST] 📝 Creando producto:', body)

    // Validar nombre_libro obligatorio
    if (!body.nombre_libro || body.nombre_libro.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'El nombre del libro es obligatorio'
      }, { status: 400 })
    }

    // CRÍTICO: Generar ISBN único automáticamente si no viene
    const isbn = body.isbn_libro && body.isbn_libro.trim() !== '' 
      ? body.isbn_libro.trim() 
      : `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    console.log('[API POST] 📚 ISBN a usar:', isbn)

    // ⚠️ IMPORTANTE: Al crear, siempre se guarda con estado_publicacion = "Pendiente" (con mayúscula inicial)
    // El estado solo se puede cambiar desde la página de Solicitudes
    // Solo se publica en WordPress si estado_publicacion === "Publicado" (se maneja en lifecycles de Strapi)
    const estadoPublicacion = 'Pendiente'
    
    console.log('[API POST] 📚 Estado de publicación:', estadoPublicacion, '(siempre pendiente al crear)')
    console.log('[API POST] ⏸️ No se crea en WooCommerce al crear - se sincronizará cuando estado_publicacion = "publicado"')

    // Crear SOLO en Strapi (NO en WooCommerce al crear)
    console.log('[API POST] 📚 Creando producto en Strapi...')
    
    // Convertir descripción de HTML a blocks de Strapi (igual que en PUT)
    // ⚠️ CRÍTICO: Strapi espera descripcion como array de blocks (Rich Text), NO como string
    let descripcionBlocks: any = null
    if (body.descripcion !== undefined) {
      if (Array.isArray(body.descripcion)) {
        // Si ya viene como blocks, usar directamente
        descripcionBlocks = body.descripcion
      } else if (typeof body.descripcion === 'string') {
        const descripcionTrimmed = body.descripcion.trim()
        if (descripcionTrimmed === '') {
          descripcionBlocks = null
        } else {
          // Si viene como HTML (desde Quill), convertir a blocks de Strapi
          if (descripcionTrimmed.includes('<')) {
            // Dividir por etiquetas <p> o </p>
            const paragraphs = descripcionTrimmed
              .split(/<p[^>]*>|<\/p>/)
              .filter((p: string) => p.trim() !== '' && !p.startsWith('<'))
              .map((p: string) => p.trim())
            
            if (paragraphs.length > 0) {
              descripcionBlocks = paragraphs.map((para: string) => {
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
              const textOnly = descripcionTrimmed.replace(/<[^>]+>/g, '').trim()
              descripcionBlocks = textOnly ? [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', text: textOnly }]
                }
              ] : null
            }
          } else {
            // Si es texto plano, crear un párrafo
            descripcionBlocks = [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: descripcionTrimmed }]
              }
            ]
          }
        }
      }
    }
    
    console.log('[API POST] ✅ Descripción formateada para Strapi:', JSON.stringify(descripcionBlocks))
    console.log('[API POST] ℹ️ Tipo de descripción:', Array.isArray(descripcionBlocks) ? 'Blocks (✅ Correcto)' : descripcionBlocks === null ? 'null (vacío)' : 'String (❌ Incorrecto)')
    
    const strapiProductData: any = {
      data: {
        nombre_libro: body.nombre_libro.trim(),
        isbn_libro: isbn,
        descripcion: descripcionBlocks, // ✅ Enviar como blocks, no como string
        // ⚠️ descripcion_corta NO se envía - no está en schema de Strapi
        // Se usa solo en raw_woo_data para WooCommerce
        subtitulo_libro: body.subtitulo_libro?.trim() || '',
        estado_publicacion: estadoPublicacion,
      }
    }

    // ⚠️ IMPORTANTE: raw_woo_data NO se puede enviar directamente a Strapi porque no está en el schema
    // Strapi lo rechaza con error "Invalid key raw_woo_data"
    // En su lugar, Strapi debe construir raw_woo_data en sus lifecycles desde los campos individuales:
    // - descripcion → raw_woo_data.description
    // - subtitulo_libro → raw_woo_data.short_description
    // 
    // El frontend envía raw_woo_data en el body para referencia, pero NO lo incluimos en strapiProductData.data
    // porque Strapi lo rechazaría. Los lifecycles de Strapi deben usar descripcion y subtitulo_libro
    // para construir raw_woo_data correctamente.
    if (body.raw_woo_data || body.rawWooData) {
      const rawWooData = body.raw_woo_data || body.rawWooData
      console.log('[API POST] ℹ️ raw_woo_data recibido del frontend (NO se envía a Strapi - no está en schema):', {
        tieneDescription: !!rawWooData?.description,
        tieneShortDescription: !!rawWooData?.short_description,
        descriptionLength: rawWooData?.description?.length || 0,
        shortDescriptionLength: rawWooData?.short_description?.length || 0,
      })
      console.log('[API POST] ⚠️ Strapi construirá raw_woo_data desde descripcion y subtitulo_libro en lifecycles')
    }
    
    console.log('[API POST] ℹ️ Datos que se enviarán a Strapi:')
    console.log('[API POST]   - descripcion:', strapiProductData.data.descripcion ? '✅ Presente' : '❌ Vacío')
    console.log('[API POST]   - subtitulo_libro:', strapiProductData.data.subtitulo_libro ? '✅ Presente' : '❌ Vacío')
    console.log('[API POST]   - precio:', strapiProductData.data.precio ? '✅ Presente' : '❌ Vacío')
    console.log('[API POST]   - raw_woo_data: ❌ NO se envía (Strapi lo construye en lifecycles desde descripcion y subtitulo_libro)')

    // Agregar imagen si existe - usar ID de Strapi si está disponible
    if (body.portada_libro_id) {
      strapiProductData.data.portada_libro = body.portada_libro_id
    } else if (body.portada_libro && (typeof body.portada_libro === 'number' || /^\d+$/.test(String(body.portada_libro)))) {
      strapiProductData.data.portada_libro = typeof body.portada_libro === 'number' ? body.portada_libro : parseInt(body.portada_libro, 10)
    }

    // === RELACIONES SIMPLES (documentId) ===
    if (body.obra) strapiProductData.data.obra = body.obra
    if (body.autor_relacion) strapiProductData.data.autor_relacion = body.autor_relacion
    if (body.editorial) strapiProductData.data.editorial = body.editorial
    if (body.sello) strapiProductData.data.sello = body.sello
    if (body.coleccion) strapiProductData.data.coleccion = body.coleccion

    // === RELACIONES MÚLTIPLES (array de documentIds) ===
    // ⚠️ IMPORTANTE: Los canales determinan a qué plataforma WooCommerce se sincroniza el producto
    // - ID 1 = Moraleja (key: "moraleja")
    // - ID 2 = Escolar (key: "escolar")
    // 
    // Si se crea desde "Alta producto en catálogo" (sin canales), NO se asignan canales automáticamente.
    // El producto se guarda solo en Strapi con estado "Pendiente".
    // Cuando se apruebe (estado_publicacion = "Publicado"), se asignará automáticamente el canal "escolar"
    // en los lifecycles de Strapi o en la API de actualización.
    if (body.canales && Array.isArray(body.canales) && body.canales.length > 0) {
      // Convertir a números si vienen como strings
      strapiProductData.data.canales = body.canales.map((c: any) => typeof c === 'string' ? parseInt(c) : c)
      console.log('[API POST] 📡 Canales asignados (desde formulario):', strapiProductData.data.canales)
    } else {
      // ⚠️ NO asignar canales automáticamente si no vienen en el body
      // Esto permite que productos creados desde "Alta producto en catálogo" se guarden sin canales
      // Los canales se asignarán cuando se apruebe el producto (estado_publicacion = "Publicado")
      console.log('[API POST] ⚠️ No se asignan canales automáticamente - el producto se guardará sin canales')
      console.log('[API POST] ℹ️ Los canales se asignarán cuando se apruebe el producto (estado_publicacion = "Publicado")')
      // NO asignar canales - dejar que se asigne automáticamente cuando se apruebe
      // Asegurar que el campo canales no esté presente en el payload
      if (strapiProductData.data.canales) {
        delete strapiProductData.data.canales
      }
    }
    
    if (body.marcas && Array.isArray(body.marcas) && body.marcas.length > 0) {
      strapiProductData.data.marcas = body.marcas
    }
    if (body.etiquetas && Array.isArray(body.etiquetas) && body.etiquetas.length > 0) {
      strapiProductData.data.etiquetas = body.etiquetas
    }
    if (body.categorias_producto && Array.isArray(body.categorias_producto) && body.categorias_producto.length > 0) {
      strapiProductData.data.categorias_producto = body.categorias_producto
    }

    // === CAMPOS NUMÉRICOS ===
    if (body.numero_edicion !== undefined && body.numero_edicion !== '') {
      strapiProductData.data.numero_edicion = parseInt(body.numero_edicion)
    }
    if (body.agno_edicion !== undefined && body.agno_edicion !== '') {
      strapiProductData.data.agno_edicion = parseInt(body.agno_edicion)
    }

    // === ENUMERACIONES ===
    if (body.idioma && body.idioma !== '') {
      strapiProductData.data.idioma = body.idioma
    }
    if (body.tipo_libro && body.tipo_libro !== '') {
      strapiProductData.data.tipo_libro = body.tipo_libro
    }
    if (body.estado_edicion && body.estado_edicion !== '') {
      strapiProductData.data.estado_edicion = body.estado_edicion
    }

    // === CAMPOS WOOCOMMERCE ===
    if (body.precio !== undefined) {
      strapiProductData.data.precio = parseFloat(body.precio) || 0
    }
    if (body.precio_regular !== undefined) {
      strapiProductData.data.precio_regular = parseFloat(body.precio_regular) || 0
    }
    if (body.precio_oferta !== undefined && body.precio_oferta !== '') {
      const precioOferta = parseFloat(body.precio_oferta)
      if (precioOferta > 0) {
        strapiProductData.data.precio_oferta = precioOferta
        console.log('[API POST] 💰 Precio oferta agregado:', precioOferta)
      }
    }
    if (body.stock_quantity !== undefined) {
      strapiProductData.data.stock_quantity = parseInt(body.stock_quantity) || 0
    }
    if (body.manage_stock !== undefined) {
      strapiProductData.data.manage_stock = body.manage_stock
    }
    if (body.stock_status) {
      strapiProductData.data.stock_status = body.stock_status
    }
    if (body.weight !== undefined && body.weight !== '') {
      strapiProductData.data.weight = parseFloat(body.weight) || 0
    }
    if (body.length !== undefined && body.length !== '') {
      strapiProductData.data.length = parseFloat(body.length) || 0
    }
    if (body.width !== undefined && body.width !== '') {
      strapiProductData.data.width = parseFloat(body.width) || 0
    }
    if (body.height !== undefined && body.height !== '') {
      strapiProductData.data.height = parseFloat(body.height) || 0
    }
    if (body.shipping_class !== undefined && body.shipping_class !== '') {
      strapiProductData.data.shipping_class = body.shipping_class
    }
    if (body.type !== undefined) {
      strapiProductData.data.type = body.type
    }
    if (body.virtual !== undefined) {
      strapiProductData.data.virtual = body.virtual
    }
    if (body.downloadable !== undefined) {
      strapiProductData.data.downloadable = body.downloadable
    }
    if (body.reviews_allowed !== undefined) {
      strapiProductData.data.reviews_allowed = body.reviews_allowed
    }
    if (body.sold_individually !== undefined) {
      strapiProductData.data.sold_individually = body.sold_individually
    }
    if (body.sku !== undefined && body.sku !== '') {
      strapiProductData.data.sku = body.sku
    }
    if (body.featured !== undefined) {
      strapiProductData.data.featured = body.featured
    }

    // ⚠️ IMPORTANTE: Eliminar campos vacíos o undefined antes de enviar a Strapi
    // Esto evita errores cuando campos opcionales no tienen valores
    Object.keys(strapiProductData.data).forEach(key => {
      const value = strapiProductData.data[key as keyof typeof strapiProductData.data]
      // Eliminar campos undefined, null, o arrays vacíos (excepto canales que se maneja aparte)
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0 && key !== 'canales')) {
        delete strapiProductData.data[key as keyof typeof strapiProductData.data]
      }
    })
    
    // Si canales está vacío o no existe, eliminarlo completamente
    if (!strapiProductData.data.canales || (Array.isArray(strapiProductData.data.canales) && strapiProductData.data.canales.length === 0)) {
      delete strapiProductData.data.canales
      console.log('[API POST] 📝 Campo canales eliminado del payload (está vacío o no existe)')
    }

    console.log('[API POST] 📤 Enviando producto a Strapi:', {
      tieneCanales: !!strapiProductData.data.canales,
      canales: strapiProductData.data.canales,
      campos: Object.keys(strapiProductData.data).length,
      payloadKeys: Object.keys(strapiProductData.data),
    })
    
    // Log completo del payload para debugging
    console.log('[API POST] 📋 Payload completo:', JSON.stringify(strapiProductData, null, 2))

    // Usar Promise.race con timeout para evitar que se quede colgado
    let strapiProduct: any
    try {
      const strapiPromise = strapiClient.post<any>('/api/libros', strapiProductData)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: Strapi tardó más de 20 segundos')), 20000)
      )
      
      strapiProduct = await Promise.race([strapiPromise, timeoutPromise]) as any
    } catch (strapiError: any) {
      console.error('[API POST] ❌ Error al crear producto en Strapi:', {
        message: strapiError.message,
        status: strapiError.status,
        details: strapiError.details,
        response: strapiError.response,
        stack: strapiError.stack,
      })
      throw strapiError
    }
    console.log('[API POST] ✅ Producto creado en Strapi:', {
      id: strapiProduct.data?.id,
      documentId: strapiProduct.data?.documentId,
      nombre: strapiProduct.data?.attributes?.nombre_libro || strapiProduct.data?.nombre_libro,
      estado_publicacion: strapiProduct.data?.attributes?.estado_publicacion || strapiProduct.data?.estado_publicacion,
      tieneCanales: !!(strapiProduct.data?.attributes?.canales || strapiProduct.data?.canales),
      canales: strapiProduct.data?.attributes?.canales?.data || strapiProduct.data?.canales?.data || strapiProduct.data?.attributes?.canales || strapiProduct.data?.canales,
    })
    
    // Verificar que el producto tenga canales asignados
    const productoCompleto = strapiProduct.data?.attributes || strapiProduct.data || strapiProduct
    const canalesAsignados = productoCompleto.canales?.data || productoCompleto.canales || []
    
    if (canalesAsignados.length === 0) {
      console.error('[API POST] ⚠️ ADVERTENCIA: El producto NO tiene canales asignados. NO se sincronizará con WooCommerce.')
      console.error('[API POST] ⚠️ El producto necesita tener canales (Moraleja y/o Escolar) para sincronizarse con WordPress.')
    } else {
      console.log('[API POST] ✅ Producto tiene canales asignados:', canalesAsignados.length)
      console.log('[API POST] ✅ El lifecycle de Strapi debería sincronizar automáticamente con WooCommerce')
    }
    
    // Verificar estado de publicación
    const estadoPub = productoCompleto.estado_publicacion || 'Sin estado'
    console.log('[API POST] Estado: ⏸️ Solo guardado en Strapi (pendiente), no se publica en WordPress')
    console.log('[API POST] Para publicar, cambiar el estado desde la página de Solicitudes')

    return NextResponse.json({
      success: true,
      data: {
        strapi: strapiProduct?.data || null,
      },
      message: 'Producto creado en Strapi con estado "pendiente". Para publicar en WordPress, cambia el estado desde Solicitudes.'
    })

  } catch (error: any) {
    console.error('[API POST] ❌ ERROR al crear producto:', {
      message: error.message,
      status: error.status,
      details: error.details,
      response: error.response?.data || error.response,
      stack: error.stack,
    })
    
    // Si el error es de Strapi, intentar extraer más información
    let errorMessage = error.message || 'Error al crear el producto en Strapi'
    let errorDetails = error.details
    
    if (error.response?.data) {
      const strapiError = error.response.data
      if (strapiError.error) {
        errorMessage = strapiError.error.message || strapiError.error
        errorDetails = strapiError.error.details || errorDetails
      } else if (strapiError.message) {
        errorMessage = strapiError.message
        errorDetails = strapiError.details || errorDetails
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      status: error.status || 500
    }, { status: error.status || 500 })
  }
}
