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
    // Validar que tengamos los datos necesarios
    if (!url || !consumerKey || !consumerSecret) {
      return {
        success: false,
        error: 'URL o credenciales no configuradas',
      }
    }
    
    console.log(`[createOrUpdateClienteEnWooCommerce] 🔍 Buscando cliente en ${url}...`)
    
    // Primero buscar si existe
    const searchResult = await buscarClientePorEmail(url, consumerKey, consumerSecret, clienteData.email)
    
    const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
    
    if (searchResult.success && searchResult.customer) {
      // Actualizar cliente existente
      console.log(`[createOrUpdateClienteEnWooCommerce] ✏️ Cliente existente encontrado (ID: ${searchResult.customer.id}), actualizando...`)
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
        const errorMsg = errorData.message || `HTTP error! status: ${response.status}`
        console.error(`[createOrUpdateClienteEnWooCommerce] ❌ Error al actualizar: ${errorMsg}`)
        return {
          success: false,
          error: errorMsg,
        }
      }
      
      const data = await response.json()
      console.log(`[createOrUpdateClienteEnWooCommerce] ✅ Cliente actualizado exitosamente (ID: ${data.id})`)
      return {
        success: true,
        data,
        created: false,
      }
    } else {
      // Crear nuevo cliente
      console.log(`[createOrUpdateClienteEnWooCommerce] ➕ Cliente no encontrado, creando nuevo...`)
      const apiUrl = `${url}/wp-json/wc/v3/customers`
      const customerData = {
        email: clienteData.email,
        first_name: clienteData.first_name,
        last_name: clienteData.last_name || '',
        username: clienteData.email.split('@')[0] + '_' + Date.now(),
        password: `temp_${Date.now()}`,
      }
      
      console.log(`[createOrUpdateClienteEnWooCommerce] 📤 Enviando datos a ${apiUrl}...`)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(customerData),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData: any = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }
        const errorMsg = errorData.message || errorData.code || `HTTP error! status: ${response.status}`
        console.error(`[createOrUpdateClienteEnWooCommerce] ❌ Error al crear: ${errorMsg}`)
        console.error(`[createOrUpdateClienteEnWooCommerce] Respuesta completa:`, errorText)
        return {
          success: false,
          error: errorMsg,
        }
      }
      
      const data = await response.json()
      console.log(`[createOrUpdateClienteEnWooCommerce] ✅ Cliente creado exitosamente (ID: ${data.id})`)
      return {
        success: true,
        data,
        created: true,
      }
    }
  } catch (error: any) {
    console.error(`[createOrUpdateClienteEnWooCommerce] ❌ Excepción:`, error.message)
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
  const escolarUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR || process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || ''
  const moralejaUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA || ''
  
  // Credenciales para Librería Escolar
  const escolarKey = process.env.WOO_ESCOLAR_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY || ''
  const escolarSecret = process.env.WOO_ESCOLAR_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET || ''
  
  // Credenciales para Editorial Moraleja (DEBE tener credenciales específicas)
  const moralejaKey = process.env.WOO_MORALEJA_CONSUMER_KEY || ''
  const moralejaSecret = process.env.WOO_MORALEJA_CONSUMER_SECRET || ''
  
  // Log para debugging
  console.log('[enviarClienteABothWordPress] Configuración:', {
    escolarUrl: escolarUrl ? '✅ Configurada' : '❌ No configurada',
    escolarKey: escolarKey ? '✅ Configurada' : '❌ No configurada',
    escolarSecret: escolarSecret ? '✅ Configurada' : '❌ No configurada',
    moralejaUrl: moralejaUrl ? '✅ Configurada' : '❌ No configurada',
    moralejaKey: moralejaKey ? '✅ Configurada' : '❌ No configurada',
    moralejaSecret: moralejaSecret ? '✅ Configurada' : '❌ No configurada',
  })
  
  // Validar que ambas URLs y credenciales estén configuradas
  if (!escolarUrl || !escolarKey || !escolarSecret) {
    console.error('[enviarClienteABothWordPress] ❌ Credenciales de Librería Escolar no configuradas')
  }
  
  if (!moralejaUrl || !moralejaKey || !moralejaSecret) {
    console.error('[enviarClienteABothWordPress] ❌ Credenciales de Editorial Moraleja no configuradas')
    console.error('[enviarClienteABothWordPress] Variables requeridas:')
    console.error('  - NEXT_PUBLIC_WOOCOMMERCE_URL_MORALEJA')
    console.error('  - WOO_MORALEJA_CONSUMER_KEY')
    console.error('  - WOO_MORALEJA_CONSUMER_SECRET')
  }
  
  // Enviar a ambos en paralelo (buscará por email y actualizará o creará según corresponda)
  const promises: Promise<any>[] = []
  
  // Solo intentar enviar a Escolar si tiene credenciales
  if (escolarUrl && escolarKey && escolarSecret) {
    console.log('[enviarClienteABothWordPress] 📤 Enviando a Librería Escolar...')
    promises.push(
      createOrUpdateClienteEnWooCommerce(escolarUrl, escolarKey, escolarSecret, clienteData)
        .then(result => {
          console.log('[enviarClienteABothWordPress] ✅ Resultado Escolar:', result.success ? 'Éxito' : `Error: ${result.error}`)
          return { tipo: 'escolar', result }
        })
        .catch(error => {
          console.error('[enviarClienteABothWordPress] ❌ Error en Escolar:', error.message)
          return { tipo: 'escolar', result: { success: false, error: error.message } }
        })
    )
  } else {
    promises.push(Promise.resolve({ tipo: 'escolar', result: { success: false, error: 'Credenciales no configuradas' } }))
  }
  
  // Solo intentar enviar a Moraleja si tiene credenciales
  if (moralejaUrl && moralejaKey && moralejaSecret) {
    console.log('[enviarClienteABothWordPress] 📤 Enviando a Editorial Moraleja...')
    promises.push(
      createOrUpdateClienteEnWooCommerce(moralejaUrl, moralejaKey, moralejaSecret, clienteData)
        .then(result => {
          console.log('[enviarClienteABothWordPress] ✅ Resultado Moraleja:', result.success ? 'Éxito' : `Error: ${result.error}`)
          return { tipo: 'moraleja', result }
        })
        .catch(error => {
          console.error('[enviarClienteABothWordPress] ❌ Error en Moraleja:', error.message)
          return { tipo: 'moraleja', result: { success: false, error: error.message } }
        })
    )
  } else {
    promises.push(Promise.resolve({ tipo: 'moraleja', result: { success: false, error: 'Credenciales no configuradas' } }))
  }
  
  const results = await Promise.all(promises)
  
  const escolarResult = results.find(r => r.tipo === 'escolar')?.result || { success: false, error: 'No se ejecutó' }
  const moralejaResult = results.find(r => r.tipo === 'moraleja')?.result || { success: false, error: 'No se ejecutó' }
  
  // Log detallado de los resultados
  console.log('[enviarClienteABothWordPress] 📊 Resultados finales:', {
    escolar: {
      success: escolarResult.success,
      hasData: !!escolarResult.data,
      dataId: escolarResult.data?.id,
      error: escolarResult.error,
      created: escolarResult.created,
    },
    moraleja: {
      success: moralejaResult.success,
      hasData: !!moralejaResult.data,
      dataId: moralejaResult.data?.id,
      error: moralejaResult.error,
      created: moralejaResult.created,
    },
  })
  
  return {
    escolar: escolarResult,
    moraleja: moralejaResult,
  }
}

/**
 * Elimina un cliente de WooCommerce por email
 * Busca el cliente por email y luego lo elimina usando su ID
 */
export async function eliminarClientePorEmail(
  url: string,
  consumerKey: string,
  consumerSecret: string,
  email: string
): Promise<{ success: boolean; customerId?: number; error?: string }> {
  try {
    // Validar que tengamos los datos necesarios
    if (!url || !consumerKey || !consumerSecret) {
      return {
        success: false,
        error: 'URL o credenciales no configuradas',
      }
    }

    console.log(`[eliminarClientePorEmail] 🔍 Buscando cliente en ${url} por email: ${email}...`)

    // Primero buscar el cliente por email
    const searchResult = await buscarClientePorEmail(url, consumerKey, consumerSecret, email)

    if (!searchResult.success || !searchResult.customer) {
      return {
        success: false,
        error: searchResult.error || 'Cliente no encontrado',
      }
    }

    const customerId = searchResult.customer.id
    console.log(`[eliminarClientePorEmail] 🗑️ Cliente encontrado (ID: ${customerId}), eliminando...`)

    const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
    const apiUrl = `${url}/wp-json/wc/v3/customers/${customerId}?force=true`

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.message || `HTTP error! status: ${response.status}`
      console.error(`[eliminarClientePorEmail] ❌ Error al eliminar: ${errorMsg}`)
      return {
        success: false,
        error: errorMsg,
      }
    }

    console.log(`[eliminarClientePorEmail] ✅ Cliente eliminado exitosamente (ID: ${customerId})`)
    return {
      success: true,
      customerId,
    }
  } catch (error: any) {
    console.error(`[eliminarClientePorEmail] ❌ Excepción:`, error.message)
    return {
      success: false,
      error: error.message || 'Error al eliminar cliente de WooCommerce',
    }
  }
}

