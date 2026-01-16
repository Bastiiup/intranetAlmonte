#!/usr/bin/env node

/**
 * Script de Verificación de Funcionalidades Strapi
 * 
 * Este script prueba todas las conexiones y funcionalidades principales
 * con la API de Strapi para verificar que todo está configurado correctamente.
 * 
 * Uso:
 *   node scripts/test-strapi.js
 *   node scripts/test-strapi.js --verbose
 *   node scripts/test-strapi.js --test-crud
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
    console.log(`${colors.green}✓${colors.reset} Variables de entorno cargadas desde .env.local`)
    return true
  }
  return false
}

// Configuración
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN
const VERBOSE = process.argv.includes('--verbose')
const TEST_CRUD = process.argv.includes('--test-crud')

// Estadísticas
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
}

// Content types a probar
const contentTypes = [
  { name: 'productos', endpoint: '/api/libros', description: 'Productos/Libros' },
  { name: 'categorias', endpoint: '/api/categorias', description: 'Categorías' },
  { name: 'etiquetas', endpoint: '/api/etiquetas', description: 'Etiquetas' },
  { name: 'autores', endpoint: '/api/autores', description: 'Autores' },
  { name: 'colecciones', endpoint: '/api/colecciones', description: 'Colecciones' },
  { name: 'obras', endpoint: '/api/obras', description: 'Obras' },
  { name: 'sellos', endpoint: '/api/sellos', description: 'Sellos' },
  { name: 'marcas', endpoint: '/api/marcas', description: 'Marcas' },
  { name: 'pedidos', endpoint: '/api/wo-pedidos', description: 'Pedidos' },
  { name: 'clientes', endpoint: '/api/wo-clientes', description: 'Clientes' },
  { name: 'colegios', endpoint: '/api/colegios', description: 'Colegios' },
  { name: 'personas', endpoint: '/api/personas', description: 'Personas' },
  { name: 'profesores', endpoint: '/api/profesores', description: 'Profesores/Trayectorias' }
]

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
        ...(STRAPI_TOKEN && { 'Authorization': `Bearer ${STRAPI_TOKEN}` }),
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

// Probar endpoint
async function testEndpoint(contentType) {
  const { name, endpoint, description } = contentType
  const fullUrl = `${STRAPI_URL}${endpoint}?pagination[limit]=5`
  
  stats.total++
  
  try {
    if (VERBOSE) {
      console.log(`${colors.cyan}→${colors.reset} Probando ${colors.blue}${description}${colors.reset} (${endpoint})...`)
    }
    
    const startTime = Date.now()
    const response = await makeRequest(fullUrl)
    const duration = Date.now() - startTime
    
    if (response.status === 200 || response.status === 201) {
      const count = response.data?.data?.length || response.data?.length || 0
      const total = response.data?.meta?.pagination?.total || count
      
      console.log(
        `${colors.green}✓${colors.reset} ${description.padEnd(20)} ` +
        `${colors.gray}[${response.status}]${colors.reset} ` +
        `${colors.cyan}${count}${colors.reset} registros ` +
        `${colors.gray}(${total} total)${colors.reset} ` +
        `${colors.gray}(${duration}ms)${colors.reset}`
      )
      
      if (VERBOSE && response.data?.data) {
        const first = response.data.data[0]
        if (first) {
          console.log(`${colors.gray}  └─ Ejemplo: ${JSON.stringify(Object.keys(first.attributes || first || {})).substring(0, 80)}...${colors.reset}`)
        }
      }
      
      stats.passed++
      return { success: true, data: response.data, duration }
    } else if (response.status === 403) {
      console.log(
        `${colors.yellow}⚠${colors.reset} ${description.padEnd(20)} ` +
        `${colors.gray}[${response.status}]${colors.reset} ` +
        `${colors.yellow}Sin permisos${colors.reset}`
      )
      stats.warnings++
      return { success: false, error: 'Forbidden', status: response.status }
    } else if (response.status === 404) {
      console.log(
        `${colors.yellow}⚠${colors.reset} ${description.padEnd(20)} ` +
        `${colors.gray}[${response.status}]${colors.reset} ` +
        `${colors.yellow}Endpoint no encontrado${colors.reset}`
      )
      stats.warnings++
      return { success: false, error: 'Not Found', status: response.status }
    } else {
      const errorMsg = response.data?.error?.message || response.data?.message || 'Unknown error'
      console.log(
        `${colors.red}✗${colors.reset} ${description.padEnd(20)} ` +
        `${colors.gray}[${response.status}]${colors.reset} ` +
        `${colors.red}${errorMsg}${colors.reset}`
      )
      stats.failed++
      stats.errors.push({ endpoint, status: response.status, error: errorMsg })
      return { success: false, error: errorMsg, status: response.status }
    }
  } catch (error) {
    console.log(
      `${colors.red}✗${colors.reset} ${description.padEnd(20)} ` +
      `${colors.red}${error.message}${colors.reset}`
    )
    stats.failed++
    stats.errors.push({ endpoint, error: error.message })
    return { success: false, error: error.message }
  }
}

// Probar conexión base
async function testBaseConnection() {
  console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.bright}${colors.blue}  Test de Conexión Base${colors.reset}`)
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
  
  console.log(`URL: ${colors.cyan}${STRAPI_URL}${colors.reset}`)
  console.log(`Token: ${STRAPI_TOKEN ? colors.green + 'Configurado' + colors.reset : colors.red + 'NO CONFIGURADO' + colors.reset}`)
  if (STRAPI_TOKEN) {
    console.log(`Token Preview: ${colors.gray}${STRAPI_TOKEN.substring(0, 20)}...${colors.reset}`)
  }
  console.log()
  
  try {
    // Probar endpoint de categorías como test de conexión (más confiable que /api)
    const response = await makeRequest(`${STRAPI_URL}/api/categorias?pagination[limit]=1`)
    if (response.status === 200 || response.status === 401 || response.status === 403) {
      // 200 = éxito, 401/403 = conexión OK pero sin permisos
      console.log(`${colors.green}✓${colors.reset} Conexión a Strapi exitosa\n`)
      return true
    } else if (response.status === 404) {
      // 404 podría ser que el endpoint no existe, pero la conexión funciona
      console.log(`${colors.yellow}⚠${colors.reset} Endpoint de prueba no disponible, continuando con tests...\n`)
      return true
    } else {
      console.log(`${colors.red}✗${colors.reset} Error en conexión: ${response.status}\n`)
      return false
    }
  } catch (error) {
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log(`${colors.red}✗${colors.reset} Error de conexión: No se puede alcanzar ${STRAPI_URL}\n`)
      return false
    }
    // Otros errores podrían ser de red, continuamos con los tests
    console.log(`${colors.yellow}⚠${colors.reset} Advertencia de conexión: ${error.message}\n`)
    return true
  }
}

// Probar CRUD básico (opcional)
async function testCRUD(contentType) {
  if (!TEST_CRUD || !STRAPI_TOKEN) return
  
  const { name, endpoint, description } = contentType
  
  try {
    // Crear registro de prueba
    const testData = {
      data: {
        name: `TEST_${Date.now()}`,
        ...(name === 'categorias' && { name: `TEST_CATEGORIA_${Date.now()}` }),
        ...(name === 'etiquetas' && { name: `TEST_ETIQUETA_${Date.now()}` }),
        ...(name === 'autores' && { nombre_completo_autor: `TEST_AUTOR_${Date.now()}` }),
      }
    }
    
    const createResponse = await makeRequest(`${STRAPI_URL}${endpoint}`, {
      method: 'POST',
      body: testData
    })
    
    if (createResponse.status === 200 || createResponse.status === 201) {
      const createdId = createResponse.data?.data?.id
      if (createdId) {
        // Intentar eliminar
        await makeRequest(`${STRAPI_URL}${endpoint}/${createdId}`, {
          method: 'DELETE'
        })
        if (VERBOSE) {
          console.log(`  ${colors.gray}✓ CRUD test completado${colors.reset}`)
        }
      }
    }
  } catch (error) {
    // Ignorar errores de CRUD en modo silencioso
    if (VERBOSE) {
      console.log(`  ${colors.yellow}⚠ CRUD test falló: ${error.message}${colors.reset}`)
    }
  }
}

// Función principal
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}     ${colors.bright}Script de Verificación de Funcionalidades Strapi${colors.reset}      ${colors.bright}${colors.cyan}║${colors.reset}`)
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════════════╝${colors.reset}\n`)
  
  // Cargar .env.local si existe
  loadEnvFile()
  
  // Verificar configuración
  if (!STRAPI_TOKEN) {
    console.log(`${colors.red}⚠ ADVERTENCIA:${colors.reset} STRAPI_API_TOKEN no está configurado.`)
    console.log(`  Algunos endpoints pueden requerir autenticación.\n`)
  }
  
  // Probar conexión base
  const baseConnectionOk = await testBaseConnection()
  if (!baseConnectionOk) {
    console.log(`${colors.red}Error: No se puede conectar a Strapi. Verifica la URL.${colors.reset}\n`)
    process.exit(1)
  }
  
  // Probar endpoints
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.bright}${colors.blue}  Test de Content Types${colors.reset}`)
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
  
  const results = []
  for (const contentType of contentTypes) {
    const result = await testEndpoint(contentType)
    results.push({ ...contentType, result })
    
    if (TEST_CRUD && result.success) {
      await testCRUD(contentType)
    }
    
    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Resumen
  console.log(`\n${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.bright}${colors.blue}  Resumen${colors.reset}`)
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
  
  console.log(`Total:        ${colors.cyan}${stats.total}${colors.reset}`)
  console.log(`${colors.green}✓ Exitosos:  ${stats.passed}${colors.reset}`)
  console.log(`${colors.yellow}⚠ Advertencias: ${stats.warnings}${colors.reset}`)
  console.log(`${colors.red}✗ Fallidos:   ${stats.failed}${colors.reset}`)
  
  if (stats.errors.length > 0) {
    console.log(`\n${colors.red}Errores encontrados:${colors.reset}`)
    stats.errors.forEach(({ endpoint, status, error }) => {
      console.log(`  ${colors.red}✗${colors.reset} ${endpoint} - ${status || 'Error'}: ${error}`)
    })
  }
  
  const successRate = ((stats.passed / stats.total) * 100).toFixed(1)
  console.log(`\n${colors.bright}Tasa de éxito: ${successRate >= 80 ? colors.green : successRate >= 50 ? colors.yellow : colors.red}${successRate}%${colors.reset}\n`)
  
  // Sugerencias
  if (stats.failed > 0) {
    console.log(`${colors.yellow}💡 Sugerencias:${colors.reset}`)
    if (!STRAPI_TOKEN) {
      console.log(`  • Configura STRAPI_API_TOKEN en .env.local para acceso completo`)
    }
    console.log(`  • Verifica que los content types existan en Strapi Admin`)
    console.log(`  • Revisa los permisos de la API en Strapi Settings → Roles → Public/Authenticated`)
    console.log()
  }
  
  process.exit(stats.failed > stats.passed ? 1 : 0)
}

// Ejecutar
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})
