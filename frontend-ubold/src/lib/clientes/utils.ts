/**
 * Utilidades para manejo de clientes
 * Incluye funciones para parsear nombres y enviar a múltiples sistemas
 */

/**
 * Parsea un nombre completo en nombres y apellidos
 */
export function parseNombreCompleto(nombreCompleto: string): {
  nombres: string
  primer_apellido: string
  segundo_apellido: string | null
} {
  const partes = nombreCompleto.trim().split(/\s+/).filter(p => p.length > 0)
  
  if (partes.length === 0) {
    return {
      nombres: '',
      primer_apellido: '',
      segundo_apellido: null,
    }
  }
  
  if (partes.length === 1) {
    return {
      nombres: partes[0],
      primer_apellido: '',
      segundo_apellido: null,
    }
  }
  
  if (partes.length === 2) {
    return {
      nombres: partes[0],
      primer_apellido: partes[1],
      segundo_apellido: null,
    }
  }
  
  // Si hay 3 o más partes, asumimos que las primeras son nombres y las últimas son apellidos
  // Normalmente en Chile: nombres van primero, luego apellidos
  const nombres = partes.slice(0, -2).join(' ')
  const primer_apellido = partes[partes.length - 2]
  const segundo_apellido = partes[partes.length - 1]
  
  return {
    nombres,
    primer_apellido,
    segundo_apellido,
  }
}

/**
 * Busca un cliente en WooCommerce por email
 */
export async function buscarClientePorEmail(
  url: string,
  consumerKey: string,
  consumerSecret: string,
  email: string
): Promise<{ success: boolean; customer?: any; error?: string }> {
  try {
    const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
    const apiUrl = `${url}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&per_page=1`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`,
      }
    }
    
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      return {
        success: true,
        customer: data[0],
      }
    }
    
    return {
      success: false,
      error: 'Cliente no encontrado',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al buscar cliente en WooCommerce',
    }
  }
}

/**
 * Crea o actualiza un cliente en un WordPress/WooCommerce específico
 * Si el cliente existe (por email), lo actualiza. Si no, lo crea.
 */
export async function createOrUpdateClienteEnWooCommerce(
  url: string,
  consumerKey: string,
  consumerSecret: string,
  clienteData: {
    email: string
    first_name: string
    last_name?: string
  }
): Promise<{ success: boolean; data?: any; error?: string; created?: boolean }> {
  try {
    // Primero buscar si existe
    const searchResult = await buscarClientePorEmail(url, consumerKey, consumerSecret, clienteData.email)
    
    const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
    
    if (searchResult.success && searchResult.customer) {
      // Actualizar cliente existente
      const apiUrl = `${url}/wp-json/wc/v3/customers/${searchResult.customer.id}`
      const updateData = {
        email: clienteData.email,
        first_name: clienteData.first_name,
        last_name: clienteData.last_name || '',
      }
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(updateData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || `HTTP error! status: ${response.status}`,
        }
      }
      
      const data = await response.json()
      return {
        success: true,
        data,
        created: false,
      }
    } else {
      // Crear nuevo cliente
      const apiUrl = `${url}/wp-json/wc/v3/customers`
      const customerData = {
        email: clienteData.email,
        first_name: clienteData.first_name,
        last_name: clienteData.last_name || '',
        username: clienteData.email.split('@')[0] + '_' + Date.now(),
        password: `temp_${Date.now()}`,
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(customerData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || `HTTP error! status: ${response.status}`,
        }
      }
      
      const data = await response.json()
      return {
        success: true,
        data,
        created: true,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al crear/actualizar cliente en WooCommerce',
    }
  }
}

/**
 * Envía cliente a ambos WordPress (Librería Escolar y Editorial Moraleja)
 * Busca por email primero, si existe lo actualiza, si no existe lo crea
 */
export async function enviarClienteABothWordPress(
  clienteData: {
    email: string
    first_name: string
    last_name?: string
  }
): Promise<{
  escolar: { success: boolean; data?: any; error?: string; created?: boolean }
  moraleja: { success: boolean; data?: any; error?: string; created?: boolean }
}> {
  // URLs de los WordPress
  // Si no hay URLs específicas, usar las default (pueden ser las mismas o diferentes según configuración)
  const escolarUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR || process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || 'https://staging.escolar.cl'
  const moralejaUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA || 'https://staging.moraleja.cl'
  
  // Credenciales para Librería Escolar
  const escolarKey = process.env.WOOCOMMERCE_CONSUMER_KEY_ESCOLAR || process.env.WOOCOMMERCE_CONSUMER_KEY || ''
  const escolarSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET_ESCOLAR || process.env.WOOCOMMERCE_CONSUMER_SECRET || ''
  
  // Credenciales para Editorial Moraleja
  const moralejaKey = process.env.WOOCOMMERCE_CONSUMER_KEY_MORALEJA || process.env.WOOCOMMERCE_CONSUMER_KEY || ''
  const moralejaSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET_MORALEJA || process.env.WOOCOMMERCE_CONSUMER_SECRET || ''
  
  // Enviar a ambos en paralelo (buscará por email y actualizará o creará según corresponda)
  const [escolarResult, moralejaResult] = await Promise.all([
    createOrUpdateClienteEnWooCommerce(escolarUrl, escolarKey, escolarSecret, clienteData),
    createOrUpdateClienteEnWooCommerce(moralejaUrl, moralejaKey, moralejaSecret, clienteData),
  ])
  
  return {
    escolar: escolarResult,
    moraleja: moralejaResult,
  }
}

