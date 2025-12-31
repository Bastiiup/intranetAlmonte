/**
 * Utilidades para manejo de códigos de barras
 */

/**
 * Valida si un string es un código de barras válido
 */
export function isValidBarcode(code: string): boolean {
  // Códigos de barras comunes: EAN-13 (13 dígitos), EAN-8 (8 dígitos), UPC-A (12 dígitos)
  const barcodeRegex = /^[0-9]{8,13}$/
  return barcodeRegex.test(code.trim())
}

/**
 * Normaliza un código de barras (elimina espacios y caracteres especiales)
 */
export function normalizeBarcode(code: string): string {
  return code.trim().replace(/[^0-9]/g, '')
}

/**
 * Busca un producto por código de barras (SKU)
 */
export async function searchProductByBarcode(barcode: string): Promise<any | null> {
  try {
    const normalizedBarcode = normalizeBarcode(barcode)
    
    if (!normalizedBarcode) {
      return null
    }

    // Buscar por SKU en WooCommerce (POS solo usa Escolar)
    const response = await fetch(`/api/woocommerce/products?search=${encodeURIComponent(normalizedBarcode)}&per_page=1&platform=escolar`)
    const data = await response.json()

    if (data.success && data.data && data.data.length > 0) {
      // Verificar que el SKU coincida exactamente
      const product = data.data.find((p: any) => 
        p.sku === normalizedBarcode || p.sku === barcode
      )
      
      return product || (data.data.length > 0 ? data.data[0] : null)
    }

    return null
  } catch (error) {
    console.error('Error al buscar producto por código de barras:', error)
    return null
  }
}

