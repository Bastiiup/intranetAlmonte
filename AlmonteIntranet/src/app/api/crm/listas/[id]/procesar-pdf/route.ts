/**
 * API Route para procesar PDF de lista de útiles con Claude AI (Anthropic)
 * POST /api/crm/listas/[id]/procesar-pdf
 * 
 * Convierte el PDF a imagen y usa Claude Vision API para extraer productos directamente
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
import * as pdfParse from 'pdf-parse'
import crypto from 'crypto'
import { getColaboradorFromCookies } from '@/lib/auth/cookies'
import { createWooCommerceClient } from '@/lib/woocommerce/client'
import type { WooCommerceProduct } from '@/lib/woocommerce/types'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import { obtenerFechaChileISO } from '@/lib/utils/dates'
import { normalizarCursoStrapi, obtenerUltimaVersion } from '@/lib/utils/strapi'
import { extraerCoordenadasMultiples } from '@/lib/utils/pdf-coordenadas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

// ============================================
// CONFIGURACIÓN
// ============================================

// Modelos de Claude AI
// Sonnet: Más preciso, ideal para PDFs complejos o pequeños
// Haiku: Más rápido y económico, ideal para PDFs grandes
const CLAUDE_MODEL_SONNET = 'claude-sonnet-4-20250514'
const CLAUDE_MODEL_HAIKU = 'claude-3-5-haiku-20241022'

// Umbral de páginas para cambiar de modelo
const PAGINAS_UMBRAL_HAIKU = 6 // PDFs > 6 páginas usan Haiku (más rápido)
const MAX_TOKENS_RESPUESTA = 16384 // Tokens para la respuesta (aumentado para PDFs con muchos productos)
const MAX_TOKENS_CONTEXTO = 200000
const TOKENS_POR_CARACTER = 0.25
const MAX_CARACTERES_SEGURO = 50000 // ~12,500 tokens estimados (~12.5% del límite por minuto)
const MAX_RETRIES_CLAUDE = 3
const RETRY_DELAY_MS = 2000 // Aumentado para evitar rate limits

// ============================================
// CACHÉ DE PROCESAMIENTO
// ============================================

// Caché en memoria para PDFs procesados (evita reprocesar el mismo PDF)
const cacheProcesamientos = new Map<string, {
  resultado: { productos: ProductoExtraido[] }
  timestamp: number
  paginas: number
}>()

const CACHE_TTL_MS = 1000 * 60 * 60 // 1 hora

function obtenerHashPDF(pdfBuffer: Buffer): string {
  return crypto.createHash('sha256').update(pdfBuffer).digest('hex')
}

function obtenerDesdeCacheProcesamientos(hash: string): { productos: ProductoExtraido[] } | null {
  const cached = cacheProcesamientos.get(hash)
  if (!cached) return null
  
  // Verificar si expiró
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    cacheProcesamientos.delete(hash)
    return null
  }
  
  return cached.resultado
}

function guardarEnCacheProcesamientos(
  hash: string, 
  resultado: { productos: ProductoExtraido[] },
  paginas: number
): void {
  cacheProcesamientos.set(hash, {
    resultado,
    timestamp: Date.now(),
    paginas
  })
  
  // Limitar tamaño del caché (máximo 50 PDFs)
  if (cacheProcesamientos.size > 50) {
    const firstKey = cacheProcesamientos.keys().next().value
    if (firstKey) cacheProcesamientos.delete(firstKey)
  }
}

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
  ancho?: number
  alto?: number
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
  
  comprar: z.boolean().default(true),
  
  // Campos de ubicación en el PDF (opcionales para retrocompatibilidad)
  pagina: z.number().int().positive().optional(),
  posicion_y_porcentaje: z.number().min(0).max(100).optional(), // % desde arriba (0-100)
  posicion_x_porcentaje: z.number().min(0).max(100).optional(), // % desde izquierda (0-100)
  orden_en_pagina: z.number().int().positive().optional()
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
    logger.info('🔍 Iniciando extracción de texto con pdf-parse...')
    logger.debug('Tamaño del buffer: ' + pdfBuffer.length + ' bytes')
    logger.debug('Primeros bytes del buffer (hex):', {
      preview: pdfBuffer.slice(0, 100).toString('hex').substring(0, 200)
    })
    
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
        // Deshabilitar worker en servidor (no es necesario para pdf-parse)
        pdfjs.GlobalWorkerOptions.workerSrc = ''
        logger.debug('Worker deshabilitado (no necesario en servidor)')
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
    
    logger.info('📄 pdf-parse cargado, ejecutando extracción...')
    const data = await pdfParse(pdfBuffer, {
      max: 0 // sin límite de páginas
    })
    
    logger.debug('📊 Resultado de pdf-parse:', {
      tieneTexto: !!data.text,
      longitudTexto: data.text?.length || 0,
      numPages: data.numpages,
      info: data.info || 'N/A',
      metadata: data.metadata || 'N/A',
      previewTexto: data.text?.substring(0, 500) || 'N/A'
    })
    
    if (!data.text || data.text.trim().length === 0) {
      logger.error('❌ PDF no contiene texto extraíble', {
        numPages: data.numpages,
        info: data.info,
        metadata: data.metadata
      })
      throw new Error('PDF no contiene texto extraíble - puede ser un PDF escaneado (solo imágenes)')
    }
    
    logger.success('✅ Texto extraído exitosamente con pdf-parse', {
      paginas: data.numpages,
      caracteres: data.text.length,
      preview: data.text.substring(0, 500).replace(/\n/g, ' ')
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
 * Prepara el PDF en base64 para enviar directamente a Claude Vision
 * Claude Vision API soporta PDFs nativamente sin necesidad de convertir a imágenes
 */
async function prepararPDFParaClaude(pdfBuffer: Buffer, logger: Logger): Promise<{
  pdfBase64: string
  tamañoMB: number
}> {
  try {
    logger.info('📄 Preparando PDF para Claude Vision...')
    
    // Convertir PDF a base64
    const pdfBase64 = pdfBuffer.toString('base64')
    const tamañoMB = pdfBuffer.length / (1024 * 1024)
    
    // Claude acepta PDFs de hasta 32MB
    if (tamañoMB > 32) {
      throw new Error(`PDF muy grande (${tamañoMB.toFixed(2)} MB). Máximo: 32 MB`)
    }
    
    logger.success('✅ PDF preparado para Claude Vision', {
      tamañoMB: tamañoMB.toFixed(2),
      tamañoKB: (pdfBuffer.length / 1024).toFixed(2),
      base64Length: pdfBase64.length
    })
    
    return {
      pdfBase64,
      tamañoMB
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
    logger.error('Error al preparar PDF', {
      error: errorMsg
    })
    throw new Error(`Error al preparar PDF: ${errorMsg}`)
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
function crearPromptOptimizado(): string {
  return `Extrae TODOS los productos de útiles escolares del PDF. Copia el texto EXACTAMENTE como aparece e indica la ubicación EXACTA de cada producto.

REGLAS DE EXTRACCIÓN:
1. Productos = líneas con cantidad + nombre (ej: "2 Cuadernos")
2. Cantidad: número exacto del texto (si no hay → 1)
3. Nombre: EXACTAMENTE como aparece (NO cambies ni agregues palabras)
4. ISBN: solo si aparece explícito (quita guiones)
5. Marca: solo si está en el nombre
6. Precio: solo si aparece explícito
7. Asignatura: solo si hay encabezado claro
8. Descripción: solo detalles técnicos adicionales

📍 UBICACIÓN EXACTA (CRÍTICO):
Para CADA producto, analiza el PDF VISUALMENTE y proporciona coordenadas EXACTAS:
- pagina: número de página donde aparece (1, 2, 3...)
- posicion_y_porcentaje: distancia EXACTA desde el borde superior (0-100)
  · Ejemplo: si está al 30% de la altura de la página → 30
  · Ejemplo: si está casi al final → 85
  · SÉ PRECISO, analiza VISUALMENTE dónde está en la página
- posicion_x_porcentaje: distancia EXACTA desde el borde izquierdo (0-100)
  · Ejemplo: margen izquierdo típico → 15
  · Ejemplo: centro → 50
  · Ejemplo: margen derecho → 75
- orden_en_pagina: posición relativa en esa página (1=primero, 2=segundo, etc)

⚠️ IMPORTANTE: Analiza VISUALMENTE el PDF como una imagen. Mide mentalmente dónde está cada producto (arriba/abajo, izquierda/derecha) y proporciona porcentajes precisos.

IGNORAR:
- Títulos (LISTA DE ÚTILES, MATERIALES)
- Instrucciones (Marcar con nombre)
- URLs y notas
- Info administrativa

⚠️ CRÍTICO:
- Extrae TODOS los productos (si hay 30 en el PDF → devuelve 30)
- NO omitas ninguno
- Revisa TODAS las páginas y líneas
- Copia EXACTAMENTE (no cambies plural/singular ni agregues palabras)
- SIEMPRE incluye ubicación para cada producto

FORMATO (JSON puro, sin markdown):
{"productos":[{"cantidad":number,"nombre":string,"isbn":string|null,"marca":string|null,"precio":number,"asignatura":string|null,"descripcion":string|null,"comprar":boolean,"pagina":number,"posicion_y_porcentaje":number,"posicion_x_porcentaje":number,"orden_en_pagina":number}]}

EJEMPLOS:
"2 Cuadernos universitarios" que aparece en página 1, visualmente al 28% desde arriba y 18% desde la izquierda, es el 1er item:
{"cantidad":2,"nombre":"Cuadernos universitarios","isbn":null,"marca":null,"precio":0,"asignatura":null,"descripcion":null,"comprar":true,"pagina":1,"posicion_y_porcentaje":28,"posicion_x_porcentaje":18,"orden_en_pagina":1}

"Tijeras" que aparece en página 2, visualmente al 65% desde arriba y 50% desde la izquierda, es el 8vo item:
{"cantidad":1,"nombre":"Tijeras","isbn":null,"marca":null,"precio":0,"asignatura":null,"descripcion":null,"comprar":true,"pagina":2,"posicion_y_porcentaje":65,"posicion_x_porcentaje":50,"orden_en_pagina":8}

"Marcar todo" → NO incluir (instrucción)`
}

/**
 * Procesa el texto con Claude AI (con retry logic)
 */
async function procesarConClaude(
  pdfBase64: string,
  anthropic: Anthropic,
  logger: Logger,
  intento: number = 1,
  paginas: number = 1
): Promise<{ productos: ProductoExtraido[], modeloUsado: string }> {
  try {
    // ============================================
    // 🤖 SELECCIÓN DE MODELO ADAPTATIVO
    // ============================================
    const usarHaiku = paginas > PAGINAS_UMBRAL_HAIKU
    const modelo = usarHaiku ? CLAUDE_MODEL_HAIKU : CLAUDE_MODEL_SONNET
    const motivoModelo = usarHaiku 
      ? `PDF grande (${paginas} páginas) → Haiku (más rápido)`
      : `PDF pequeño (${paginas} páginas) → Sonnet (más preciso)`
    
    // ============================================
    // 🤖 INICIANDO PROCESAMIENTO
    // ============================================
    console.log('\n\n🤖 ==========================================')
    console.log('🤖 INICIANDO PROCESAMIENTO CON CLAUDE VISION')
    console.log('🤖 ==========================================\n')
    
    logger.info('\n🤖 ===== PROCESAMIENTO CON CLAUDE VISION (PDF) =====')
    logger.info(`📊 Estadísticas del PDF:`)
    logger.info(`   - Páginas: ${paginas}`)
    logger.info(`   - Tamaño base64: ${(pdfBase64.length / 1024).toFixed(2)} KB`)
    logger.info(`   - Modelo seleccionado: ${modelo}`)
    logger.info(`   - Motivo: ${motivoModelo}`)
    
    console.log('📊 ESTADÍSTICAS DEL PDF:')
    console.log(`   - Páginas: ${paginas}`)
    console.log(`   - Tamaño base64: ${(pdfBase64.length / 1024).toFixed(2)} KB`)
    console.log(`   - Modelo: ${modelo} (${motivoModelo})`)
    
    logger.processing(`🔄 Intento ${intento}/${MAX_RETRIES_CLAUDE}`, {
      modelo,
      paginas,
      seleccion: motivoModelo,
      tamañoPDF: `${(pdfBase64.length / 1024).toFixed(2)} KB`
    })
    
    const prompt = crearPromptOptimizado()
    
    console.log(`\n📝 PROMPT COMPLETO ENVIADO A CLAUDE:`)
    console.log('=' + '='.repeat(100))
    console.log(prompt)
    console.log('=' + '='.repeat(100))
    
    // Construir contenido con PDF
    const content: Anthropic.MessageParam['content'] = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBase64
        }
      } as any,
      {
        type: 'text',
        text: prompt
      }
    ]
    
    logger.debug('📄 PDF agregado al mensaje de Claude')
    
    const response = await anthropic.messages.create({
      model: modelo,
      max_tokens: MAX_TOKENS_RESPUESTA,
      messages: [{
        role: 'user',
        content: content
      }]
    })
    
    console.log(`\n📥 RESPUESTA DE CLAUDE:`)
    console.log(`   - Stop reason: ${response.stop_reason || 'N/A'}`)
    console.log(`   - Tokens usados: ${response.usage?.output_tokens || 'N/A'}/${response.usage?.input_tokens || 'N/A'}`)
    console.log(`   - Total tokens: ${response.usage?.input_tokens && response.usage?.output_tokens ? response.usage.input_tokens + response.usage.output_tokens : 'N/A'}`)
    
    logger.info(`\n📥 RESPUESTA DE CLAUDE:`)
    logger.info(`   - Stop reason: ${response.stop_reason || 'N/A'}`)
    logger.info(`   - Tokens usados: ${response.usage?.output_tokens || 'N/A'}/${response.usage?.input_tokens || 'N/A'}`)
    logger.info(`   - Total tokens: ${response.usage?.input_tokens && response.usage?.output_tokens ? response.usage.input_tokens + response.usage.output_tokens : 'N/A'}`)
    logger.info(`   - Contenido completo (primeros 2000 chars):\n${JSON.stringify(response.content, null, 2).substring(0, 2000)}`)
    
    // Extraer texto de la respuesta
    const contenido = response.content[0]
    if (contenido.type !== 'text') {
      logger.error('❌ Respuesta de Claude no es texto:', { tipo: contenido.type })
      throw new Error('Respuesta de Claude no es texto')
    }
    
    let jsonText = contenido.text
    
    console.log(`\n📄 TEXTO DE RESPUESTA COMPLETO DE CLAUDE:`)
    console.log(jsonText)
    console.log('=' + '='.repeat(50))
    
    logger.info(`\n📄 TEXTO DE RESPUESTA COMPLETO:`)
    logger.info(jsonText)
    logger.info('=' + '='.repeat(50))
    
    // Validar que la respuesta no esté vacía
    if (!jsonText || jsonText.trim().length === 0) {
      logger.error('❌ La respuesta de Claude está vacía')
      throw new Error('Respuesta vacía de Claude')
    }
    
    // Advertencia si se usaron muchos tokens
    if (response.usage?.output_tokens && response.usage.output_tokens / MAX_TOKENS_RESPUESTA > 0.95) {
      logger.warn('⚠️ ADVERTENCIA: Respuesta puede estar cortada (>95% tokens usados)', {
        tokensUsados: response.usage.output_tokens,
        tokensMaximos: MAX_TOKENS_RESPUESTA,
        porcentaje: Math.round((response.usage.output_tokens / MAX_TOKENS_RESPUESTA) * 100)
      })
    }
    
    // Verificar si la respuesta se cortó (uso de tokens cercano al máximo)
    if (response.usage?.output_tokens && response.usage.output_tokens >= MAX_TOKENS_RESPUESTA * 0.95) {
      logger.warn('⚠️ La respuesta de Claude puede estar cortada - se usó más del 95% de los tokens', {
        tokensUsados: response.usage.output_tokens,
        tokensMaximos: MAX_TOKENS_RESPUESTA,
        porcentaje: Math.round((response.usage.output_tokens / MAX_TOKENS_RESPUESTA) * 100)
      })
    }
    
    // Limpiar markdown si existe
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Buscar JSON en la respuesta
    logger.info('\n🔍 Buscando JSON en la respuesta...')
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      logger.error('❌ No se encontró JSON en la respuesta')
      logger.info(`📄 Respuesta completa (primeros 1000 chars):\n${jsonText.substring(0, 1000)}`)
      throw new Error('No se encontró JSON en la respuesta de Claude')
    }
    
    logger.info('✅ JSON encontrado, intentando parsear...')
    logger.info(`📄 JSON extraído (primeros 500 chars):\n${jsonMatch[0].substring(0, 500)}`)
    
    // Parsear JSON
    let parsed: any
    try {
      parsed = JSON.parse(jsonMatch[0])
    console.log('✅ JSON parseado exitosamente')
    console.log(`📊 Estructura del JSON:`, Object.keys(parsed))
    
    logger.info('✅ JSON parseado exitosamente')
    logger.info(`📊 Estructura:`, Object.keys(parsed))
    
    if (parsed.productos) {
      console.log(`✅ Campo "productos" encontrado: ${parsed.productos.length} items`)
      logger.info(`✅ Campo "productos" encontrado: ${parsed.productos.length} items`)
      
      if (parsed.productos.length > 0) {
        console.log(`📦 Primer producto:`, JSON.stringify(parsed.productos[0], null, 2))
        logger.info(`📦 Primer producto:`, { producto: parsed.productos[0] })
      } else {
        console.warn('⚠️ El campo "productos" está vacío (array vacío)')
        logger.warn('⚠️ El campo "productos" está vacío (array vacío)')
      }
    } else {
      console.error('❌ El JSON no tiene campo "productos"')
      console.log('📄 JSON completo:', JSON.stringify(parsed, null, 2))
      logger.error('❌ El JSON no tiene campo "productos"')
      logger.info('📄 JSON completo:', { parsed })
      throw new Error('El JSON no tiene campo "productos"')
    }
    } catch (parseError) {
      logger.error('❌ Error al parsear JSON:', { 
        error: parseError instanceof Error ? parseError.message : 'Error desconocido' 
      })
      logger.info('📄 JSON que intentó parsear:', { json: jsonMatch[0] })
      throw parseError
    }
    
    // Validar con Zod
    logger.info('\n🔍 Validando con Zod...')
    let validado: z.infer<typeof RespuestaClaudeSchema>
    try {
      validado = RespuestaClaudeSchema.parse(parsed)
      logger.info('✅ Validación Zod exitosa')
      logger.info(`📊 Productos validados: ${validado.productos.length}`)
      
      if (validado.productos.length === 0) {
        logger.warn('⚠️ ADVERTENCIA: Validación exitosa pero 0 productos en el resultado')
        logger.info('📄 JSON completo para revisión:', { parsed })
      }
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        logger.error('❌ Error de validación Zod:', { errors: zodError.errors })
        logger.info('📄 Errores detallados:', zodError.errors)
        logger.info('📄 JSON que falló validación:', { parsed })
      }
      throw zodError
    }
    
    console.log(`\n✅ RESULTADO FINAL:`)
    console.log(`   - Productos encontrados: ${validado.productos.length}`)
    console.log(`   - Tokens usados: ${response.usage?.output_tokens || 'N/A'}/${MAX_TOKENS_RESPUESTA}`)
    console.log(`   - Porcentaje tokens: ${response.usage?.output_tokens ? Math.round((response.usage.output_tokens / MAX_TOKENS_RESPUESTA) * 100) : 'N/A'}%`)
    if (validado.productos.length > 0) {
      console.log(`   - Primeros 5 productos:`)
      validado.productos.slice(0, 5).forEach((p, i) => {
        console.log(`     ${i + 1}. ${p.nombre} (cantidad: ${p.cantidad})`)
      })
    }
    
    logger.success('Claude procesó el texto exitosamente', {
      productosEncontrados: validado.productos.length,
      tokensUsados: response.usage?.output_tokens || 'N/A',
      tokensMaximos: MAX_TOKENS_RESPUESTA,
      porcentajeTokens: response.usage?.output_tokens 
        ? Math.round((response.usage.output_tokens / MAX_TOKENS_RESPUESTA) * 100) 
        : 'N/A',
      productosPreview: validado.productos.slice(0, 5).map(p => p.nombre)
    })
    
    // Advertencia si se usaron muchos tokens (puede indicar que se cortó la respuesta)
    if (response.usage?.output_tokens && response.usage.output_tokens > MAX_TOKENS_RESPUESTA * 0.9) {
      console.warn('⚠️ ADVERTENCIA: Se usó más del 90% de los tokens - la respuesta puede estar incompleta')
      logger.warn('⚠️ Se usó más del 90% de los tokens de respuesta - la respuesta puede estar incompleta', {
        tokensUsados: response.usage.output_tokens,
        tokensMaximos: MAX_TOKENS_RESPUESTA,
        productosEncontrados: validado.productos.length
      })
    }
    
    console.log('\n🤖 ==========================================')
    console.log('🤖 FIN PROCESAMIENTO CON CLAUDE')
    console.log('🤖 ==========================================\n')
    
    return { ...validado, modeloUsado: modelo }
    
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
        return procesarConClaude(pdfBase64, anthropic, logger, intento + 1, paginas)
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
  totalPaginas: number = 1,
  pdfBuffer?: Buffer
): Promise<ProductoIdentificado[]> {
  logger.info('🔍 Buscando productos en WooCommerce...', {
    total: productosExtraidos.length
  })
  
  const wooClient = createWooCommerceClient('woo_escolar')
  const productosConInfo: ProductoIdentificado[] = []
  
  // ============================================
  // PASO 1: EXTRAER COORDENADAS REALES DEL PDF (MÁXIMA PRIORIDAD)
  // ============================================
  let coordenadasMap: Map<string, any> = new Map()
  let productosConCoordenadasReales = 0
  
  if (pdfBuffer) {
    try {
      logger.info('📍 Iniciando extracción de coordenadas REALES del PDF...')
      const productosParaCoordenadas = productosExtraidos.map((p, i) => ({
        nombre: p.nombre || '',
        id: `producto-${i + 1}`
      }))
      
      coordenadasMap = await extraerCoordenadasMultiples(
        pdfBuffer,
        productosParaCoordenadas,
        logger
      )
      
      productosConCoordenadasReales = coordenadasMap.size / 2 // Dividir por 2 porque se guardan con 2 keys
      
      if (productosConCoordenadasReales > 0) {
        logger.success(`✅ Coordenadas REALES extraídas: ${productosConCoordenadasReales}/${productosExtraidos.length} productos`, {
          precision: 'PIXEL-PERFECT',
          metodo: 'PDFjs + búsqueda de texto'
        })
      } else {
        logger.warn('⚠️ No se pudieron extraer coordenadas reales del PDF', {
          razon: 'Posible PDF basado en imágenes o texto no seleccionable'
        })
      }
    } catch (coordError: any) {
      logger.error('❌ Error al extraer coordenadas reales', {
        error: coordError.message,
        stack: coordError.stack?.split('\n').slice(0, 3).join('\n')
      })
    }
  } else {
    logger.warn('⚠️ PDF buffer no disponible, no se pueden extraer coordenadas reales')
  }
  
  for (let i = 0; i < productosExtraidos.length; i++) {
    const prod = productosExtraidos[i]
    const nombreBuscar = prod.nombre || ''
    const productoId = `producto-${i + 1}`
    
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
    // OBTENER COORDENADAS (REALES O APROXIMADAS)
    // ============================================
    let coordenadas: CoordenadasProducto | undefined
    
    // Intentar usar coordenadas reales primero (buscar con múltiples keys)
    const coordenadasReales = coordenadasMap.get(productoId) || 
                              coordenadasMap.get(nombreBuscar.toLowerCase().trim()) ||
                              coordenadasMap.get(`producto-${i + 1}`)
    
    if (coordenadasReales) {
      // ✅ COORDENADAS REALES DEL PDF (PIXEL-PERFECT)
      coordenadas = {
        pagina: coordenadasReales.pagina,
        posicion_x: coordenadasReales.x,
        posicion_y: coordenadasReales.y,
        region: coordenadasReales.y < 35 ? 'superior' : coordenadasReales.y > 65 ? 'inferior' : 'centro',
        ancho: coordenadasReales.ancho,
        alto: coordenadasReales.alto,
      }
      
      logger.success(`🎯 COORDENADAS REALES (PIXEL-PERFECT) para "${nombreBuscar}"`, {
        pagina: coordenadas.pagina,
        posicion: `X: ${coordenadas.posicion_x}%, Y: ${coordenadas.posicion_y}%`,
        tamaño: `${coordenadas.ancho}% × ${coordenadas.alto}%`,
        textoEncontrado: coordenadasReales.texto?.substring(0, 60) + (coordenadasReales.texto?.length > 60 ? '...' : ''),
        metodo: 'PDFjs + búsqueda de texto',
        precision: 'EXACTA'
      })
    } else {
      // Usar coordenadas EXACTAS de Claude si están disponibles (PRIORIDAD MÁXIMA)
      if (prod.pagina && prod.posicion_y_porcentaje !== undefined && prod.posicion_x_porcentaje !== undefined) {
        // ✅ Claude proporcionó coordenadas porcentuales EXACTAS
        const posicionY = Math.min(Math.max(prod.posicion_y_porcentaje, 5), 95) // Limitar entre 5-95%
        const posicionX = Math.min(Math.max(prod.posicion_x_porcentaje, 5), 95) // Limitar entre 5-95%
        
        // Determinar región para referencia
        let region = 'centro'
        if (posicionY < 33) {
          region = 'superior'
        } else if (posicionY > 66) {
          region = 'inferior'
        }
        
        // Estimar ancho y alto basado en el nombre del producto
        const longitudNombre = nombreBuscar.length
        const anchoEstimado = Math.min(Math.max(longitudNombre * 0.5, 8), 35) // Entre 8% y 35%
        const altoEstimado = 2.5 // Altura estándar de línea de texto
        
        coordenadas = {
          pagina: prod.pagina,
          posicion_x: posicionX,
          posicion_y: posicionY,
          region,
          ancho: anchoEstimado,
          alto: altoEstimado,
        }
        
        logger.info(`📊 Coordenadas de CLAUDE (Visual) para "${nombreBuscar}"`, {
          pagina: coordenadas.pagina,
          posicion: `X: ${posicionX}%, Y: ${posicionY}%`,
          tamaño: `${anchoEstimado}% × ${altoEstimado}%`,
          region,
          orden: prod.orden_en_pagina || 'N/A',
          metodo: 'Claude Vision API',
          precision: 'ALTA (visual)'
        })
      } else {
        // Fallback: coordenadas aproximadas por posición en array
        const totalProductos = productosExtraidos.length
        const productosEstimadosPorPagina = Math.max(Math.ceil(totalProductos / totalPaginas), 8)
        
        const paginaCalculada = Math.min(
          Math.floor(i / productosEstimadosPorPagina) + 1,
          totalPaginas
        )
        const posicionEnPagina = i % productosEstimadosPorPagina
        
        const margenSuperior = 18
        const margenInferior = 88
        const rangoUtil = margenInferior - margenSuperior
        
        const espaciamiento = rangoUtil / (productosEstimadosPorPagina + 1)
        const posicionBaseY = margenSuperior + (posicionEnPagina + 1) * espaciamiento
        
        // Hash para posición consistente
        const hashNombre = nombreBuscar.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const variacionY = ((hashNombre % 7) - 3) * 0.5
        const posicionY = Math.max(margenSuperior, Math.min(margenInferior, posicionBaseY + variacionY))
        const posicionX = 15 + ((hashNombre % 65))
        
        let region = 'centro'
        if (posicionY < 35) {
          region = 'superior'
        } else if (posicionY > 65) {
          region = 'inferior'
        }
        
        coordenadas = {
          pagina: paginaCalculada,
          posicion_x: posicionX,
          posicion_y: Math.round(posicionY * 10) / 10,
          region
        }
        
        logger.warn(`⚠️ Coordenadas APROXIMADAS (fallback) para "${nombreBuscar}"`, {
          pagina: coordenadas.pagina,
          posicion: `X: ${coordenadas.posicion_x}%, Y: ${coordenadas.posicion_y}%`,
          region: coordenadas.region,
          metodo: 'Estimación por posición en array',
          precision: 'BAJA - Se recomienda reprocesar PDF'
        })
      }
    }
    
    const productoConInfo: ProductoIdentificado = {
      id: productoId,
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
      coordenadas: coordenadas,
    }
    
    // Log detallado de coordenadas antes de guardar
    if (coordenadas) {
      logger.debug(`📍 Coordenadas para "${nombreBuscar}" antes de guardar:`, {
        pagina: coordenadas.pagina,
        posicion_x: coordenadas.posicion_x,
        posicion_y: coordenadas.posicion_y,
        region: coordenadas.region,
        tipo_x: typeof coordenadas.posicion_x,
        tipo_y: typeof coordenadas.posicion_y,
        esNumero_x: typeof coordenadas.posicion_x === 'number',
        esNumero_y: typeof coordenadas.posicion_y === 'number',
      })
    } else {
      logger.warn(`⚠️ NO hay coordenadas para "${nombreBuscar}"`)
    }
    
    productosConInfo.push(productoConInfo)
  }
  
  // Contabilizar tipos de coordenadas
  let coordReales = 0
  let coordClaude = 0
  let coordAproximadas = 0
  
  for (const prod of productosConInfo) {
    if (prod.coordenadas) {
      // Determinar tipo de coordenada basado en la precisión
      const coordId = `producto-${productosConInfo.indexOf(prod) + 1}`
      if (coordenadasMap.has(coordId)) {
        coordReales++
      } else if (prod.coordenadas.ancho && prod.coordenadas.ancho > 5) {
        coordClaude++
      } else {
        coordAproximadas++
      }
    }
  }
  
  logger.success('✅ Búsqueda en WooCommerce completada', {
    totalProductos: productosConInfo.length,
    encontradosEnWoo: productosConInfo.filter(p => p.encontrado_en_woocommerce).length,
    noEncontradosEnWoo: productosConInfo.filter(p => !p.encontrado_en_woocommerce).length,
    coordenadas: {
      reales_pixelPerfect: `${coordReales} (${Math.round(coordReales/productosConInfo.length*100)}%)`,
      claude_visual: `${coordClaude} (${Math.round(coordClaude/productosConInfo.length*100)}%)`,
      aproximadas_fallback: `${coordAproximadas} (${Math.round(coordAproximadas/productosConInfo.length*100)}%)`,
    },
    calidad: coordReales > productosConInfo.length * 0.8 ? 'EXCELENTE' :
             coordReales > productosConInfo.length * 0.5 ? 'BUENA' :
             coordClaude > productosConInfo.length * 0.7 ? 'ACEPTABLE' : 
             'BAJA - Considerar reprocesar'
  })
  
  return productosConInfo
}

// ============================================
// POST HANDLER
// ============================================

// Límite máximo de tamaño de PDF (10MB)
const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10MB en bytes

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = new Logger('Procesar PDF')
  
  try {
    logger.start('🚀 Iniciando procesamiento de PDF con Claude AI')
    
    // Leer el body primero (solo se puede leer una vez en Next.js)
    let forzarReprocesar = false
    try {
      const body = await request.json()
      forzarReprocesar = body.forzarReprocesar === true || body.reprocesar === true
    } catch {
      // Si no hay body o hay error, continuar sin problemas (forzarReprocesar = false)
    }
    
    // Validación de permisos
    const colaborador = await getColaboradorFromCookies()
    if (!colaborador) {
      logger.error('Usuario no autenticado')
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Debes iniciar sesión para procesar PDFs.',
        },
        { status: 401 }
      )
    }
    
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
    
    // Normalizar curso de Strapi
    const cursoNormalizado = normalizarCursoStrapi(curso)
    if (!cursoNormalizado) {
      logger.error('Error al normalizar curso')
      return NextResponse.json(
        {
          success: false,
          error: 'Error al procesar los datos del curso',
        },
        { status: 500 }
      )
    }

    const versiones = cursoNormalizado.versiones_materiales || []
    const ultimaVersion = obtenerUltimaVersion(versiones)
    
    const pdfId = ultimaVersion?.pdf_id || cursoNormalizado.pdf_id
    const pdfUrl = ultimaVersion?.pdf_url || cursoNormalizado.pdf_url
    
    if (!pdfId && !pdfUrl) {
      logger.error('El curso no tiene PDF asociado')
      return NextResponse.json(
        { success: false, error: 'El curso no tiene PDF asociado' },
        { status: 400 }
      )
    }

    // Validar si el PDF ya fue procesado (evitar duplicados, a menos que se fuerce)
    if (!forzarReprocesar && pdfId && ultimaVersion) {
      const versionExistente = versiones.find((v: any) => 
        v.pdf_id === pdfId && 
        v.materiales && 
        Array.isArray(v.materiales) && 
        v.materiales.length > 0
      )
      
      if (versionExistente) {
        logger.warn('Este PDF ya fue procesado anteriormente', {
          fecha_procesamiento: versionExistente.fecha_subida || versionExistente.fecha_actualizacion,
          productos: versionExistente.materiales?.length || 0
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Este PDF ya fue procesado anteriormente',
            fecha_procesamiento: versionExistente.fecha_subida || versionExistente.fecha_actualizacion,
            productos_existentes: versionExistente.materiales?.length || 0,
            puede_reprocesar: true // Indicar que se puede reprocesar con forzarReprocesar: true
          },
          { status: 409 }
        )
      }
    } else if (forzarReprocesar) {
      logger.info('⚠️ Reprocesamiento forzado solicitado - se reemplazarán los productos existentes')
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
    
    // Validar tamaño del PDF
    if (pdfBuffer.length > MAX_PDF_SIZE) {
      const tamañoMB = (pdfBuffer.length / 1024 / 1024).toFixed(2)
      logger.error('PDF demasiado grande', {
        tamaño_actual: `${tamañoMB}MB`,
        tamaño_maximo: '10MB'
      })
      return NextResponse.json(
        {
          success: false,
          error: 'El PDF es demasiado grande',
          tamano_actual: `${tamañoMB}MB`,
          tamano_maximo: '10MB',
          detalles: 'El tamaño máximo permitido es 10MB. Por favor, comprime el PDF o divide el contenido.'
        },
        { status: 413 }
      )
    }
    
    logger.success('PDF descargado', {
      tamaño: `${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`,
      bytes: pdfBuffer.length
    })
    
    // Obtener número de páginas del PDF (necesario para coordenadas y metadata)
    let paginas = 1 // Valor por defecto
    try {
      const pdfData = await (pdfParse as any).default(pdfBuffer)
      paginas = pdfData.numpages
      logger.info('📄 Páginas del PDF:', { paginas })
    } catch (error) {
      logger.warn('⚠️ No se pudo obtener el número de páginas del PDF, usando valor por defecto: 1')
    }
    
    // ============================================
    // 3. PREPARAR PDF PARA CLAUDE VISION
    // ============================================
    logger.info('📄 Preparando PDF para Claude Vision...', {
      tamañoBuffer: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
      primerosBytes: pdfBuffer.slice(0, 4).toString('hex')
    })
    
    let pdfBase64: string
    let tamañoPDFMB: number
    
    try {
      const resultado = await prepararPDFParaClaude(pdfBuffer, logger)
      pdfBase64 = resultado.pdfBase64
      tamañoPDFMB = resultado.tamañoMB
    } catch (error: any) {
      logger.error('❌ Error al preparar PDF', {
        error: error.message,
        stack: error.stack?.substring(0, 500),
        tamañoBuffer: pdfBuffer.length
      })
      throw new Error(`No se pudo preparar PDF: ${error.message}`)
    }
    
    logger.success('✅ PDF preparado exitosamente', {
      tamañoMB: tamañoPDFMB.toFixed(2),
      tamañoBase64KB: (pdfBase64.length / 1024).toFixed(2)
    })
    
    // ============================================
    // 4. PROCESAR CON CLAUDE VISION
    // ============================================
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    })
    
    // Log del PDF que se enviará a Claude
    // ============================================
    // 6A. VERIFICAR CACHÉ DE PROCESAMIENTO
    // ============================================
    const pdfHash = obtenerHashPDF(pdfBuffer)
    const resultadoCacheado = obtenerDesdeCacheProcesamientos(pdfHash)
    
    let resultado: { productos: ProductoExtraido[] }
    
    if (resultadoCacheado) {
      logger.success('⚡ PDF ya procesado anteriormente - usando caché', {
        hash: pdfHash.substring(0, 16) + '...',
        productosEnCache: resultadoCacheado.productos.length,
        ahorro: 'No se usaron tokens de Claude'
      })
      console.log('⚡ USANDO RESULTADO CACHEADO - Ahorro de tiempo y tokens')
      resultado = resultadoCacheado
    } else {
      logger.info('📤 PDF que se enviará a Claude Vision:', {
        tamañoMB: tamañoPDFMB.toFixed(2),
        tamañoBase64KB: (pdfBase64.length / 1024).toFixed(2),
        hash: pdfHash.substring(0, 16) + '...'
      })
      
      resultado = await procesarConClaude(pdfBase64, anthropic, logger, 1, paginas)
      
      // Guardar en caché
      guardarEnCacheProcesamientos(pdfHash, resultado, paginas)
      logger.info('💾 Resultado guardado en caché', {
        hash: pdfHash.substring(0, 16) + '...',
        productos: resultado.productos.length
      })
    }
    
    logger.info('📊 Resultado de Claude:', {
      productosEncontrados: resultado.productos.length,
      primerosProductos: resultado.productos.slice(0, 5).map(p => ({
        cantidad: p.cantidad,
        nombre: p.nombre,
        isbn: p.isbn,
        marca: p.marca
      }))
    })
    
    if (resultado.productos.length === 0) {
      logger.error('❌ No se encontraron productos en el PDF', {
        tamañoPDFMB: tamañoPDFMB.toFixed(2)
      })
      return NextResponse.json({
        success: false,
        error: 'No se encontraron productos en el PDF. Verifica que el PDF contenga una lista de productos visible.',
        detalles: {
          tamañoPDFMB: tamañoPDFMB.toFixed(2)
        },
        data: {
          productos: [],
          guardadoEnStrapi: false,
        }
      }, { status: 200 })
    }
    
    // ============================================
    // FILTRAR Y VALIDAR PRODUCTOS
    // ============================================
    logger.info('🔍 Filtrando productos...', {
      totalAntesFiltrado: resultado.productos.length,
      productosOriginales: resultado.productos.map(p => ({
        cantidad: p.cantidad,
        nombre: p.nombre,
        isbn: p.isbn,
        marca: p.marca
      }))
    })
    
    // FILTRADO MÍNIMO - Solo lo esencial
    const productosFiltrados = resultado.productos.filter((producto) => {
      // Solo validar que tenga nombre y no esté vacío
      if (!producto.nombre || producto.nombre.trim().length === 0) {
        return false
      }
      
      // Validar cantidad mínima
      if (producto.cantidad <= 0) {
        producto.cantidad = 1
      }
      
      // Limpiar solo URLs
      producto.nombre = producto.nombre
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/www\.[^\s]+/g, '')
        .trim()
      
      return producto.nombre.length > 0
    })
    
    logger.info('✅ Filtrado completado', {
      totalAntes: resultado.productos.length,
      totalDespues: productosFiltrados.length,
      productosFiltrados: productosFiltrados.map(p => `${p.cantidad}x ${p.nombre}`)
    })
    
    if (productosFiltrados.length === 0) {
      logger.error('❌ Todos los productos fueron filtrados', {
        productosOriginales: resultado.productos.map(p => ({
          cantidad: p.cantidad,
          nombre: p.nombre,
          nombreLength: p.nombre?.length || 0
        }))
      })
      return NextResponse.json({
        success: false,
        error: 'No se encontraron productos válidos en el PDF después del filtrado.',
        detalles: {
          productosOriginales: resultado.productos.length,
          productosFiltrados: 0,
          productosOriginalesLista: resultado.productos.map(p => `${p.cantidad}x ${p.nombre}`)
        },
        data: {
          productos: [],
          guardadoEnStrapi: false,
        }
      }, { status: 200 })
    }
    
    // Log detallado de productos filtrados
    const productosOmitidos = resultado.productos.length - productosFiltrados.length
    logger.info(`✅ Productos extraídos por Claude: ${resultado.productos.length} → ${productosFiltrados.length} válidos (${productosOmitidos} omitidos)`, {
      productos: productosFiltrados.slice(0, 10).map(p => `${p.cantidad}x ${p.nombre}`),
      total: productosFiltrados.length,
      omitidos: productosOmitidos,
      resumen: {
        conISBN: productosFiltrados.filter(p => p.isbn).length,
        conMarca: productosFiltrados.filter(p => p.marca).length,
        conPrecio: productosFiltrados.filter(p => p.precio > 0).length,
        conAsignatura: productosFiltrados.filter(p => p.asignatura).length,
      }
    })
    
    // Usar productos filtrados en lugar de los originales
    resultado.productos = productosFiltrados
    
    // ============================================
    // 7. BUSCAR EN WOOCOMMERCE Y EXTRAER COORDENADAS REALES
    // ============================================
    const productosConInfo = await buscarEnWooCommerce(resultado.productos, logger, paginas, pdfBuffer)
    
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
        fecha_actualizacion: obtenerFechaChileISO(),
        procesado_con_ia: true,
        modelo_ia: resultado.modeloUsado || CLAUDE_MODEL_SONNET,
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
          precio: p.precio,
          coordenadas: p.coordenadas ? {
            pagina: p.coordenadas.pagina,
            posicion_x: p.coordenadas.posicion_x,
            posicion_y: p.coordenadas.posicion_y,
            region: p.coordenadas.region
          } : null
        })),
        productosConCoordenadas: versionActualizada.materiales.filter((p: any) => p.coordenadas).length,
        totalProductos: versionActualizada.materiales.length
      })
      
      await strapiClient.put(`/api/cursos/${cursoDocumentId}`, {
        data: {
          versiones_materiales: versionesActualizadas,
        },
      })
      
      // Verificar que las coordenadas se guardaron correctamente
      const respuestaVerificacion = await strapiClient.get<StrapiResponse<any>>(`/api/cursos/${cursoDocumentId}?populate=*`)
      const cursoVerificado = respuestaVerificacion.data
      const versionesVerificadas = cursoVerificado?.versiones_materiales || []
      const versionVerificada = versionesVerificadas.find((v: any) => v.version_numero === versionActualizada.version_numero)
      
      if (versionVerificada?.materiales) {
        const productosConCoordenadas = versionVerificada.materiales.filter((p: any) => p.coordenadas)
        logger.debug('✅ Verificación post-guardado:', {
          totalMateriales: versionVerificada.materiales.length,
          productosConCoordenadas: productosConCoordenadas.length,
          primerosConCoordenadas: productosConCoordenadas.slice(0, 2).map((p: any) => ({
            nombre: p.nombre,
            coordenadas: p.coordenadas
          }))
        })
      }
      
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
        modelo_usado: resultado.modeloUsado || CLAUDE_MODEL_SONNET,
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
