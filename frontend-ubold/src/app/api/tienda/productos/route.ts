/**
 * API Route para obtener productos desde Strapi
 * Esto evita exponer el token de Strapi en el cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'
import { STRAPI_API_URL } from '@/lib/strapi/config'
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
  // Guardar body fuera del try para poder usarlo en el catch
  const body = await request.json()
  const originalIsbn = body.isbn_libro && body.isbn_libro.trim() !== '' ? body.isbn_libro.trim() : null
  
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
    const isbn = originalIsbn || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    console.log('[API POST] 📚 ISBN a usar:', isbn)

    // Crear producto en WooCommerce
    console.log('[API POST] 🛒 Creando producto en WooCommerce...')
    
    const wooCommerceProductData: any = {
      name: body.nombre_libro.trim(),
      type: 'simple',
      status: 'publish',
      sku: isbn, // Usar ISBN como SKU
      regular_price: body.precio?.toString() || '0',
      description: body.descripcion?.trim() || '',
      short_description: body.subtitulo_libro?.trim() || '',
      manage_stock: body.manage_stock !== undefined ? body.manage_stock : true,
      stock_quantity: body.stock_quantity || 0,
      stock_status: body.stock_quantity > 0 ? 'instock' : 'outofstock',
    }

    // Agregar imagen si existe
    // body.portada_libro puede ser un ID de Strapi (número) o una URL (string)
    if (body.portada_libro) {
      let imageUrl: string = ''
      
      // Si es un número (ID de Strapi), obtener la URL desde Strapi
      if (typeof body.portada_libro === 'number' || (typeof body.portada_libro === 'string' && /^\d+$/.test(body.portada_libro))) {
        try {
          const imageId = typeof body.portada_libro === 'number' ? body.portada_libro : parseInt(body.portada_libro, 10)
          console.log('[API POST] 📷 Obteniendo URL de imagen desde Strapi, ID:', imageId)
          
          const strapiImageResponse = await strapiClient.get<any>(`upload/files/${imageId}`)
          
          if (strapiImageResponse?.url) {
            // Construir URL completa
            const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
            imageUrl = strapiImageResponse.url.startsWith('http') 
              ? strapiImageResponse.url 
              : `${baseUrl}${strapiImageResponse.url.startsWith('/') ? '' : '/'}${strapiImageResponse.url}`
            console.log('[API POST] ✅ URL de imagen obtenida desde Strapi:', imageUrl)
          } else {
            console.warn('[API POST] ⚠️ No se pudo obtener URL de imagen desde Strapi, construyendo URL por defecto')
            // Si no se puede obtener la URL, intentar construirla
            const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
            imageUrl = `${baseUrl}/api/upload/files/${imageId}`
          }
        } catch (imageError: any) {
          console.error('[API POST] ⚠️ Error al obtener URL de imagen desde Strapi:', imageError.message)
          // Si falla, intentar construir URL por defecto
          const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
          const imageId = typeof body.portada_libro === 'number' ? body.portada_libro : parseInt(body.portada_libro, 10)
          imageUrl = `${baseUrl}/api/upload/files/${imageId}`
        }
      } else {
        // Si ya es una URL, usarla directamente
        imageUrl = String(body.portada_libro)
      }
      
      // WooCommerce requiere que src sea una URL completa válida
      if (imageUrl && imageUrl.startsWith('http')) {
        wooCommerceProductData.images = [{
          src: imageUrl
        }]
        console.log('[API POST] 📷 Imagen agregada a producto WooCommerce:', imageUrl)
      } else {
        console.warn('[API POST] ⚠️ URL de imagen no válida, omitiendo imagen:', imageUrl)
      }
    }

    // Crear en WooCommerce primero
    const wooCommerceProduct = await wooCommerceClient.post<any>('products', wooCommerceProductData)
    console.log('[API POST] ✅ Producto creado en WooCommerce:', {
      id: wooCommerceProduct.id,
      sku: wooCommerceProduct.sku,
      name: wooCommerceProduct.name
    })

    // Crear en Strapi después
    let strapiProduct = null
    try {
      console.log('[API POST] 📚 Creando producto en Strapi...')
      
      const strapiProductData: any = {
        data: {
          nombre_libro: body.nombre_libro.trim(),
          isbn_libro: isbn,
          descripcion: body.descripcion?.trim() || '',
          subtitulo_libro: body.subtitulo_libro?.trim() || '',
          precio: body.precio || 0,
          stock_quantity: body.stock_quantity || 0,
          woocommerce_id: wooCommerceProduct.id.toString(), // Guardar ID de WooCommerce
        }
      }

      // Agregar imagen si existe
      if (body.portada_libro) {
        strapiProductData.data.portada_libro = body.portada_libro
      }

      strapiProduct = await strapiClient.post<any>('/api/libros', strapiProductData)
      console.log('[API POST] ✅ Producto creado en Strapi:', {
        id: strapiProduct.data?.id,
        documentId: strapiProduct.data?.documentId
      })
    } catch (strapiError: any) {
      console.error('[API POST] ⚠️ Error al crear producto en Strapi (no crítico):', strapiError.message)
      // No fallar si Strapi falla, el producto ya está en WooCommerce
    }

    return NextResponse.json({
      success: true,
      data: {
        woocommerce: wooCommerceProduct,
        strapi: strapiProduct?.data || null,
      },
      message: 'Producto creado exitosamente en WooCommerce' + (strapiProduct ? ' y Strapi' : ' (Strapi falló)')
    })

  } catch (error: any) {
    console.error('[API POST] ❌ ERROR al crear producto:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    // Si el error es por SKU duplicado en WooCommerce, regenerar automáticamente
    const isDuplicateSKU = error.message?.toLowerCase().includes('sku') || 
                          error.message?.toLowerCase().includes('duplicate') ||
                          error.message?.toLowerCase().includes('already exists')
    
    if (isDuplicateSKU && originalIsbn) {
      console.log('[API POST] 🔄 SKU/ISBN duplicado detectado en WooCommerce, regenerando automáticamente...')
      
      // Regenerar ISBN único
      const newIsbn = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      
      // Reintentar con nuevo ISBN
      try {
        const retryWooCommerceData: any = {
          name: body.nombre_libro.trim(),
          type: 'simple',
          status: 'publish',
          sku: newIsbn,
          regular_price: body.precio?.toString() || '0',
          description: body.descripcion?.trim() || '',
          short_description: body.subtitulo_libro?.trim() || '',
          manage_stock: body.manage_stock !== undefined ? body.manage_stock : true,
          stock_quantity: body.stock_quantity || 0,
          stock_status: body.stock_quantity > 0 ? 'instock' : 'outofstock',
        }

        // Agregar imagen si existe (misma lógica que arriba)
        if (body.portada_libro) {
          let imageUrl: string = ''
          
          if (typeof body.portada_libro === 'number' || (typeof body.portada_libro === 'string' && /^\d+$/.test(body.portada_libro))) {
            try {
              const imageId = typeof body.portada_libro === 'number' ? body.portada_libro : parseInt(body.portada_libro, 10)
              const strapiImageResponse = await strapiClient.get<any>(`upload/files/${imageId}`)
              
              if (strapiImageResponse?.url) {
                const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
                imageUrl = strapiImageResponse.url.startsWith('http') 
                  ? strapiImageResponse.url 
                  : `${baseUrl}${strapiImageResponse.url.startsWith('/') ? '' : '/'}${strapiImageResponse.url}`
              } else {
                const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
                imageUrl = `${baseUrl}/api/upload/files/${imageId}`
              }
            } catch (imageError: any) {
              const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
              const imageId = typeof body.portada_libro === 'number' ? body.portada_libro : parseInt(body.portada_libro, 10)
              imageUrl = `${baseUrl}/api/upload/files/${imageId}`
            }
          } else {
            imageUrl = String(body.portada_libro)
          }
          
          if (imageUrl && imageUrl.startsWith('http')) {
            retryWooCommerceData.images = [{
              src: imageUrl
            }]
          }
        }
        
        console.log('[API POST] 🔄 Reintentando con nuevo ISBN:', newIsbn)
        
        const retryResponse = await wooCommerceClient.post<any>('products', retryWooCommerceData)
        
        console.log('[API POST] ✅ Producto creado exitosamente con ISBN regenerado:', {
          id: retryResponse.id,
          sku: retryResponse.sku,
          name: retryResponse.name
        })

        // Crear en Strapi después
        let strapiProduct = null
        try {
          console.log('[API POST] 📚 Creando producto en Strapi con ISBN regenerado...')
          
          const strapiProductData: any = {
            data: {
              nombre_libro: body.nombre_libro.trim(),
              isbn_libro: newIsbn,
              descripcion: body.descripcion?.trim() || '',
              subtitulo_libro: body.subtitulo_libro?.trim() || '',
              precio: body.precio || 0,
              stock_quantity: body.stock_quantity || 0,
              woocommerce_id: retryResponse.id.toString(),
            }
          }

          if (body.portada_libro) {
            strapiProductData.data.portada_libro = body.portada_libro
          }

          strapiProduct = await strapiClient.post<any>('/api/libros', strapiProductData)
          console.log('[API POST] ✅ Producto creado en Strapi:', {
            id: strapiProduct.data?.id,
            documentId: strapiProduct.data?.documentId
          })
        } catch (strapiError: any) {
          console.error('[API POST] ⚠️ Error al crear producto en Strapi (no crítico):', strapiError.message)
        }
        
        return NextResponse.json({
          success: true,
          data: {
            woocommerce: retryResponse,
            strapi: strapiProduct?.data || null,
          },
          message: `Producto creado exitosamente. El ISBN "${originalIsbn}" ya existía en WooCommerce, se generó uno nuevo automáticamente: "${newIsbn}"`,
          isbnRegenerado: true,
          isbnOriginal: originalIsbn,
          isbnNuevo: newIsbn
        })
      } catch (retryError: any) {
        console.error('[API POST] ❌ Error en reintento:', retryError)
        return NextResponse.json({
          success: false,
          error: `El ISBN "${originalIsbn}" ya existe en WooCommerce y no se pudo generar uno nuevo automáticamente. Intenta con otro ISBN o déjalo vacío para generar uno automático.`,
          details: retryError.message
        }, { status: 400 })
      }
    }
    
    // Mensaje de error más específico para otros errores
    let errorMessage = 'Error al crear el producto en WooCommerce'
    
    if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.details
    }, { status: error.status || 500 })
  }
}

