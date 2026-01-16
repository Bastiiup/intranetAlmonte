#!/usr/bin/env node

/**
 * Script de Prueba para Ver Estructura de Pedidos de WooCommerce
 * 
 * Este script obtiene un pedido de WooCommerce y muestra su estructura completa
 * para entender qué campos están disponibles (line_items, billing, shipping, meta_data, etc.)
 * 
 * Uso:
 *   node scripts/test-woocommerce-order.js
 *   node scripts/test-woocommerce-order.js --id 123
 *   node scripts/test-woocommerce-order.js --number 1234
 *   node scripts/test-woocommerce-order.js --platform moraleja
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

// Cargar variables de entorno
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          envVars[key.trim()] = value
        }
      }
    })
    
    Object.assign(process.env, envVars)
    return true
  }
  return false
}

// Configuración
loadEnvFile()

const WOO_ESCOLAR_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL_ESCOLAR 
  || process.env.WOO_ESCOLAR_URL 
  || process.env.NEXT_PUBLIC_WOOCOMMERCE_URL 
  || 'https://staging.escolar.cl'
const WOO_ESCOLAR_KEY = process.env.WOO_ESCOLAR_CONSUMER_KEY 
  || process.env.WOOCOMMERCE_CONSUMER_KEY 
  || ''
const WOO_ESCOLAR_SECRET = process.env.WOO_ESCOLAR_CONSUMER_SECRET 
  || process.env.WOOCOMMERCE_CONSUMER_SECRET 
  || ''

const WOO_MORALEJA_URL = process.env.WOO_MORALEJA_URL 
  || process.env.NEXT_PUBLIC_WOO_MORALEJA_URL 
  || 'https://staging.moraleja.cl'
const WOO_MORALEJA_KEY = process.env.WOO_MORALEJA_CONSUMER_KEY || ''
const WOO_MORALEJA_SECRET = process.env.WOO_MORALEJA_CONSUMER_SECRET || ''

// Argumentos
const args = process.argv.slice(2)
const orderId = args.includes('--id') ? args[args.indexOf('--id') + 1] : null
const orderNumber = args.includes('--number') ? args[args.indexOf('--number') + 1] : null
const platform = args.includes('--platform') && args[args.indexOf('--platform') + 1] === 'moraleja' ? 'moraleja' : 'escolar'

// Helper para hacer peticiones HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: options.timeout || 30000
    }
    
    const req = client.request(requestOptions, (res) => {
      let data = ''
      
      res.on('data', chunk => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          })
        }
      })
    })
    
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

// Función para obtener pedido
async function getOrder(platformType, orderId, orderNumber) {
  const url = platformType === 'moraleja' ? WOO_MORALEJA_URL : WOO_ESCOLAR_URL
  const key = platformType === 'moraleja' ? WOO_MORALEJA_KEY : WOO_ESCOLAR_KEY
  const secret = platformType === 'moraleja' ? WOO_MORALEJA_SECRET : WOO_ESCOLAR_SECRET
  
  if (!key || !secret) {
    throw new Error(`Credenciales de ${platformType} no configuradas`)
  }
  
  const authHeader = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
  
  let apiUrl = ''
  if (orderId) {
    apiUrl = `${url}/wp-json/wc/v3/orders/${orderId}`
  } else if (orderNumber) {
    // Buscar por número de pedido
    apiUrl = `${url}/wp-json/wc/v3/orders?number=${encodeURIComponent(orderNumber)}&per_page=1`
  } else {
    // Obtener el pedido más reciente
    apiUrl = `${url}/wp-json/wc/v3/orders?per_page=1&orderby=id&order=desc&status=any`
  }
  
  console.log(`${colors.cyan}→${colors.reset} Obteniendo pedido desde ${colors.blue}${platformType}${colors.reset}...`)
  console.log(`${colors.gray}  URL: ${apiUrl}${colors.reset}`)
  
  const response = await makeRequest(apiUrl, {
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.data?.message || JSON.stringify(response.data).substring(0, 200)}`)
  }
  
  let order = response.data
  if (Array.isArray(order) && order.length > 0) {
    order = order[0]
    // Si obtuvimos por número, obtener el detalle completo
    if (order.id) {
      const detailUrl = `${url}/wp-json/wc/v3/orders/${order.id}`
      const detailResponse = await makeRequest(detailUrl, {
        headers: {
          'Authorization': authHeader
        }
      })
      if (detailResponse.status === 200) {
        order = detailResponse.data
      }
    }
  }
  
  return order
}

// Función para mostrar estructura
function printStructure(obj, indent = 0, maxDepth = 3) {
  if (indent > maxDepth) return
  
  const spaces = '  '.repeat(indent)
  const keys = Object.keys(obj)
  
  keys.forEach(key => {
    const value = obj[key]
    const type = Array.isArray(value) ? 'array' : typeof value
    
    if (type === 'object' && value !== null && !Array.isArray(value)) {
      console.log(`${colors.gray}${spaces}${key}:${colors.reset} {`)
      printStructure(value, indent + 1, maxDepth)
      console.log(`${colors.gray}${spaces}}${colors.reset}`)
    } else if (Array.isArray(value)) {
      console.log(`${colors.gray}${spaces}${key}:${colors.reset} [`)
      if (value.length > 0 && typeof value[0] === 'object') {
        printStructure(value[0], indent + 1, maxDepth)
        if (value.length > 1) {
          console.log(`${colors.gray}${spaces}  ... (${value.length - 1} más)${colors.reset}`)
        }
      } else {
        const preview = value.length > 3 
          ? value.slice(0, 3).concat([`... (${value.length - 3} más)`])
          : value
        console.log(`${colors.gray}${spaces}  ${JSON.stringify(preview).substring(0, 80)}${colors.reset}`)
      }
      console.log(`${colors.gray}${spaces}]${colors.reset} (${value.length} items)`)
    } else {
      const displayValue = typeof value === 'string' && value.length > 60 
        ? value.substring(0, 60) + '...' 
        : value
      console.log(`${spaces}${colors.cyan}${key}${colors.reset}: ${colors.yellow}${displayValue}${colors.reset} ${colors.gray}(${type})${colors.reset}`)
    }
  })
}

// Función principal
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}      ${colors.bright}Test: Estructura de Pedido WooCommerce${colors.reset}                  ${colors.bright}${colors.cyan}║${colors.reset}`)
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════════════╝${colors.reset}\n`)
  
  // Verificar configuración
  console.log(`${colors.bright}${colors.blue}Configuración:${colors.reset}`)
  console.log(`Plataforma: ${colors.cyan}${platform}${colors.reset}`)
  console.log(`URL: ${colors.cyan}${platform === 'moraleja' ? WOO_MORALEJA_URL : WOO_ESCOLAR_URL}${colors.reset}`)
  console.log(`Key: ${(platform === 'moraleja' ? WOO_MORALEJA_KEY : WOO_ESCOLAR_KEY) ? colors.green + 'Configurado' : colors.red + 'NO CONFIGURADO'}${colors.reset}`)
  console.log(`Secret: ${(platform === 'moraleja' ? WOO_MORALEJA_SECRET : WOO_ESCOLAR_SECRET) ? colors.green + 'Configurado' : colors.red + 'NO CONFIGURADO'}${colors.reset}`)
  console.log()
  
  if (!(platform === 'moraleja' ? WOO_MORALEJA_KEY : WOO_ESCOLAR_KEY)) {
    console.log(`${colors.red}Error: Las credenciales de ${platform} no están configuradas.${colors.reset}\n`)
    process.exit(1)
  }
  
  try {
    // Obtener pedido
    const order = await getOrder(platform, orderId, orderNumber)
    
    if (!order || !order.id) {
      console.log(`${colors.red}No se encontró ningún pedido.${colors.reset}`)
      console.log(`Prueba con: node scripts/test-woocommerce-order.js --id 123`)
      process.exit(1)
    }
    
    console.log(`\n${colors.bright}${colors.green}✓${colors.reset} Pedido obtenido exitosamente\n`)
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}  Información Básica${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
    
    console.log(`ID: ${colors.cyan}${order.id}${colors.reset}`)
    console.log(`Número: ${colors.cyan}${order.number || 'N/A'}${colors.reset}`)
    console.log(`Estado: ${colors.cyan}${order.status || 'N/A'}${colors.reset}`)
    console.log(`Cliente ID: ${colors.cyan}${order.customer_id || 'N/A'}${colors.reset}`)
    console.log(`Total: ${colors.cyan}${order.currency || ''} ${order.total || '0'}${colors.reset}`)
    console.log(`Fecha: ${colors.cyan}${order.date_created || 'N/A'}${colors.reset}`)
    console.log(`Método de Pago: ${colors.cyan}${order.payment_method_title || order.payment_method || 'N/A'}${colors.reset}`)
    console.log()
    
    // Mostrar estructura completa
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}  Estructura Completa del Pedido${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
    
    printStructure(order, 0, 4)
    
    // Mostrar line_items en detalle
    if (order.line_items && order.line_items.length > 0) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Items del Pedido (line_items) - ${order.line_items.length} items${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      order.line_items.forEach((item, idx) => {
        console.log(`${colors.bright}${colors.cyan}Item ${idx + 1}:${colors.reset}`)
        printStructure(item, 1, 4)
        console.log()
      })
    }
    
    // Mostrar billing en detalle
    if (order.billing) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Datos de Facturación (billing)${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      printStructure(order.billing, 0, 4)
    }
    
    // Mostrar shipping en detalle
    if (order.shipping) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Datos de Envío (shipping)${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      printStructure(order.shipping, 0, 4)
    }
    
    // Mostrar shipping_lines
    if (order.shipping_lines && order.shipping_lines.length > 0) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Líneas de Envío (shipping_lines) - ${order.shipping_lines.length} items${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      order.shipping_lines.forEach((line, idx) => {
        console.log(`${colors.bright}${colors.cyan}Línea ${idx + 1}:${colors.reset}`)
        printStructure(line, 1, 4)
        console.log()
      })
    }
    
    // Mostrar tax_lines
    if (order.tax_lines && order.tax_lines.length > 0) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Líneas de Impuestos (tax_lines) - ${order.tax_lines.length} items${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      order.tax_lines.forEach((line, idx) => {
        console.log(`${colors.bright}${colors.cyan}Línea ${idx + 1}:${colors.reset}`)
        printStructure(line, 1, 4)
        console.log()
      })
    }
    
    // Mostrar fee_lines
    if (order.fee_lines && order.fee_lines.length > 0) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Líneas de Tarifas (fee_lines) - ${order.fee_lines.length} items${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      order.fee_lines.forEach((line, idx) => {
        console.log(`${colors.bright}${colors.cyan}Línea ${idx + 1}:${colors.reset}`)
        printStructure(line, 1, 4)
        console.log()
      })
    }
    
    // Mostrar coupon_lines
    if (order.coupon_lines && order.coupon_lines.length > 0) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Cupones (coupon_lines) - ${order.coupon_lines.length} items${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      order.coupon_lines.forEach((line, idx) => {
        console.log(`${colors.bright}${colors.cyan}Cupón ${idx + 1}:${colors.reset}`)
        printStructure(line, 1, 4)
        console.log()
      })
    }
    
    // Mostrar meta_data
    if (order.meta_data && order.meta_data.length > 0) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Meta Data (${order.meta_data.length} campos)${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      order.meta_data.forEach((meta, idx) => {
        const valueStr = typeof meta.value === 'object' 
          ? JSON.stringify(meta.value).substring(0, 80) 
          : String(meta.value).substring(0, 80)
        console.log(`${colors.cyan}${meta.key}${colors.reset}: ${colors.yellow}${valueStr}${colors.reset}`)
      })
    }
    
    // Resumen de totales
    console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}  Resumen de Totales${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
    console.log(`Subtotal: ${colors.cyan}${order.currency || ''} ${order.subtotal || '0'}${colors.reset}`)
    console.log(`Descuento: ${colors.cyan}${order.currency || ''} ${order.discount_total || '0'}${colors.reset}`)
    console.log(`Envío: ${colors.cyan}${order.currency || ''} ${order.shipping_total || '0'}${colors.reset}`)
    console.log(`Impuestos: ${colors.cyan}${order.currency || ''} ${order.total_tax || '0'}${colors.reset}`)
    console.log(`Total: ${colors.cyan}${order.currency || ''} ${order.total || '0'}${colors.reset}`)
    console.log()
    
    // Guardar JSON completo en archivo
    const outputPath = path.join(__dirname, 'woocommerce-order-sample.json')
    fs.writeFileSync(outputPath, JSON.stringify(order, null, 2), 'utf-8')
    console.log(`${colors.green}✓${colors.reset} JSON completo guardado en: ${colors.cyan}${outputPath}${colors.reset}\n`)
    
    // Mostrar ejemplo de estructura para crear pedido
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}  Estructura para Crear Pedido${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
    
    const createOrderExample = {
      payment_method: order.payment_method || 'bacs',
      payment_method_title: order.payment_method_title || 'Transferencia bancaria directa',
      set_paid: false,
      status: 'pending',
      customer_id: order.customer_id || 0,
      billing: order.billing || {},
      shipping: order.shipping || {},
      line_items: (order.line_items || []).map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        ...(item.variation_id ? { variation_id: item.variation_id } : {}),
        ...(item.price ? { price: item.price } : {}),
      })),
      ...(order.shipping_lines && order.shipping_lines.length > 0 ? {
        shipping_lines: order.shipping_lines.map(line => ({
          method_id: line.method_id,
          method_title: line.method_title,
          total: line.total,
        }))
      } : {}),
      ...(order.coupon_lines && order.coupon_lines.length > 0 ? {
        coupon_lines: order.coupon_lines.map(line => ({
          code: line.code,
        }))
      } : {}),
      customer_note: order.customer_note || '',
      meta_data: (order.meta_data || []).map(meta => ({
        key: meta.key,
        value: meta.value,
      })),
    }
    
    console.log(JSON.stringify(createOrderExample, null, 2))
    console.log()
    
  } catch (error) {
    console.log(`\n${colors.red}✗${colors.reset} Error: ${error.message}\n`)
    if (error.stack) {
      console.log(`${colors.gray}Stack: ${error.stack}${colors.reset}\n`)
    }
    process.exit(1)
  }
}

// Ejecutar
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})

