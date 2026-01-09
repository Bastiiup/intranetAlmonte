/**
 * Utilidades para manejo de inventario/stock en Strapi y WooCommerce
 */

import strapiClient from '@/lib/strapi/client'
import { createWooCommerceClient } from '@/lib/woocommerce/client'

/**
 * Descuenta stock de un producto en Strapi
 * Maneja tanto el campo directo stock_quantity como la relación stocks
 * 
 * IMPORTANTE: productoId debe ser el documentId de Strapi, NO el ID de WooCommerce
 * Si se pasa un ID de WooCommerce, la función fallará y solo se descontará en WooCommerce
 */
export async function descontarStockEnStrapi(
  productoId: number | string,
  cantidadADescontar: number,
  platform?: 'woo_escolar' | 'woo_moraleja'
): Promise<{ success: boolean; stockActualizado?: number; error?: string }> {
  try {
    console.log(`[descontarStockEnStrapi] 🔍 Descontando ${cantidadADescontar} unidades del producto ${productoId}`)

    // 1. Obtener el producto de Strapi
    // El productoId debe ser el documentId de Strapi (NO el ID de WooCommerce)
    // Nota: stocks no se puede hacer populate directamente, y woocommerce_id no existe como campo filtrable
    let producto: any
    try {
      // Intentar obtener por ID de Strapi (sin populate de stocks ya que no existe o no es válido)
      const response = await strapiClient.get<any>(`/api/libros/${productoId}`)
      producto = response.data || response
      console.log(`[descontarStockEnStrapi] ✅ Producto encontrado por ID de Strapi: ${productoId}`)
    } catch (error: any) {
      // Si falla, el productoId probablemente no es un ID de Strapi válido
      console.error(`[descontarStockEnStrapi] ❌ Error al obtener producto ${productoId}:`, error.message)
      console.warn(`[descontarStockEnStrapi] ⚠️ El productoId ${productoId} puede ser un ID de WooCommerce, no de Strapi`)
      console.warn(`[descontarStockEnStrapi] ⚠️ Para descontar stock, necesitas el documentId de Strapi del producto`)
      return {
        success: false,
        error: `No se pudo obtener el producto en Strapi. El ID ${productoId} puede ser un ID de WooCommerce. Se necesita el documentId de Strapi.`,
      }
    }

    if (!producto) {
      return {
        success: false,
        error: 'Producto no encontrado en Strapi',
      }
    }

    const attrs = producto.attributes || producto

    // 2. Verificar si el producto tiene manage_stock activado
    // Primero intentar obtener desde WooCommerce si tenemos platform
    let manageStock = false
    if (platform) {
      try {
        const wooCommerceClient = createWooCommerceClient(platform)
        // Buscar producto en WooCommerce por ID de Strapi o por woocommerce_id
        const woocommerceId = attrs.woocommerce_id || attrs.WOOCOMMERCE_ID
        if (woocommerceId) {
          const wooProduct = await wooCommerceClient.get<any>(`products/${woocommerceId}`)
          manageStock = wooProduct.manage_stock === true
          console.log(`[descontarStockEnStrapi] 📦 manage_stock desde WooCommerce: ${manageStock}`)
        }
      } catch (wooError: any) {
        console.warn(`[descontarStockEnStrapi] ⚠️ No se pudo verificar manage_stock desde WooCommerce:`, wooError.message)
      }
    }

    // Si no se pudo obtener desde WooCommerce, intentar desde Strapi (si existe el campo)
    if (!manageStock) {
      manageStock = attrs.manage_stock === true || attrs.MANAGE_STOCK === true
      console.log(`[descontarStockEnStrapi] 📦 manage_stock desde Strapi: ${manageStock}`)
    }

    if (!manageStock) {
      console.log(`[descontarStockEnStrapi] ⏭️ Producto ${productoId} no tiene manage_stock activado, omitiendo descuento`)
      return {
        success: true, // No es un error, simplemente no se controla el stock
        error: 'Producto no tiene control de inventario activado',
      }
    }

    // 3. Obtener stock actual
    // Intentar primero desde campo directo stock_quantity
    let stockActual: number | null = null
    const stockDirecto = attrs.stock_quantity || attrs.STOCK_QUANTITY || attrs.stockQuantity
    if (stockDirecto !== undefined && stockDirecto !== null && stockDirecto !== '') {
      stockActual = parseInt(stockDirecto.toString())
      if (!isNaN(stockActual) && stockActual >= 0) {
        console.log(`[descontarStockEnStrapi] 📊 Stock directo encontrado: ${stockActual}`)
      }
    }

    // Si no hay stock directo, intentar calcular desde la relación stocks
    // Nota: stocks puede no estar disponible si no se hizo populate (y no se puede hacer populate)
    if (stockActual === null) {
      // Intentar obtener stocks manualmente si no están en el producto
      // Pero como no podemos hacer populate, asumimos que si no está en stock_quantity, no hay stock
      const stocks = attrs.stocks?.data || attrs.STOCKS?.data || attrs.stocks || attrs.STOCKS || []
      if (Array.isArray(stocks) && stocks.length > 0) {
        stockActual = stocks.reduce((total: number, stock: any) => {
          const cantidad = stock.attributes?.CANTIDAD || stock.attributes?.cantidad || stock.CANTIDAD || stock.cantidad || 0
          return total + (typeof cantidad === 'number' ? cantidad : parseInt(cantidad.toString()) || 0)
        }, 0)
        console.log(`[descontarStockEnStrapi] 📊 Stock calculado desde relación: ${stockActual}`)
      } else {
        // Si no hay stock_quantity ni stocks, asumir 0
        stockActual = 0
        console.log(`[descontarStockEnStrapi] ⚠️ No se encontró stock (ni stock_quantity ni stocks), asumiendo 0`)
      }
    }

    if (stockActual === null) {
      stockActual = 0
    }

    // 4. Verificar que hay suficiente stock
    if (stockActual < cantidadADescontar) {
      console.warn(`[descontarStockEnStrapi] ⚠️ Stock insuficiente: ${stockActual} < ${cantidadADescontar}`)
      return {
        success: false,
        error: `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidadADescontar}`,
      }
    }

    // 5. Calcular nuevo stock
    const nuevoStock = stockActual - cantidadADescontar
    console.log(`[descontarStockEnStrapi] 🔄 Stock: ${stockActual} - ${cantidadADescontar} = ${nuevoStock}`)

    // 6. Actualizar stock en Strapi
    // Intentar actualizar campo directo primero
    const documentId = producto.documentId || producto.id
    if (!documentId) {
      return {
        success: false,
        error: 'No se pudo obtener documentId del producto',
      }
    }

    try {
      // Si existe stock_quantity directo, actualizarlo
      if (stockDirecto !== undefined && stockDirecto !== null && stockDirecto !== '') {
        await strapiClient.put<any>(`/api/libros/${documentId}`, {
          data: {
            stock_quantity: nuevoStock,
            stock_status: nuevoStock > 0 ? 'instock' : 'outofstock',
          },
        })
        console.log(`[descontarStockEnStrapi] ✅ Stock actualizado (campo directo): ${nuevoStock}`)
      } else {
        // Si no, actualizar la relación stocks
        // Buscar el primer stock relacionado y actualizarlo
        const stocks = attrs.stocks?.data || attrs.STOCKS?.data || []
        if (stocks.length > 0) {
          const primerStock = stocks[0]
          const stockDocumentId = primerStock.documentId || primerStock.id
          if (stockDocumentId) {
            await strapiClient.put<any>(`/api/stocks/${stockDocumentId}`, {
              data: {
                cantidad: nuevoStock,
                CANTIDAD: nuevoStock,
              },
            })
            console.log(`[descontarStockEnStrapi] ✅ Stock actualizado (relación stocks): ${nuevoStock}`)
          } else {
            // Si no hay stocks, crear uno nuevo
            const nuevoStockRecord = await strapiClient.post<any>('/api/stocks', {
              data: {
                cantidad: nuevoStock,
                CANTIDAD: nuevoStock,
                libro: documentId,
              },
            })
            console.log(`[descontarStockEnStrapi] ✅ Stock creado (nuevo registro): ${nuevoStock}`)
          }
        } else {
          // No hay stocks, crear uno nuevo
          const nuevoStockRecord = await strapiClient.post<any>('/api/stocks', {
            data: {
              cantidad: nuevoStock,
              CANTIDAD: nuevoStock,
              libro: documentId,
            },
          })
          console.log(`[descontarStockEnStrapi] ✅ Stock creado (sin registros previos): ${nuevoStock}`)
        }
      }

      return {
        success: true,
        stockActualizado: nuevoStock,
      }
    } catch (updateError: any) {
      console.error(`[descontarStockEnStrapi] ❌ Error al actualizar stock:`, updateError.message)
      return {
        success: false,
        error: `Error al actualizar stock: ${updateError.message}`,
      }
    }
  } catch (error: any) {
    console.error(`[descontarStockEnStrapi] ❌ Excepción:`, error.message)
    return {
      success: false,
      error: error.message || 'Error desconocido al descontar stock',
    }
  }
}

/**
 * Descuenta stock de un producto en WooCommerce
 * WooCommerce descuenta automáticamente cuando el pedido tiene status 'completed'
 * Esta función es para asegurar que el stock esté actualizado si es necesario
 */
export async function descontarStockEnWooCommerce(
  productId: number,
  cantidadADescontar: number,
  platform: 'woo_escolar' | 'woo_moraleja'
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[descontarStockEnWooCommerce] 🔍 Descontando ${cantidadADescontar} unidades del producto ${productId} en ${platform}`)

    const wooCommerceClient = createWooCommerceClient(platform)

    // Obtener producto actual
    const producto = await wooCommerceClient.get<any>(`products/${productId}`)

    if (!producto.manage_stock) {
      console.log(`[descontarStockEnWooCommerce] ⏭️ Producto ${productId} no tiene manage_stock activado`)
      return {
        success: true,
      }
    }

    const stockActual = producto.stock_quantity || 0
    const nuevoStock = Math.max(0, stockActual - cantidadADescontar)

    // Actualizar stock
    await wooCommerceClient.put<any>(`products/${productId}`, {
      stock_quantity: nuevoStock,
      stock_status: nuevoStock > 0 ? 'instock' : 'outofstock',
    })

    console.log(`[descontarStockEnWooCommerce] ✅ Stock actualizado en WooCommerce: ${stockActual} - ${cantidadADescontar} = ${nuevoStock}`)

    return {
      success: true,
    }
  } catch (error: any) {
    console.error(`[descontarStockEnWooCommerce] ❌ Error:`, error.message)
    return {
      success: false,
      error: error.message || 'Error desconocido al descontar stock en WooCommerce',
    }
  }
}

