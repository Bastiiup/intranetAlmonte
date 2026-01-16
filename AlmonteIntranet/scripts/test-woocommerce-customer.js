#!/usr/bin/env node

/**
 * Script de Prueba para Ver Estructura de Clientes de WooCommerce
 * 
 * Este script obtiene un cliente de WooCommerce y muestra su estructura completa
 * para entender qué campos están disponibles (billing, shipping, meta_data, etc.)
 * 
 * Uso:
 *   node scripts/test-woocommerce-customer.js
 *   node scripts/test-woocommerce-customer.js --id 123
 *   node scripts/test-woocommerce-customer.js --email cliente@ejemplo.com
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
const customerId = args.includes('--id') ? args[args.indexOf('--id') + 1] : null
const customerEmail = args.includes('--email') ? args[args.indexOf('--email') + 1] : null
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

// Función para obtener cliente
async function getCustomer(platformType, customerId, customerEmail) {
  const url = platformType === 'moraleja' ? WOO_MORALEJA_URL : WOO_ESCOLAR_URL
  const key = platformType === 'moraleja' ? WOO_MORALEJA_KEY : WOO_ESCOLAR_KEY
  const secret = platformType === 'moraleja' ? WOO_MORALEJA_SECRET : WOO_ESCOLAR_SECRET
  
  if (!key || !secret) {
    throw new Error(`Credenciales de ${platformType} no configuradas`)
  }
  
  const authHeader = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
  
  let apiUrl = ''
  if (customerId) {
    apiUrl = `${url}/wp-json/wc/v3/customers/${customerId}`
  } else if (customerEmail) {
    apiUrl = `${url}/wp-json/wc/v3/customers?email=${encodeURIComponent(customerEmail)}&per_page=1`
  } else {
    // Obtener el primer cliente disponible
    apiUrl = `${url}/wp-json/wc/v3/customers?per_page=1&orderby=id&order=desc`
  }
  
  console.log(`${colors.cyan}→${colors.reset} Obteniendo cliente desde ${colors.blue}${platformType}${colors.reset}...`)
  console.log(`${colors.gray}  URL: ${apiUrl}${colors.reset}`)
  
  const response = await makeRequest(apiUrl, {
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Error desconocido'}`)
  }
  
  let customer = response.data
  if (Array.isArray(customer) && customer.length > 0) {
    customer = customer[0]
    // Si obtuvimos por email, obtener el detalle completo
    if (customer.id) {
      const detailUrl = `${url}/wp-json/wc/v3/customers/${customer.id}`
      const detailResponse = await makeRequest(detailUrl, {
        headers: {
          'Authorization': authHeader
        }
      })
      if (detailResponse.status === 200) {
        customer = detailResponse.data
      }
    }
  }
  
  return customer
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
      } else {
        console.log(`${colors.gray}${spaces}  ${JSON.stringify(value).substring(0, 80)}${colors.reset}`)
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
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}     ${colors.bright}Test: Estructura de Cliente WooCommerce${colors.reset}                  ${colors.bright}${colors.cyan}║${colors.reset}`)
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
    // Obtener cliente
    const customer = await getCustomer(platform, customerId, customerEmail)
    
    if (!customer || !customer.id) {
      console.log(`${colors.red}No se encontró ningún cliente.${colors.reset}`)
      console.log(`Prueba con: node scripts/test-woocommerce-customer.js --id 123`)
      process.exit(1)
    }
    
    console.log(`\n${colors.bright}${colors.green}✓${colors.reset} Cliente obtenido exitosamente\n`)
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}  Información Básica${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
    
    console.log(`ID: ${colors.cyan}${customer.id}${colors.reset}`)
    console.log(`Email: ${colors.cyan}${customer.email || 'N/A'}${colors.reset}`)
    console.log(`Nombre: ${colors.cyan}${customer.first_name || ''} ${customer.last_name || ''}${colors.reset}`)
    console.log(`Usuario: ${colors.cyan}${customer.username || 'N/A'}${colors.reset}`)
    console.log()
    
    // Mostrar estructura completa
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}  Estructura Completa del Cliente${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
    
    printStructure(customer, 0, 4)
    
    // Mostrar billing y shipping en detalle
    if (customer.billing) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Datos de Facturación (billing)${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      printStructure(customer.billing, 0, 4)
    }
    
    if (customer.shipping) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Datos de Envío (shipping)${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      printStructure(customer.shipping, 0, 4)
    }
    
    if (customer.meta_data && customer.meta_data.length > 0) {
      console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}  Meta Data (${customer.meta_data.length} campos)${colors.reset}`)
      console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
      customer.meta_data.forEach((meta, idx) => {
        console.log(`${colors.cyan}${meta.key}${colors.reset}: ${colors.yellow}${meta.value}${colors.reset}`)
      })
    }
    
    // Guardar JSON completo en archivo
    const outputPath = path.join(__dirname, 'woocommerce-customer-sample.json')
    fs.writeFileSync(outputPath, JSON.stringify(customer, null, 2), 'utf-8')
    console.log(`\n${colors.green}✓${colors.reset} JSON completo guardado en: ${colors.cyan}${outputPath}${colors.reset}\n`)
    
  } catch (error) {
    console.log(`\n${colors.red}✗${colors.reset} Error: ${error.message}\n`)
    process.exit(1)
  }
}

// Ejecutar
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})

