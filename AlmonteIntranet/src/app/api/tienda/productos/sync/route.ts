/**
 * API Route para sincronizar productos desde WooCommerce a Strapi
 * 
 * Obtiene productos de ambas plataformas WooCommerce (Escolar y Moraleja)
 * y crea en Strapi solo los productos que no existen
 */

import { NextRequest, NextResponse } from 'next/server'
import { createWooCommerceClient } from '@/lib/woocommerce/client'
import strapiClient from '@/lib/strapi/client'
import { getWooCommerceCredentials } from '@/lib/woocommerce/config'

export const dynamic = 'force-dynamic'

// Función para sincronizar productos de una plataforma
async function syncProductsFromPlatform(platform: 'woo_moraleja' | 'woo_escolar') {
  const wcClient = createWooCommerceClient(platform)
  const results = {
    platform,
    total: 0,
    created: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    console.log(`[Sync Products ${platform}] 🔄 Obteniendo productos de WooCommerce...`)
    
    // Obtener todos los productos de WooCommerce con paginación
    let allProducts: any[] = []
    let page = 1
    const perPage = 100
    let hasMore = true

    while (hasMore) {
      const wooProductsResponse = await wcClient.get<any>('products', {
        per_page: perPage,
        page: page,
        status: 'publish', // Solo productos publicados
      })

      // Manejar diferentes formatos de respuesta de WooCommerce
      let products: any[] = []
      if (Array.isArray(wooProductsResponse)) {
        products = wooProductsResponse
      } else if (wooProductsResponse && typeof wooProductsResponse === 'object' && 'data' in wooProductsResponse) {
        products = Array.isArray(wooProductsResponse.data) ? wooProductsResponse.data : []
      }
      
      if (products.length === 0) {
        hasMore = false
      } else {
        allProducts = allProducts.concat(products)
        // Si obtenemos menos de perPage, significa que no hay más páginas
        if (products.length < perPage) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    results.total = allProducts.length
    console.log(`[Sync Products ${platform}] ✅ Obtenidos ${allProducts.length} productos de WooCommerce`)

    // Obtener productos existentes en Strapi (por SKU y woocommerce_id)
    const strapiResponse = await strapiClient.get<any>(
      `/api/libros?fields[0]=isbn_libro&fields[1]=woocommerce_id&fields[2]=externalIds&pagination[pageSize]=5000&publicationState=preview`
    )
    
    let strapiProducts: any[] = []
    if (strapiResponse.data) {
      strapiProducts = Array.isArray(strapiResponse.data) ? strapiResponse.data : [strapiResponse.data]
    }

    // Crear un Set de SKUs y woocommerce_ids existentes para búsqueda rápida
    const existingSkus = new Set<string>()
    const existingWooIds = new Set<number>()
    
    strapiProducts.forEach((product: any) => {
      const attrs = product.attributes || product
      const sku = attrs.isbn_libro || attrs.isbnLibro
      if (sku) existingSkus.add(String(sku).trim().toLowerCase())
      
      const wooId = attrs.woocommerce_id || attrs.wooId
      if (wooId) existingWooIds.add(Number(wooId))
      
      // También verificar en externalIds
      const externalIds = attrs.externalIds || {}
      if (externalIds.wooCommerce?.id) {
        existingWooIds.add(Number(externalIds.wooCommerce.id))
      }
    })

    console.log(`[Sync Products ${platform}] 📊 Productos existentes en Strapi: ${existingSkus.size} por SKU, ${existingWooIds.size} por WooCommerce ID`)

    // Obtener IDs de canales desde Strapi
    let canalId: number | null = null
    try {
      const canalesResponse = await strapiClient.get<any>('/api/canales?pagination[pageSize]=100')
      if (canalesResponse.data) {
        const canales = Array.isArray(canalesResponse.data) ? canalesResponse.data : [canalesResponse.data]
        const canal = canales.find((c: any) => {
          const attrs = c.attributes || c
          const key = attrs.key || attrs.nombre?.toLowerCase()
          return (
            (platform === 'woo_moraleja' && (key === 'moraleja' || key === 'woo_moraleja')) ||
            (platform === 'woo_escolar' && (key === 'escolar' || key === 'woo_escolar'))
          )
        })
        if (canal) {
          canalId = Number(canal.documentId || canal.id)
          console.log(`[Sync Products ${platform}] ✅ Canal encontrado: ID ${canalId}`)
        }
      }
    } catch (err: any) {
      console.warn(`[Sync Products ${platform}] ⚠️ No se pudo obtener canales:`, err.message)
    }

    // Procesar productos en lotes
    const batchSize = 10
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize)
      
      for (const wooProduct of batch) {
        try {
          const sku = (wooProduct.sku || '').trim().toLowerCase()
          const wooId = Number(wooProduct.id)
          
          // Verificar si el producto ya existe
          const existsBySku = sku && existingSkus.has(sku)
          const existsByWooId = existingWooIds.has(wooId)
          
          if (existsBySku || existsByWooId) {
            results.skipped++
            console.log(`[Sync Products ${platform}] ⏭️ Producto ya existe (SKU: ${sku}, WooCommerce ID: ${wooId})`)
            continue
          }

          // Preparar datos del producto para Strapi
          const productName = wooProduct.name || 'Producto sin nombre'
          const price = parseFloat(wooProduct.regular_price || wooProduct.price || '0')
          const salePrice = parseFloat(wooProduct.sale_price || '0')
          
          // Generar SKU si no existe
          const finalSku = sku || `WOO-${platform}-${wooId}-${Date.now()}`
          
          // Preparar descripción
          const description = wooProduct.description || wooProduct.short_description || ''
          const shortDescription = wooProduct.short_description || ''
          
          // Preparar imágenes
          const images = Array.isArray(wooProduct.images) ? wooProduct.images : []
          const mainImage = images.length > 0 ? images[0].src : null
          
          // Construir datos para Strapi
          const strapiProductData: any = {
            data: {
              nombre_libro: productName,
              isbn_libro: finalSku,
              descripcion: description || '<p>Sin descripción</p>',
              descripcion_corta: shortDescription || '<p>Sin descripción corta</p>',
              precio: price,
              precio_oferta: salePrice > 0 ? salePrice : null,
              stock_quantity: Number(wooProduct.stock_quantity || 0),
              estado_publicacion: 'Publicado',
              woocommerce_id: wooId,
              externalIds: {
                wooCommerce: {
                  id: wooId,
                  sku: finalSku,
                },
                originPlatform: platform,
              },
              raw_woo_data: wooProduct,
            },
          }

          // Agregar imagen si existe
          if (mainImage) {
            strapiProductData.data.imagen_principal = mainImage
          }

          // Agregar canal si se encontró
          if (canalId) {
            strapiProductData.data.canales = [canalId]
          }

          // Crear producto en Strapi
          console.log(`[Sync Products ${platform}] ➕ Creando producto: ${productName} (SKU: ${finalSku})`)
          const createdProduct = await strapiClient.post<any>('/api/libros', strapiProductData)
          
          if (createdProduct.data) {
            results.created++
            const newSku = finalSku.toLowerCase()
            const newWooId = wooId
            existingSkus.add(newSku)
            existingWooIds.add(newWooId)
            console.log(`[Sync Products ${platform}] ✅ Producto creado: ${productName}`)
          }
        } catch (err: any) {
          const errorMsg = `Error al crear producto ${wooProduct.name || 'sin nombre'}: ${err.message}`
          results.errors.push(errorMsg)
          console.error(`[Sync Products ${platform}] ❌ ${errorMsg}`)
        }
      }
    }

    console.log(`[Sync Products ${platform}] ✅ Sincronización completada: ${results.created} creados, ${results.skipped} omitidos, ${results.errors.length} errores`)
    
    return results
  } catch (error: any) {
    console.error(`[Sync Products ${platform}] ❌ Error general:`, error)
    results.errors.push(`Error general: ${error.message}`)
    return results
  }
}

// Función para sincronizar productos desde Strapi a WooCommerce
async function syncProductsToWooCommerce(platform: 'woo_moraleja' | 'woo_escolar') {
  const wcClient = createWooCommerceClient(platform)
  const results = {
    platform,
    total: 0,
    created: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    console.log(`[Sync To WooCommerce ${platform}] 🔄 Obteniendo productos de Strapi con canal ${platform}...`)
    
    // Obtener ID del canal desde Strapi
    let canalId: number | null = null
    try {
      const canalesResponse = await strapiClient.get<any>('/api/canales?pagination[pageSize]=100')
      if (canalesResponse.data) {
        const canales = Array.isArray(canalesResponse.data) ? canalesResponse.data : [canalesResponse.data]
        const canal = canales.find((c: any) => {
          const attrs = c.attributes || c
          const key = attrs.key || attrs.nombre?.toLowerCase()
          return (
            (platform === 'woo_moraleja' && (key === 'moraleja' || key === 'woo_moraleja')) ||
            (platform === 'woo_escolar' && (key === 'escolar' || key === 'woo_escolar'))
          )
        })
        if (canal) {
          canalId = Number(canal.documentId || canal.id)
          console.log(`[Sync To WooCommerce ${platform}] ✅ Canal encontrado: ID ${canalId}`)
        }
      }
    } catch (err: any) {
      console.warn(`[Sync To WooCommerce ${platform}] ⚠️ No se pudo obtener canales:`, err.message)
    }

    if (!canalId) {
      results.errors.push(`No se encontró el canal para ${platform}`)
      return results
    }

    // Obtener productos de Strapi con este canal y estado Publicado
    const strapiResponse = await strapiClient.get<any>(
      `/api/libros?populate[canales]=*&filters[estado_publicacion][$eq]=Publicado&pagination[pageSize]=1000&publicationState=preview`
    )
    
    let strapiProducts: any[] = []
    if (strapiResponse.data) {
      strapiProducts = Array.isArray(strapiResponse.data) ? strapiResponse.data : [strapiResponse.data]
    }

    // Filtrar productos que tienen el canal asignado
    const productosConCanal = strapiProducts.filter((product: any) => {
      const attrs = product.attributes || product
      const canales = attrs.canales?.data || attrs.canales || []
      return canales.some((c: any) => {
        const canalDocId = c.documentId || c.id
        return Number(canalDocId) === canalId
      })
    })

    results.total = productosConCanal.length
    console.log(`[Sync To WooCommerce ${platform}] ✅ Encontrados ${productosConCanal.length} productos en Strapi con canal ${platform}`)

    // Obtener productos existentes en WooCommerce (por SKU)
    let existingWooProducts = new Set<string>()
    try {
      let page = 1
      let hasMore = true
      while (hasMore) {
        const wooProducts = await wcClient.get<any>('products', {
          per_page: 100,
          page: page,
          status: 'any', // Obtener todos los estados
        })
        
        const products = Array.isArray(wooProducts) ? wooProducts : []
        if (products.length === 0) {
          hasMore = false
        } else {
          products.forEach((p: any) => {
            if (p.sku) existingWooProducts.add(p.sku.toLowerCase().trim())
          })
          hasMore = products.length === 100
          page++
        }
      }
      console.log(`[Sync To WooCommerce ${platform}] 📊 Productos existentes en WooCommerce: ${existingWooProducts.size}`)
    } catch (err: any) {
      console.warn(`[Sync To WooCommerce ${platform}] ⚠️ Error al obtener productos de WooCommerce:`, err.message)
    }

    // Procesar productos en lotes
    const batchSize = 5
    for (let i = 0; i < productosConCanal.length; i += batchSize) {
      const batch = productosConCanal.slice(i, i + batchSize)
      
      for (const strapiProduct of batch) {
        try {
          const attrs = strapiProduct.attributes || strapiProduct
          const sku = (attrs.isbn_libro || attrs.isbnLibro || '').trim().toLowerCase()
          const wooId = attrs.woocommerce_id || attrs.wooId
          
          // Si ya tiene woocommerce_id, verificar si existe en WooCommerce
          if (wooId) {
            try {
              await wcClient.get<any>(`products/${wooId}`)
              results.skipped++
              console.log(`[Sync To WooCommerce ${platform}] ⏭️ Producto ya existe en WooCommerce (ID: ${wooId})`)
              continue
            } catch {
              // Si no existe, continuar para crearlo
            }
          }
          
          // Si el SKU ya existe en WooCommerce, omitir
          if (sku && existingWooProducts.has(sku)) {
            results.skipped++
            console.log(`[Sync To WooCommerce ${platform}] ⏭️ Producto ya existe en WooCommerce (SKU: ${sku})`)
            continue
          }

          // Preparar datos para WooCommerce
          const productName = attrs.nombre_libro || attrs.nombreLibro || 'Producto sin nombre'
          const price = parseFloat(attrs.precio || '0')
          const salePrice = parseFloat(attrs.precio_oferta || attrs.precioOferta || '0')
          const stockQuantity = Number(attrs.stock_quantity || attrs.stockQuantity || 0)
          
          // Obtener descripción
          let description = ''
          if (attrs.descripcion) {
            // Si es un array de blocks (Rich Text), convertir a HTML
            if (Array.isArray(attrs.descripcion)) {
              description = attrs.descripcion.map((block: any) => {
                if (block.type === 'paragraph' && block.children) {
                  return `<p>${block.children.map((c: any) => c.text || '').join('')}</p>`
                }
                return ''
              }).join('')
            } else if (typeof attrs.descripcion === 'string') {
              description = attrs.descripcion
            }
          }
          
          let shortDescription = ''
          if (attrs.descripcion_corta || attrs.descripcionCorta) {
            if (Array.isArray(attrs.descripcion_corta || attrs.descripcionCorta)) {
              shortDescription = (attrs.descripcion_corta || attrs.descripcionCorta).map((block: any) => {
                if (block.type === 'paragraph' && block.children) {
                  return `<p>${block.children.map((c: any) => c.text || '').join('')}</p>`
                }
                return ''
              }).join('')
            } else {
              shortDescription = attrs.descripcion_corta || attrs.descripcionCorta || ''
            }
          }

          // Obtener imagen
          let imageUrl = ''
          if (attrs.imagen_principal || attrs.imagenPrincipal) {
            imageUrl = attrs.imagen_principal || attrs.imagenPrincipal
          } else if (attrs.portada_libro?.data) {
            const portada = attrs.portada_libro.data
            const portadaAttrs = portada.attributes || portada
            const url = portadaAttrs.url || portadaAttrs.URL
            if (url) {
              const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi-pruebas-production.up.railway.app'
              imageUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
            }
          }

          // Construir datos para WooCommerce
          const wooProductData: any = {
            name: productName,
            type: 'simple',
            status: 'publish',
            description: description || '<p>Sin descripción</p>',
            short_description: shortDescription || '<p>Sin descripción corta</p>',
            regular_price: price > 0 ? price.toFixed(2) : '0.00',
            sale_price: salePrice > 0 ? salePrice.toFixed(2) : '',
            manage_stock: true,
            stock_quantity: stockQuantity,
            stock_status: stockQuantity > 0 ? 'instock' : 'outofstock',
            backorders: 'no',
            sku: sku || `STRAPI-${platform}-${Date.now()}`,
          }

          if (imageUrl) {
            wooProductData.images = [{
              src: imageUrl,
              name: productName,
              alt: productName
            }]
          }

          // Crear producto en WooCommerce
          console.log(`[Sync To WooCommerce ${platform}] ➕ Creando producto en WooCommerce: ${productName} (SKU: ${sku})`)
          const createdWooProduct = await wcClient.post<any>('products', wooProductData)
          
          if (createdWooProduct && createdWooProduct.id) {
            results.created++
            const newSku = sku.toLowerCase()
            existingWooProducts.add(newSku)
            console.log(`[Sync To WooCommerce ${platform}] ✅ Producto creado en WooCommerce: ${productName} (ID: ${createdWooProduct.id})`)
            
            // Actualizar woocommerce_id en Strapi
            try {
              const productId = strapiProduct.documentId || strapiProduct.id
              await strapiClient.put(`/api/libros/${productId}`, {
                data: {
                  woocommerce_id: createdWooProduct.id,
                  externalIds: {
                    wooCommerce: {
                      id: createdWooProduct.id,
                      sku: sku,
                    },
                    originPlatform: platform,
                  }
                }
              })
              console.log(`[Sync To WooCommerce ${platform}] ✅ woocommerce_id actualizado en Strapi`)
            } catch (updateErr: any) {
              console.warn(`[Sync To WooCommerce ${platform}] ⚠️ No se pudo actualizar woocommerce_id en Strapi:`, updateErr.message)
            }
          }
        } catch (err: any) {
          const errorMsg = `Error al crear producto ${strapiProduct.attributes?.nombre_libro || 'sin nombre'}: ${err.message}`
          results.errors.push(errorMsg)
          console.error(`[Sync To WooCommerce ${platform}] ❌ ${errorMsg}`)
        }
      }
    }

    console.log(`[Sync To WooCommerce ${platform}] ✅ Sincronización completada: ${results.created} creados, ${results.skipped} omitidos, ${results.errors.length} errores`)
    
    return results
  } catch (error: any) {
    console.error(`[Sync To WooCommerce ${platform}] ❌ Error general:`, error)
    results.errors.push(`Error general: ${error.message}`)
    return results
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const platforms = body.platforms || ['woo_moraleja', 'woo_escolar']
    const direction = body.direction || 'from_woocommerce' // 'from_woocommerce' o 'to_woocommerce'
    
    console.log(`[Sync Products] 🚀 Iniciando sincronización (dirección: ${direction})...`)

    const results = []
    
    if (direction === 'to_woocommerce') {
      // Sincronizar desde Strapi a WooCommerce
      for (const platform of platforms) {
        if (platform === 'woo_moraleja' || platform === 'woo_escolar') {
          const result = await syncProductsToWooCommerce(platform)
          results.push(result)
        }
      }
    } else {
      // Sincronizar desde WooCommerce a Strapi (comportamiento original)
      for (const platform of platforms) {
        if (platform === 'woo_moraleja' || platform === 'woo_escolar') {
          const result = await syncProductsFromPlatform(platform)
          results.push(result)
        }
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
    const totalProducts = results.reduce((sum, r) => sum + r.total, 0)

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${totalCreated} productos creados, ${totalSkipped} omitidos`,
      results,
      summary: {
        totalProducts,
        totalCreated,
        totalSkipped,
        totalErrors,
      },
      direction,
    })
  } catch (error: any) {
    console.error('[Sync Products] ❌ Error:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al sincronizar productos',
    }, { status: 500 })
  }
}
