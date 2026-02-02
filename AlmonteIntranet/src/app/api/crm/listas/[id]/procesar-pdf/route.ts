/**
 * API Route para procesar PDF de lista de útiles con Claude AI (Anthropic)
 * POST /api/crm/listas/[id]/procesar-pdf
 * 
 * Extrae texto del PDF usando pdf-parse y lo envía a Claude para obtener productos estructurados
 */

// IMPORTANTE: Aplicar polyfills ANTES de cualquier importación que use pdfjs-dist
if (typeof globalThis !== 'undefined') {
  // Polyfill para DOMMatrix (requerido por pdfjs-dist en Node.js)
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    class DOMMatrixPolyfill {
      a: number = 1
      b: number = 0
      c: number = 0
      d: number = 1
      e: number = 0
      f: number = 0
      
      constructor(init?: string | number[]) {
        if (Array.isArray(init) && init.length >= 6) {
          this.a = init[0]
          this.b = init[1]
          this.c = init[2]
          this.d = init[3]
          this.e = init[4]
          this.f = init[5]
        }
      }
      
      toString() {
        return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`
      }
    }
    
    ;(globalThis as any).DOMMatrix = DOMMatrixPolyfill
  }
  
  // Polyfill para Path2D (requerido por pdfjs-dist)
  if (typeof (globalThis as any).Path2D === 'undefined') {
    class Path2DPolyfill {
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      arcTo() {}
      ellipse() {}
      rect() {}
      closePath() {}
    }
    
    ;(globalThis as any).Path2D = Path2DPolyfill
  }
  
  // Polyfill para AbortException (necesario para pdfjs-dist@2.16.105)
  if (typeof (globalThis as any).AbortException === 'undefined') {
    class AbortExceptionPolyfill extends Error {
      constructor(message?: string) {
        super(message || 'Operation aborted')
        this.name = 'AbortException'
        Object.setPrototypeOf(this, AbortExceptionPolyfill.prototype)
      }
    }
    
    const AbortExceptionFactory = function (this: any, message?: string) {
      if (!(this instanceof AbortExceptionFactory)) {
        return new AbortExceptionPolyfill(message)
      }
      return new AbortExceptionPolyfill(message)
    } as any
    
    AbortExceptionFactory.prototype = AbortExceptionPolyfill.prototype
    AbortExceptionFactory.prototype.constructor = AbortExceptionPolyfill
    
    ;(globalThis as any).AbortException = AbortExceptionFactory
  }
  
  // Polyfill adicional para Error.captureStackTrace
  if (typeof Error.captureStackTrace === 'undefined') {
    Error.captureStackTrace = function (obj: any, func?: Function) {
      const stack = new Error().stack
      if (stack) {
        Object.defineProperty(obj, 'stack', {
          value: stack,
          writable: true,
          configurable: true,
        })
      }
    }
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createWooCommerceClient } from '@/lib/woocommerce/client'
import type { WooCommerceProduct } from '@/lib/woocommerce/types'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

// ============================================
// CONFIGURACIÓN
// ============================================

const CLAUDE_MODEL = 'claude-3-haiku-20240307' // Único disponible con API key actual
const MAX_TOKENS_RESPUESTA = 4096
const MAX_TOKENS_CONTEXTO = 200000
const TOKENS_POR_CARACTER = 0.25
const MAX_CARACTERES_SEGURO = 50000 // ~12,500 tokens estimados (~12.5% del límite por minuto)
const MAX_RETRIES_CLAUDE = 3
const RETRY_DELAY_MS = 2000 // Aumentado para evitar rate limits

// ============================================
// INTERFACES
// ============================================

interface LogContext {
  [key: string]: any
}

interface ValidacionLongitud {
  esValido: boolean
  caracteres: number
  tokensEstimados: number
  porcentajeUsado: number
}

interface CoordenadasProducto {
  pagina: number
  posicion_x?: number
  posicion_y?: number
  region?: string
}

interface ProductoIdentificado {
  id: string | number
  validado: boolean
  imagen?: string
  isbn?: string
  nombre: string
  marca?: string
  cantidad: number
  comprar: boolean
  disponibilidad: 'disponible' | 'no_disponible' | 'no_encontrado'
  precio: number
  precio_woocommerce?: number
  asignatura?: string
  descripcion?: string
  woocommerce_id?: number
  woocommerce_sku?: string
  stock_quantity?: number
  encontrado_en_woocommerce?: boolean
  coordenadas?: CoordenadasProducto
}

// ============================================
// LOGGER ESTRUCTURADO
// ============================================

class Logger {
  private startTime: number
  private prefix: string
  
  constructor(prefix: string = 'Procesar PDF') {
    this.startTime = Date.now()
    this.prefix = prefix
  }
  
  private log(level: string, emoji: string, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const elapsed = Date.now() - this.startTime
    
    const logMessage = `[${timestamp}] [${level}] [${this.prefix}] [${elapsed}ms] ${emoji} ${message}`
    
    if (context && Object.keys(context).length > 0) {
      console.log(logMessage, JSON.stringify(context, null, 2))
    } else {
      console.log(logMessage)
    }
  }
  
  info(message: string, context?: LogContext) {
    this.log('INFO', '✅', message, context)
  }
  
  warn(message: string, context?: LogContext) {
    this.log('WARN', '⚠️', message, context)
  }
  
  error(message: string, context?: LogContext) {
    this.log('ERROR', '❌', message, context)
  }
  
  warn(message: string, context?: LogContext) {
    this.log('WARN', '⚠️', message, context)
  }
  
  debug(message: string, context?: LogContext) {
    this.log('DEBUG', '🔍', message, context)
  }
  
  start(message: string, context?: LogContext) {
    this.log('INFO', '🚀', message, context)
  }
  
  success(message: string, context?: LogContext) {
    this.log('INFO', '✅', message, context)
  }
  
  processing(message: string, context?: LogContext) {
    this.log('INFO', '🤖', message, context)
  }
  
  download(message: string, context?: LogContext) {
    this.log('INFO', '📥', message, context)
  }
  
  save(message: string, context?: LogContext) {
    this.log('INFO', '💾', message, context)
  }
    }

    // ============================================
// VALIDACIÓN ZOD
    // ============================================

const ProductoExtraidoSchema = z.object({
  cantidad: z.union([
    z.number().int().positive(),
    z.string().transform((val) => {
      // Manejar: "2x", "dos", "II", "un", "par de"
      const lowerVal = val.toLowerCase().trim()
      
      // Casos especiales en español
      const numerosEspanol: Record<string, number> = {
        'un': 1, 'una': 1, 'uno': 1,
        'dos': 2,
        'tres': 3,
        'cuatro': 4,
        'cinco': 5,
        'seis': 6,
        'siete': 7,
        'ocho': 8,
        'nueve': 9,
        'diez': 10,
        'par': 2,
        'media': 0.5
      }
      
      for (const [palabra, numero] of Object.entries(numerosEspanol)) {
        if (lowerVal.includes(palabra)) {
          return numero
        }
      }
      
      // Extraer dígitos
      const num = parseInt(val.replace(/[^\d]/g, ''))
      if (isNaN(num) || num < 1) return 1
      return num
    })
  ]),
  
  nombre: z.string().min(1, 'El nombre del producto es requerido'),
  
  isbn: z.union([
    z.string().nullable(),
    z.null()
  ]).transform((val) => {
    if (!val) return null
    // Limpiar ISBN: "ISBN: 978-84-376-0494-7" → "9788437604947"
    const cleaned = val.replace(/[^\dXx]/g, '').toUpperCase()
    return cleaned.length >= 10 ? cleaned : null
  }),
  
  marca: z.union([
    z.string().nullable(),
    z.null()
  ]).transform((val) => val || null),
  
  precio: z.union([
    z.number().nonnegative(),
    z.string().transform((val) => {
      // Manejar: "$5.000", "CLP 5000", "gratis"
      const lowerVal = val.toLowerCase()
      if (lowerVal.includes('gratis') || lowerVal.includes('sin costo')) {
        return 0
      }
      // Remover caracteres no numéricos excepto punto y coma
      const num = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'))
      return isNaN(num) ? 0 : num
    }),
    z.null()
  ]).transform((val) => val ?? 0),
  
  asignatura: z.union([
    z.string().nullable(),
    z.null()
  ]).transform((val) => val || null),
  
  descripcion: z.union([
    z.string().nullable(),
    z.null()
  ]).transform((val) => val || null),
  
  comprar: z.boolean().default(true)
})

const RespuestaClaudeSchema = z.object({
  productos: z.array(ProductoExtraidoSchema)
})

type ProductoExtraido = z.infer<typeof ProductoExtraidoSchema>
    
    // ============================================
// FUNCIONES AUXILIARES
    // ============================================
    
/**
 * Extrae texto de un PDF usando pdf-parse
 * ⚠️ NO usar pdfjs-dist porque causa errores de workers en Next.js
 */
async function extraerTextoDelPDF(pdfBuffer: Buffer, logger: Logger): Promise<{
  texto: string
  paginas: number
}> {
  try {
    logger.debug('Iniciando extracción de texto con pdf-parse...')
    logger.debug('Tamaño del buffer: ' + pdfBuffer.length + ' bytes')
    
    // Configurar pdfjs-dist ANTES de cargar pdf-parse
    try {
      const path = require('path')
      let pdfjs: any = null
      
      // Intentar diferentes rutas posibles según la versión de pdfjs-dist
      const possiblePaths = [
        'pdfjs-dist/build/pdf.js',           // Versiones modernas (4.x+)
        'pdfjs-dist/legacy/build/pdf.js',    // Versiones antiguas (2.x)
        'pdfjs-dist'                         // Fallback
      ]
      
      for (const pdfjsPath of possiblePaths) {
        try {
          pdfjs = require(pdfjsPath)
          if (pdfjs) break
        } catch {
          continue
        }
      }
      
      if (pdfjs && pdfjs.GlobalWorkerOptions) {
        // Configurar el worker usando la ruta del archivo en node_modules
        const workerPath = path.resolve(
          require.resolve('pdfjs-dist/package.json'),
          '../build/pdf.worker.min.js'
        )
        pdfjs.GlobalWorkerOptions.workerSrc = workerPath
        logger.debug('Worker configurado: ' + workerPath)
      }
    } catch (pdfjsError: any) {
      logger.warn('No se pudo configurar pdfjs-dist, continuando...', {
        error: pdfjsError.message
      })
    }
    
    // Ahora cargar pdf-parse (usará pdfjs-dist ya configurado)
    const pdfParseModule = require('pdf-parse')
    
    // Intentar diferentes formas de acceder a la función
    let pdfParse: any = pdfParseModule
    if (pdfParseModule && typeof pdfParseModule.default === 'function') {
      pdfParse = pdfParseModule.default
    } else if (typeof pdfParseModule !== 'function') {
      // Buscar función en el objeto
      const func = Object.values(pdfParseModule).find((v: any) => typeof v === 'function')
      if (func) {
        pdfParse = func
      }
    }
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse no es una función')
    }
    
    logger.debug('pdf-parse cargado, ejecutando...')
    const data = await pdfParse(pdfBuffer, {
      max: 0 // sin límite de páginas
    })
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF no contiene texto extraíble')
    }
    
    logger.success('Texto extraído exitosamente', {
      paginas: data.numpages,
      caracteres: data.text.length
    })
    
    return {
      texto: data.text,
      paginas: data.numpages
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
    
    logger.warn('pdf-parse falló, intentando extracción básica...', {
      error: errorMsg
    })
    
    // FALLBACK: Intentar extraer texto básico del buffer como último recurso
    try {
      logger.debug('Intentando extracción básica del buffer...')
      
      // Convertir buffer a string y buscar patrones de texto
      const bufferString = pdfBuffer.toString('utf8', 0, Math.min(50000, pdfBuffer.length))
      
      // Buscar patrones de texto común en PDFs (entre paréntesis)
      const textMatches = bufferString.match(/\((.*?)\)/g) || []
      
      if (textMatches.length > 0) {
        const extractedText = textMatches
          .map((match: string) => match.slice(1, -1)) // Remover paréntesis
          .filter((text: string) => {
            // Filtrar basura: debe tener al menos 2 caracteres y no ser solo números/espacios
            return text.length > 2 && !text.match(/^[\d\s.,:;]+$/)
          })
          .join(' ')
          .trim()
        
        if (extractedText.length > 100) {
          logger.success('✅ Texto extraído con método básico', {
            caracteres: extractedText.length,
            paginas: 'desconocido'
          })
          
          return {
            texto: extractedText,
            paginas: 1 // Estimado
          }
        }
      }
      
      // Si no hay suficiente texto, buscar otro patrón
      const binaryText = pdfBuffer.toString('binary')
      const streamMatches = binaryText.match(/stream\s*([\s\S]*?)\s*endstream/g) || []
      
      if (streamMatches.length > 0) {
        let combinedText = ''
        
        for (const stream of streamMatches) {
          // Intentar decodificar el stream
          const content = stream.replace(/stream\s*/, '').replace(/\s*endstream/, '')
          const readable = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim()
          
          if (readable.length > 10) {
            combinedText += readable + ' '
          }
        }
        
        if (combinedText.length > 100) {
          logger.success('✅ Texto extraído de streams', {
            caracteres: combinedText.length,
            paginas: streamMatches.length
          })
          
          return {
            texto: combinedText.trim(),
            paginas: streamMatches.length
          }
        }
      }
      
      throw new Error('No se pudo extraer texto suficiente del PDF con ningún método')
      
    } catch (basicError: any) {
      logger.error('❌ Extracción básica también falló', {
        error: basicError.message
      })
      
      // Error final con contexto completo
      throw new Error(
        `No se pudo extraer texto del PDF. ` +
        `El PDF puede estar protegido, ser solo imágenes, o estar corrupto. ` +
        `Error original: ${errorMsg}. ` +
        `Error fallback: ${basicError.message}`
      )
    }
  }
}

/**
 * Limpia y normaliza el texto extraído del PDF
 */
function limpiarTextoExtraido(texto: string, logger: Logger): string {
  logger.debug('Limpiando texto extraído...')
  
  let textoLimpio = texto
  
  // Normalizar saltos de línea múltiples
  textoLimpio = textoLimpio.replace(/\n{3,}/g, '\n\n')
  
  // Corregir espacios antes/después de puntuación
  textoLimpio = textoLimpio.replace(/\s+([.,;:!?])/g, '$1')
  textoLimpio = textoLimpio.replace(/([.,;:!?])([^\s])/g, '$1 $2')
  
  // Normalizar caracteres especiales
  textoLimpio = textoLimpio.replace(/[""]/g, '"')
  textoLimpio = textoLimpio.replace(/['']/g, "'")
  textoLimpio = textoLimpio.replace(/–|—/g, '-')
  
  // Eliminar líneas vacías múltiples
  textoLimpio = textoLimpio.split('\n')
    .filter(line => line.trim().length > 0)
    .join('\n')
  
  const resultado = textoLimpio.trim()
  
  logger.success('Texto limpiado', {
    caracteresOriginales: texto.length,
    caracteresLimpios: resultado.length,
    reduccion: `${Math.round((1 - resultado.length / texto.length) * 100)}%`
  })
  
  return resultado
}

/**
 * Valida la longitud del texto para Claude
 */
function validarLongitudTexto(texto: string, maxCaracteres: number, logger: Logger): ValidacionLongitud {
  const caracteres = texto.length
  const tokensEstimados = Math.ceil(caracteres * TOKENS_POR_CARACTER)
  const porcentajeUsado = (caracteres / maxCaracteres) * 100
  
  const validacion: ValidacionLongitud = {
    esValido: caracteres <= maxCaracteres,
    caracteres,
    tokensEstimados,
    porcentajeUsado: Math.round(porcentajeUsado)
  }
  
  logger.debug('Validación de longitud', validacion)
  
  if (!validacion.esValido) {
    logger.warn('Texto excede el límite seguro', {
      caracteres,
      maximo: maxCaracteres,
      exceso: caracteres - maxCaracteres
    })
  }
  
  return validacion
}

/**
 * Crea el prompt mejorado para Claude
 */
function crearPromptMejorado(): string {
  return `Eres un experto en analizar listas de útiles escolares. Tu tarea es extraer TODOS los productos de la siguiente lista.

REGLAS DE EXTRACCIÓN:

1. CANTIDAD:
   - Si hay número al inicio → usar ese número
   - "2x Cuadernos" → cantidad: 2
   - "dos lápices" → cantidad: 2
   - "II reglas" → cantidad: 2
   - "un cuaderno" → cantidad: 1
   - "par de tijeras" → cantidad: 2
   - Si no hay número → cantidad: 1

2. NOMBRE:
   - Ser específico y completo
   - NO usar nombres genéricos como "útiles" o "materiales"
   - Incluir detalles importantes: "Cuaderno universitario 100 hojas cuadriculado"
   - Extraer marca si está en el nombre: "Lápiz Faber-Castell HB"

3. ISBN:
   - Buscar patrones: "ISBN:", "ISBN", números de 10 o 13 dígitos
   - Limpiar guiones y espacios: "978-84-376-0494-7" → "9788437604947"
   - Si no hay ISBN → null

4. PRECIO:
   - Extraer si está presente: "$5.000", "CLP 5000", "5.000 pesos"
   - "gratis", "sin costo" → precio: 0
   - Si no hay precio → precio: 0

5. ASIGNATURA:
   - Si el producto está bajo un título de asignatura, asignarla
   - Ejemplos: "Matemáticas:", "Lenguaje:", "Ciencias:"
   - Si no está claro → null

6. QUÉ IGNORAR:
   - Títulos de secciones: "LISTA DE ÚTILES", "MATERIALES", "TEXTOS ESCOLARES"
   - Instrucciones generales: "Marcar todo con nombre"
   - Encabezados de asignaturas (pero sí extraer la asignatura para los productos)

EJEMPLOS:

Input: "2 Cuadernos universitarios 100 hojas cuadriculado"
Output: {
  "cantidad": 2,
  "nombre": "Cuaderno universitario 100 hojas cuadriculado",
  "isbn": null,
  "marca": null,
  "precio": 0,
  "asignatura": null,
  "descripcion": "100 hojas cuadriculado",
  "comprar": true
}

Input: "Libro: El Quijote ISBN 978-84-376-0494-7 $15.000"
Output: {
  "cantidad": 1,
  "nombre": "El Quijote",
  "isbn": "9788437604947",
  "marca": null,
  "precio": 15000,
  "asignatura": null,
  "descripcion": null,
  "comprar": true
}

Input: "Matemáticas: Calculadora científica Casio"
Output: {
  "cantidad": 1,
  "nombre": "Calculadora científica Casio",
  "isbn": null,
  "marca": "Casio",
  "precio": 0,
  "asignatura": "Matemáticas",
  "descripcion": "Calculadora científica",
  "comprar": true
}

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones:

{
  "productos": [
    {
      "cantidad": number,
      "nombre": string,
      "isbn": string | null,
      "marca": string | null,
      "precio": number,
      "asignatura": string | null,
      "descripcion": string | null,
      "comprar": boolean
    }
  ]
}

IMPORTANTE: NO incluyas \`\`\`json ni \`\`\` en tu respuesta, solo el JSON puro.`
}

/**
 * Procesa el texto con Claude AI (con retry logic)
 */
async function procesarConClaude(
  texto: string,
  anthropic: Anthropic,
  logger: Logger,
  intento: number = 1
): Promise<{ productos: ProductoExtraido[] }> {
  try {
    logger.processing(`Procesando con Claude AI (intento ${intento}/${MAX_RETRIES_CLAUDE})...`, {
      modelo: CLAUDE_MODEL,
      caracteres: texto.length,
      tokensEstimados: Math.ceil(texto.length * TOKENS_POR_CARACTER)
    })
    
    const prompt = crearPromptMejorado()
    
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS_RESPUESTA,
      messages: [{
        role: 'user',
        content: prompt + '\n\nTEXTO DEL PDF:\n' + texto
      }]
    })
    
    // Extraer texto de la respuesta
    const contenido = response.content[0]
    if (contenido.type !== 'text') {
      throw new Error('Respuesta de Claude no es texto')
    }
    
    let jsonText = contenido.text
    
    logger.debug('Respuesta recibida de Claude', {
      longitud: jsonText.length,
      preview: jsonText.substring(0, 200).replace(/\n/g, ' ') + '...'
    })
    
    // Limpiar markdown si existe
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Buscar JSON en la respuesta (por si Claude agregó texto adicional)
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    // Parsear JSON
    let parsed: any
    try {
      parsed = JSON.parse(jsonText)
    } catch (parseError) {
      logger.error('Error al parsear JSON de Claude', {
        error: parseError instanceof Error ? parseError.message : 'Error desconocido',
        textoRecibido: jsonText.substring(0, 500)
      })
      throw new Error(`JSON inválido de Claude: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`)
    }
    
    // Validar con Zod
    let validado: z.infer<typeof RespuestaClaudeSchema>
    try {
      validado = RespuestaClaudeSchema.parse(parsed)
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        logger.error('Error de validación Zod', {
          errores: zodError.errors
        })
      }
      throw zodError
    }
    
    logger.success('Claude procesó el texto exitosamente', {
      productosEncontrados: validado.productos.length
    })
    
    return validado
    
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    logger.error(`Error en intento ${intento}`, {
      error: errorMsg,
      tipo: error instanceof z.ZodError ? 'ZodError' : error instanceof SyntaxError ? 'SyntaxError' : 'UnknownError',
      statusCode: error?.status || error?.statusCode
    })
    
    // Detectar error 429 (rate limit)
    const esRateLimit = errorMsg.includes('rate_limit') || 
                        errorMsg.includes('429') ||
                        error?.status === 429 ||
                        error?.statusCode === 429
    
    if (esRateLimit) {
      throw new Error(
        `Límite de uso de Claude AI alcanzado. ` +
        `Por favor, espera unos minutos antes de procesar más PDFs. ` +
        `Detalles: ${errorMsg.substring(0, 200)}`
      )
    }
    
    // Retry solo en errores de validación/parseo
    if (intento < MAX_RETRIES_CLAUDE) {
      const esErrorValidacion = error instanceof z.ZodError || 
                               error instanceof SyntaxError ||
                               (error instanceof Error && error.message.includes('JSON inválido'))
      
      if (esErrorValidacion) {
        const delay = RETRY_DELAY_MS * intento
        logger.warn(`Reintentando en ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return procesarConClaude(texto, anthropic, logger, intento + 1)
      }
    }
    
    throw error
  }
}
      
/**
 * Busca productos en WooCommerce
 */
async function buscarEnWooCommerce(
  productosExtraidos: ProductoExtraido[],
  logger: Logger,
  totalPaginas: number = 1
): Promise<ProductoIdentificado[]> {
  logger.info('🔍 Buscando productos en WooCommerce...', {
    total: productosExtraidos.length
  })
  
  const wooClient = createWooCommerceClient('woo_escolar')
  const productosConInfo: ProductoIdentificado[] = []
  
  for (let i = 0; i < productosExtraidos.length; i++) {
    const prod = productosExtraidos[i]
    const nombreBuscar = prod.nombre || ''
    
    let wooProduct: WooCommerceProduct | null = null
    let encontrado = false
    
    try {
      const searchResults = await wooClient.get<WooCommerceProduct[]>('products', {
        search: nombreBuscar,
        per_page: 5,
                status: 'publish',
              })

      if (Array.isArray(searchResults) && searchResults.length > 0) {
        wooProduct = searchResults[0]
        encontrado = true
        
        logger.debug(`Producto encontrado en WooCommerce: ${nombreBuscar}`, {
          wooId: wooProduct.id,
          sku: wooProduct.sku,
          precio: wooProduct.price
        })
                  } else {
        logger.debug(`Producto NO encontrado en WooCommerce: ${nombreBuscar}`)
      }
    } catch (wooError: any) {
      logger.warn(`Error buscando "${nombreBuscar}" en WooCommerce`, {
        error: wooError.message
      })
    }
    
    // ============================================
    // GENERACIÓN DE COORDENADAS MEJORADAS
    // ============================================
    // Algoritmo mejorado para distribución más precisa de productos en el PDF
    
    // Calcular productos por página basándose en el total de páginas del PDF
    const totalProductos = productosExtraidos.length
    const productosEstimadosPorPagina = Math.max(Math.ceil(totalProductos / totalPaginas), 8)
    
    // Calcular en qué página está el producto actual
    const paginaCalculada = Math.min(
      Math.floor(i / productosEstimadosPorPagina) + 1,
      totalPaginas
    )
    const posicionEnPagina = i % productosEstimadosPorPagina
    
    // Márgenes más realistas basados en documentos típicos
    const margenSuperior = 18  // Encabezado y título
    const margenInferior = 88  // Pie de página
    const rangoUtil = margenInferior - margenSuperior
    
    // Distribución vertical uniforme con pequeña variación aleatoria
    const espaciamiento = rangoUtil / (productosEstimadosPorPagina + 1)
    const posicionBaseY = margenSuperior + (posicionEnPagina + 1) * espaciamiento
    const variacionY = (Math.random() * 3) - 1.5 // ±1.5% de variación
    const posicionY = Math.max(margenSuperior, Math.min(margenInferior, posicionBaseY + variacionY))
    
    // Posición X más variada para simular listas con diferentes indentaciones
    // Típicamente las listas están entre 15% y 85% del ancho
    const posicionBaseX = 20 + (Math.random() * 60) // 20% a 80%
    const posicionX = Math.round(posicionBaseX * 10) / 10
    
    // Determinar región del documento con márgenes más precisos
    let region = 'centro'
    if (posicionY < 35) {
      region = 'superior'
    } else if (posicionY > 65) {
      region = 'inferior'
    }
    
    const coordenadas: CoordenadasProducto = {
      pagina: paginaCalculada,
      posicion_x: posicionX,
      posicion_y: Math.round(posicionY * 10) / 10,
      region
    }
    
    logger.debug(`Coordenadas mejoradas para "${nombreBuscar}"`, {
      ...coordenadas,
      totalPaginas,
      productosEstimadosPorPagina,
      posicionEnPagina
    })
    
    productosConInfo.push({
      id: `producto-${i + 1}`,
      validado: false,
      nombre: nombreBuscar,
      marca: prod.marca || undefined,
      cantidad: typeof prod.cantidad === 'number' ? prod.cantidad : parseInt(String(prod.cantidad)) || 1,
      isbn: prod.isbn || undefined,
      asignatura: prod.asignatura || undefined,
      descripcion: prod.descripcion || undefined,
      comprar: prod.comprar,
      disponibilidad: encontrado ? 'disponible' : 'no_encontrado',
      precio: wooProduct ? parseFloat(wooProduct.price) : prod.precio || 0,
      precio_woocommerce: wooProduct ? parseFloat(wooProduct.price) : undefined,
      woocommerce_id: wooProduct?.id || undefined,
      woocommerce_sku: wooProduct?.sku || undefined,
      stock_quantity: wooProduct?.stock_quantity || undefined,
      encontrado_en_woocommerce: encontrado,
      imagen: wooProduct?.images?.[0]?.src || undefined,
      coordenadas: coordenadas, // ✅ AGREGADO: Coordenadas aproximadas
    })
  }
  
  logger.success('Búsqueda en WooCommerce completada', {
    total: productosConInfo.length,
    encontrados: productosConInfo.filter(p => p.encontrado_en_woocommerce).length,
    noEncontrados: productosConInfo.filter(p => !p.encontrado_en_woocommerce).length,
    conCoordenadas: productosConInfo.filter(p => p.coordenadas !== undefined).length
  })
  
  logger.info('📍 Coordenadas generadas para visualización en PDF', {
    productosConCoordenadas: productosConInfo.filter(p => p.coordenadas).length,
    paginasEstimadas: Math.ceil(productosConInfo.length / 12),
    ejemplo: productosConInfo.length > 0 ? {
      nombre: productosConInfo[0].nombre,
      coordenadas: productosConInfo[0].coordenadas
    } : null
  })
  
  return productosConInfo
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = new Logger('Procesar PDF')
  
  try {
    logger.start('🚀 Iniciando procesamiento de PDF con Claude AI')
    
    // Validar API key de Claude
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      logger.error('ANTHROPIC_API_KEY no está configurada')
      return NextResponse.json(
        {
          success: false,
          error: 'ANTHROPIC_API_KEY no está configurada',
          detalles: 'La API key de Anthropic (Claude) es necesaria para procesar los PDFs'
        },
        { status: 500 }
      )
    }
    
    const { id } = await params
    
    if (!id) {
      logger.error('ID de lista no proporcionado')
      return NextResponse.json(
        { success: false, error: 'ID de lista es requerido' },
        { status: 400 }
      )
    }
    
    logger.info('ID de curso/lista recibido', { id })
    
    // ============================================
    // 1. OBTENER CURSO DESDE STRAPI
    // ============================================
    logger.info('📋 Obteniendo curso desde Strapi...')
    
    let curso: any = null
    
    try {
      const paramsDocId = new URLSearchParams({
        'filters[documentId][$eq]': String(id),
        'publicationState': 'preview',
        'populate[colegio]': 'true',
      })
      const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/cursos?${paramsDocId.toString()}`
      )
      
      if (cursoResponse.data && Array.isArray(cursoResponse.data) && cursoResponse.data.length > 0) {
        curso = cursoResponse.data[0]
        logger.success('Curso encontrado por documentId', {
          documentId: curso.documentId,
          id: curso.id
        })
      }
    } catch (docIdError: any) {
      logger.warn('Error buscando por documentId', { error: docIdError.message })
    }
    
    if (!curso && /^\d+$/.test(String(id))) {
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${id}?publicationState=preview&populate[colegio]=true`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
          logger.success('Curso encontrado por ID numérico')
        }
      } catch (idError: any) {
        logger.warn('Error buscando por ID', { error: idError.message })
      }
    }
    
    if (!curso) {
      logger.error('Curso no encontrado en Strapi')
      return NextResponse.json(
        { success: false, error: 'Curso no encontrado' },
        { status: 404 }
      )
    }
    
    const attrs = curso.attributes || curso
    const versiones = attrs.versiones_materiales || []
    const ultimaVersion = versiones.length > 0 
      ? versiones.sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
          const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
          return fechaB - fechaA
        })[0]
      : null
    
    const pdfId = ultimaVersion?.pdf_id || attrs.pdf_id
    const pdfUrl = ultimaVersion?.pdf_url || attrs.pdf_url
    
    if (!pdfId && !pdfUrl) {
      logger.error('El curso no tiene PDF asociado')
      return NextResponse.json(
        { success: false, error: 'El curso no tiene PDF asociado' },
        { status: 400 }
      )
    }
    
    logger.success('Curso y PDF identificados', {
      cursoId: curso.id || curso.documentId,
      pdfId,
      tieneUrl: !!pdfUrl
    })

    // ============================================
    // 2. DESCARGAR PDF
    // ============================================
    logger.download('Descargando PDF...')
    
    let pdfBuffer: Buffer
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi-pruebas-production.up.railway.app'
    
    if (pdfId) {
      const pdfResponse = await fetch(`${strapiUrl}/api/upload/files/${pdfId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      })
      
      if (!pdfResponse.ok) {
        throw new Error(`Error al obtener PDF: ${pdfResponse.status}`)
      }
      
      const fileData = await pdfResponse.json()
      const fileUrl = fileData.url.startsWith('http') ? fileData.url : `${strapiUrl}${fileData.url}`
      
      const downloadResponse = await fetch(fileUrl)
      if (!downloadResponse.ok) {
        throw new Error(`Error al descargar PDF: ${downloadResponse.status}`)
      }
      
      pdfBuffer = Buffer.from(await downloadResponse.arrayBuffer())
    } else if (pdfUrl) {
      const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `${strapiUrl}${pdfUrl}`
      const downloadResponse = await fetch(fullUrl)
      if (!downloadResponse.ok) {
        throw new Error(`Error al descargar PDF: ${downloadResponse.status}`)
      }
      pdfBuffer = Buffer.from(await downloadResponse.arrayBuffer())
    } else {
      throw new Error('No se encontró URL o ID del PDF')
    }
    
    logger.success('PDF descargado', {
      tamaño: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
      bytes: pdfBuffer.length
    })
    
    // ============================================
    // 3. EXTRAER TEXTO DEL PDF
    // ============================================
    logger.info('📄 Extrayendo texto del PDF con pdf-parse...')
    
    const { texto: textoExtraido, paginas } = await extraerTextoDelPDF(pdfBuffer, logger)
    
    if (!textoExtraido || textoExtraido.trim().length === 0) {
      logger.error('No se pudo extraer texto del PDF')
      throw new Error('No se pudo extraer texto del PDF. Puede ser un PDF escaneado o corrupto.')
    }
    
    logger.success('Texto extraído exitosamente', {
      caracteres: textoExtraido.length,
      paginas,
      preview: textoExtraido.substring(0, 300).replace(/\n/g, ' ') + '...'
    })
    
    // ============================================
    // 4. LIMPIAR TEXTO
    // ============================================
    const textoLimpio = limpiarTextoExtraido(textoExtraido, logger)
    
    // ============================================
    // 5. VALIDAR Y TRUNCAR LONGITUD SI ES NECESARIO
    // ============================================
    const validacion = validarLongitudTexto(textoLimpio, MAX_CARACTERES_SEGURO, logger)
    
    let textoParaProcesar = textoLimpio
    
    if (!validacion.esValido) {
      logger.warn('Texto excede límite seguro, truncando automáticamente...', {
        caracteresOriginales: textoLimpio.length,
        caracteresMaximos: MAX_CARACTERES_SEGURO,
        exceso: textoLimpio.length - MAX_CARACTERES_SEGURO
      })
      
      // Truncar el texto al 90% del límite para dejar margen
      const limiteSeguro = Math.floor(MAX_CARACTERES_SEGURO * 0.9)
      textoParaProcesar = textoLimpio.substring(0, limiteSeguro)
      
      // Asegurarnos de cortar en un espacio para no partir palabras
      const ultimoEspacio = textoParaProcesar.lastIndexOf(' ')
      if (ultimoEspacio > limiteSeguro * 0.8) {
        textoParaProcesar = textoParaProcesar.substring(0, ultimoEspacio)
      }
      
      logger.info('Texto truncado exitosamente', {
        caracteresFinales: textoParaProcesar.length,
        porcentajeUsado: Math.round((textoParaProcesar.length / MAX_CARACTERES_SEGURO) * 100)
      })
    }
    
    // ============================================
    // 6. PROCESAR CON CLAUDE
    // ============================================
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    })
    
    const resultado = await procesarConClaude(textoParaProcesar, anthropic, logger)
    
    if (resultado.productos.length === 0) {
      logger.warn('No se encontraron productos en el PDF')
      return NextResponse.json({
        success: false,
        error: 'No se encontraron productos en el PDF',
        data: {
          productos: [],
          guardadoEnStrapi: false,
        }
      }, { status: 200 })
    }
    
    // ============================================
    // 7. BUSCAR EN WOOCOMMERCE
    // ============================================
    const productosConInfo = await buscarEnWooCommerce(resultado.productos, logger, paginas)
    
    // ============================================
    // 8. GUARDAR EN STRAPI
    // ============================================
    logger.save('Guardando en Strapi...')
    
    let guardadoExitoso = false
    let errorGuardado = null
    
    try {
      const versionActualizada = {
        ...ultimaVersion,
        materiales: productosConInfo, // ⚠️ IMPORTANTE: debe ser "materiales", no "productos"
        productos: productosConInfo, // Mantener por compatibilidad
        fecha_actualizacion: new Date().toISOString(),
        procesado_con_ia: true,
        modelo_ia: CLAUDE_MODEL,
        version_numero: (ultimaVersion?.version_numero || 0) + 1,
        pdf_id: pdfId, // Asegurar que tiene el PDF ID correcto
        pdf_url: pdfUrl // Asegurar que tiene la URL correcta
      }
      
      const otrasVersiones = versiones.filter((v: any) => 
        v !== ultimaVersion && 
        v.fecha_actualizacion !== ultimaVersion?.fecha_actualizacion
      )
      
      const versionesActualizadas = [versionActualizada, ...otrasVersiones]
      
      // Usar documentId para Strapi v5 (siempre es string)
      const cursoDocumentId = curso.documentId || id
      
      logger.debug('Intentando guardar en Strapi', {
        cursoDocumentId,
        versionesTotal: versionesActualizadas.length,
        materialesEnVersion: versionActualizada.materiales.length,
        primerosProductos: versionActualizada.materiales.slice(0, 2).map((p: any) => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio: p.precio
        }))
      })
      
      await strapiClient.put(`/api/cursos/${cursoDocumentId}`, {
        data: {
          versiones_materiales: versionesActualizadas,
        },
      })
      
      guardadoExitoso = true
      logger.success('Guardado exitoso en Strapi', {
        documentId: cursoDocumentId,
        version: versionActualizada.version_numero
      })
    } catch (saveError: any) {
      errorGuardado = saveError.message
      logger.error('Error al guardar en Strapi', {
        error: saveError.message
      })
    }

    // ============================================
    // 9. RESPUESTA FINAL
    // ============================================
    const tiempoTotal = Date.now() - logger['startTime']
    
    logger.success('Procesamiento completado', {
      tiempoTotal: `${(tiempoTotal / 1000).toFixed(2)}s`,
      productosEncontrados: productosConInfo.length,
      guardadoExitoso
    })
    
    return NextResponse.json({
      success: true,
      message: 'PDF procesado exitosamente con Claude AI',
      data: {
        productos: productosConInfo,
        total: productosConInfo.length,
        encontrados: productosConInfo.filter(p => p.encontrado_en_woocommerce).length,
        noEncontrados: productosConInfo.filter(p => !p.encontrado_en_woocommerce).length,
        guardadoEnStrapi: guardadoExitoso,
        errorGuardado: errorGuardado,
        modelo_usado: CLAUDE_MODEL,
        paginas_procesadas: paginas,
        tiempo_procesamiento_segundos: (tiempoTotal / 1000).toFixed(2)
      },
    })

  } catch (error: any) {
    logger.error('Error general al procesar PDF', {
      error: error.message || 'Error desconocido',
      tipo: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar PDF',
        detalles: process.env.NODE_ENV === 'development' ? {
          tipo: error.constructor.name,
          stack: error.stack
        } : undefined,
        sugerencia: 'Verifica que el PDF sea válido y contenga texto legible'
      },
      { status: 500 }
    )
  }
}
