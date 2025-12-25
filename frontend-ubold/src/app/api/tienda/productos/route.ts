/**
 * API Route para obtener productos desde Strapi
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { logActivity, createLogDescription } from '@/lib/logging'

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
    
    // No registrar log de visualización - solo se registran ediciones y eliminaciones
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
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener productos',
        data: [],
        meta: {},
      },
      { status: error.status || 500 }
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

    // IMPORTANTE: Al crear, siempre se guarda con estado_publicacion = "Pendiente" (con mayúscula inicial como requiere el schema de Strapi)
    // El estado solo se puede cambiar desde la página de Solicitudes
    // Solo se publica en WordPress si estado_publicacion === "Publicado" (se maneja en lifecycles de Strapi)
    const estadoPublicacion = 'Pendiente'
    
    console.log('[API POST] 📚 Estado de publicación:', estadoPublicacion, '(siempre Pendiente al crear)')
    console.log('[API POST] ⏸️ No se crea en WooCommerce al crear - se sincronizará cuando estado_publicacion = "Publicado"')

    // Crear SOLO en Strapi (NO en WooCommerce al crear)
    console.log('[API POST] 📚 Creando producto en Strapi...')
    
    const strapiProductData: any = {
      data: {
        nombre_libro: body.nombre_libro.trim(),
        isbn_libro: isbn,
        descripcion: body.descripcion?.trim() || '',
        subtitulo_libro: body.subtitulo_libro?.trim() || '',
        estado_publicacion: estadoPublicacion, // Siempre "Pendiente" al crear (con mayúscula inicial como requiere Strapi)
        // NO incluir precio aquí - Strapi no tiene campo precio directo, usa relación precios
        // NO incluir stock_quantity aquí - Strapi no tiene campo stock_quantity directo, usa relación stocks
      }
    }

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
    // CRÍTICO: Los canales son necesarios para sincronizar con WordPress
    if (body.canales && Array.isArray(body.canales) && body.canales.length > 0) {
      strapiProductData.data.canales = body.canales
      console.log('[API POST] 📡 Canales asignados:', body.canales)
    } else {
      console.warn('[API POST] ⚠️ No se asignaron canales. El producto no se sincronizará con WordPress hasta que se asignen canales.')
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
    if (body.precio_oferta !== undefined) {
      strapiProductData.data.precio_oferta = parseFloat(body.precio_oferta) || 0
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
    if (body.featured !== undefined) {
      strapiProductData.data.featured = body.featured
    }

    // Usar Promise.race con timeout para evitar que se quede colgado
    const strapiPromise = strapiClient.post<any>('/api/libros', strapiProductData)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: Strapi tardó más de 20 segundos')), 20000)
    )
    
    const strapiProduct = await Promise.race([strapiPromise, timeoutPromise]) as any
    console.log('[API POST] ✅ Producto creado en Strapi:', {
      id: strapiProduct.data?.id,
      documentId: strapiProduct.data?.documentId
    })
    console.log('[API POST] Estado: ⏸️ Solo guardado en Strapi (pendiente), no se publica en WordPress')
    console.log('[API POST] Para publicar, cambiar el estado desde la página de Solicitudes')

    // Registrar log de creación
    const productoId = strapiProduct?.data?.documentId || strapiProduct?.data?.id || strapiProduct?.documentId || strapiProduct?.id
    logActivity(request, {
      accion: 'crear',
      entidad: 'producto',
      entidadId: productoId,
      descripcion: createLogDescription('crear', 'producto', isbn, `Producto "${body.nombre_libro}" (ISBN: ${isbn})`),
      datosNuevos: { nombre: body.nombre_libro, isbn, precio: body.precio },
      metadata: { strapiId: strapiProduct?.data?.documentId || strapiProduct?.data?.id },
    }).catch(() => {})

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
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al crear el producto en Strapi',
      details: error.details
    }, { status: error.status || 500 })
  }
}
