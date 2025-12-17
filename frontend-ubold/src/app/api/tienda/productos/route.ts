/**
 * API Route para obtener productos desde Strapi
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

export async function GET() {
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

    // Endpoint correcto confirmado: /api/libros (verificado en test-strapi)
    const endpointUsed = '/api/libros'
    const url = `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}${endpointUsed}?populate=*&pagination[pageSize]=100`
    
    console.log('[API /tienda/productos] Intentando obtener productos:', {
      endpoint: endpointUsed,
      url: url.replace(/Bearer\s+\w+/, 'Bearer [TOKEN]'), // Ocultar token en logs
      tieneToken: !!token,
    })
    
    // Usar populate=* que funciona correctamente
    // Solo especificar campos que realmente existen en Strapi (en minúsculas)
    const response = await strapiClient.get<any>(
      `${endpointUsed}?populate=*&pagination[pageSize]=100`
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
  try {
    const body = await request.json()
    
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

    // Preparar datos para Strapi (formato: { data: { campos } })
    const productData: any = {
      data: {
        isbn_libro: isbn,
        nombre_libro: body.nombre_libro.trim()
      }
    }

    // Campos opcionales básicos
    if (body.subtitulo_libro?.trim()) {
      productData.data.subtitulo_libro = body.subtitulo_libro.trim()
    }
    
    if (body.descripcion?.trim()) {
      productData.data.descripcion = body.descripcion.trim()
    }
    
    if (body.portada_libro) {
      productData.data.portada_libro = body.portada_libro
    }

    // === RELACIONES SIMPLES (documentId) ===
    if (body.obra) productData.data.obra = body.obra
    if (body.autor_relacion) productData.data.autor_relacion = body.autor_relacion
    if (body.editorial) productData.data.editorial = body.editorial
    if (body.sello) productData.data.sello = body.sello
    if (body.coleccion) productData.data.coleccion = body.coleccion

    // === RELACIONES MÚLTIPLES (array de documentIds) ===
    if (body.canales?.length > 0) productData.data.canales = body.canales
    if (body.marcas?.length > 0) productData.data.marcas = body.marcas
    if (body.etiquetas?.length > 0) productData.data.etiquetas = body.etiquetas
    if (body.categorias_producto?.length > 0) productData.data.categorias_producto = body.categorias_producto

    // === IDS NUMÉRICOS ===
    if (body.id_autor) productData.data.id_autor = body.id_autor
    if (body.id_editorial) productData.data.id_editorial = body.id_editorial
    if (body.id_sello) productData.data.id_sello = body.id_sello
    if (body.id_coleccion) productData.data.id_coleccion = body.id_coleccion
    if (body.id_obra) productData.data.id_obra = body.id_obra

    // === INFORMACIÓN DE EDICIÓN ===
    if (body.numero_edicion) productData.data.numero_edicion = body.numero_edicion
    if (body.agno_edicion) productData.data.agno_edicion = body.agno_edicion
    if (body.idioma) productData.data.idioma = body.idioma
    if (body.tipo_libro) productData.data.tipo_libro = body.tipo_libro
    if (body.estado_edicion) productData.data.estado_edicion = body.estado_edicion

    console.log('[API POST] 📤 Enviando a Strapi:', JSON.stringify(productData, null, 2))

    // Crear en Strapi
    const response = await strapiClient.post<any>('/api/libros', productData)

    console.log('[API POST] ✅ Producto creado exitosamente:', {
      id: response.data?.id || response.id,
      documentId: response.data?.documentId || response.documentId,
      nombre: response.data?.nombre_libro || response.nombre_libro
    })

    return NextResponse.json({
      success: true,
      data: response.data || response,
      message: 'Producto creado exitosamente'
    })

  } catch (error: any) {
    console.error('[API POST] ❌ ERROR al crear producto:', {
      message: error.message,
      status: error.status,
      details: error.details,
      errores: error.details?.errors
    })
    
    // Si el error es por ISBN duplicado, regenerar automáticamente
    const isDuplicateISBN = error.message?.includes('unique') || 
                           error.details?.errors?.some((e: any) => 
                             e.message?.includes('unique') && 
                             e.path?.includes('isbn_libro')
                           )
    
    if (isDuplicateISBN && body.isbn_libro) {
      console.log('[API POST] 🔄 ISBN duplicado detectado, regenerando automáticamente...')
      
      // Regenerar ISBN único
      const newIsbn = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      
      // Reintentar con nuevo ISBN
      try {
        const retryData = { ...productData }
        retryData.data.isbn_libro = newIsbn
        
        console.log('[API POST] 🔄 Reintentando con nuevo ISBN:', newIsbn)
        
        const retryResponse = await strapiClient.post<any>('/api/libros', retryData)
        
        console.log('[API POST] ✅ Producto creado exitosamente con ISBN regenerado:', {
          id: retryResponse.data?.id || retryResponse.id,
          documentId: retryResponse.data?.documentId || retryResponse.documentId,
          nombre: retryResponse.data?.nombre_libro || retryResponse.nombre_libro,
          isbn: newIsbn
        })
        
        return NextResponse.json({
          success: true,
          data: retryResponse.data || retryResponse,
          message: `Producto creado exitosamente. El ISBN "${body.isbn_libro}" ya existía, se generó uno nuevo automáticamente: "${newIsbn}"`,
          isbnRegenerado: true,
          isbnOriginal: body.isbn_libro,
          isbnNuevo: newIsbn
        })
      } catch (retryError: any) {
        console.error('[API POST] ❌ Error en reintento:', retryError)
        return NextResponse.json({
          success: false,
          error: `El ISBN "${body.isbn_libro}" ya existe y no se pudo generar uno nuevo automáticamente. Intenta con otro ISBN o déjalo vacío para generar uno automático.`,
          details: retryError.details?.errors
        }, { status: 400 })
      }
    }
    
    // Mensaje de error más específico para otros errores
    let errorMessage = 'Error al crear el producto'
    
    if (error.details?.errors) {
      errorMessage = error.details.errors.map((e: any) => e.message).join(', ')
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.details?.errors
    }, { status: error.status || 500 })
  }
}

