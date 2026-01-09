/**
 * Utilidades para manejar direcciones detalladas en WooCommerce
 * Separa direcciones en campos específicos: calle, número, dpto, block, condominio
 */

export interface DetailedAddress {
  calle?: string
  numero?: string
  dpto?: string
  block?: string
  condominio?: string
  // Campos estándar de WooCommerce
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
}

/**
 * Construye address_1 y address_2 de WooCommerce desde campos detallados
 */
export function buildWooCommerceAddress(detailed: DetailedAddress): {
  address_1: string
  address_2: string
} {
  // Construir address_1: Calle + Número
  const address1Parts: string[] = []
  if (detailed.calle) address1Parts.push(detailed.calle)
  if (detailed.numero) address1Parts.push(detailed.numero)
  const address_1 = address1Parts.join(' ').trim() || detailed.address_1 || ''

  // Construir address_2: Dpto, Block, Condominio
  const address2Parts: string[] = []
  if (detailed.dpto) address2Parts.push(`Dpto ${detailed.dpto}`)
  if (detailed.block) address2Parts.push(`Block ${detailed.block}`)
  if (detailed.condominio) address2Parts.push(detailed.condominio)
  const address_2 = address2Parts.join(', ').trim() || detailed.address_2 || ''

  return { address_1, address_2 }
}

/**
 * Extrae campos detallados desde address_1 y address_2 de WooCommerce
 * (Intenta parsear si es posible)
 */
export function parseWooCommerceAddress(
  address_1: string = '',
  address_2: string = ''
): Partial<DetailedAddress> {
  const result: Partial<DetailedAddress> = {
    address_1,
    address_2,
  }

  // Intentar parsear address_1 (Calle + Número)
  // Ejemplo: "Av. Providencia 123" -> calle: "Av. Providencia", numero: "123"
  const address1Match = address_1.match(/^(.+?)\s+(\d+[A-Za-z]?)$/)
  if (address1Match) {
    result.calle = address1Match[1].trim()
    result.numero = address1Match[2].trim()
  } else {
    // Si no se puede parsear, poner todo en calle
    result.calle = address_1
  }

  // Intentar parsear address_2 (Dpto, Block, Condominio)
  // Ejemplo: "Dpto 101, Block A, Condominio Los Rosales"
  if (address_2) {
    const dptoMatch = address_2.match(/dpto\s*(\w+)/i)
    if (dptoMatch) result.dpto = dptoMatch[1]

    const blockMatch = address_2.match(/block\s*(\w+)/i)
    if (blockMatch) result.block = blockMatch[1]

    const condominioMatch = address_2.match(/condominio\s*(.+?)(?:,|$)/i)
    if (condominioMatch) {
      result.condominio = condominioMatch[1].trim()
    } else {
      // Si no hay "condominio" pero hay texto después de dpto/block
      const parts = address_2.split(',').map(p => p.trim())
      const condominioPart = parts.find(p => 
        !p.match(/^(dpto|block)/i) && p.length > 0
      )
      if (condominioPart) result.condominio = condominioPart
    }
  }

  return result
}

/**
 * Crea meta_data para guardar dirección detallada en WooCommerce
 */
export function createAddressMetaData(
  prefix: 'billing' | 'shipping',
  address: DetailedAddress
): Array<{ key: string; value: string }> {
  const metaData: Array<{ key: string; value: string }> = []

  if (address.calle) {
    metaData.push({
      key: `_${prefix}_calle`,
      value: address.calle,
    })
  }

  if (address.numero) {
    metaData.push({
      key: `_${prefix}_numero`,
      value: address.numero,
    })
  }

  if (address.dpto) {
    metaData.push({
      key: `_${prefix}_dpto`,
      value: address.dpto,
    })
  }

  if (address.block) {
    metaData.push({
      key: `_${prefix}_block`,
      value: address.block,
    })
  }

  if (address.condominio) {
    metaData.push({
      key: `_${prefix}_condominio`,
      value: address.condominio,
    })
  }

  return metaData
}
