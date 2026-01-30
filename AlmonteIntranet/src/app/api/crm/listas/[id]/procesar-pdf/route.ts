/**
 * API Route para procesar PDF de lista de útiles con Claude AI (Anthropic)
 * POST /api/crm/listas/[id]/procesar-pdf
 * 
 * Extrae texto del PDF usando pdf-parse y lo envía a Claude para obtener productos estructurados
 * 
 * ⚠️ IMPORTANTE: Usa pdf-parse, NO pdfjs-dist (causa errores de workers en Next.js)
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
// @ts-ignore - pdf-parse no tiene tipos oficiales
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
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
const MAX_CARACTERES_SEGURO = 140000 // 70% del límite
const MAX_RETRIES_CLAUDE = 3
const RETRY_DELAY_MS = 1000

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
    
    const data = await pdfParse(pdfBuffer, {
      max: 0 // sin límite de páginas
    })
    
    logger.success('Texto extraído exitosamente', {
      paginas: data.numpages,
      caracteres: data.text.length
    })
    
    return {
      texto: data.text,
      paginas: data.numpages
    }
    
  } catch (error) {
    logger.error('Error al extraer texto del PDF', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
    throw new Error(
      `Error al extraer texto del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
    )
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
    
  } catch (error) {
    logger.error(`Error en intento ${intento}`, {
      error: error instanceof Error ? error.message : 'Error desconocido',
      tipo: error instanceof z.ZodError ? 'ZodError' : error instanceof SyntaxError ? 'SyntaxError' : 'UnknownError'
    })
    
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
  logger: Logger
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
    })
  }
  
  logger.success('Búsqueda en WooCommerce completada', {
    total: productosConInfo.length,
    encontrados: productosConInfo.filter(p => p.encontrado_en_woocommerce).length,
    noEncontrados: productosConInfo.filter(p => !p.encontrado_en_woocommerce).length
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
        logger.success('Curso encontrado por documentId')
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
    // 5. VALIDAR LONGITUD
    // ============================================
    const validacion = validarLongitudTexto(textoLimpio, MAX_CARACTERES_SEGURO, logger)
    
    if (!validacion.esValido) {
      logger.warn('Texto excede límite seguro, pero continuando...', validacion)
      // Aquí podrías implementar chunking si es necesario
      // Por ahora continuamos con el texto completo
    }
    
    // ============================================
    // 6. PROCESAR CON CLAUDE
    // ============================================
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    })
    
    const resultado = await procesarConClaude(textoLimpio, anthropic, logger)
    
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
    const productosConInfo = await buscarEnWooCommerce(resultado.productos, logger)
    
    // ============================================
    // 8. GUARDAR EN STRAPI
    // ============================================
    logger.save('Guardando en Strapi...')
    
    let guardadoExitoso = false
    let errorGuardado = null
    
    try {
      const versionActualizada = {
        ...ultimaVersion,
        productos: productosConInfo,
        fecha_actualizacion: new Date().toISOString(),
        procesado_con_ia: true,
        modelo_ia: CLAUDE_MODEL,
        version_numero: (ultimaVersion?.version_numero || 0) + 1
      }
      
      const otrasVersiones = versiones.filter((v: any) => 
        v !== ultimaVersion && 
        v.fecha_actualizacion !== ultimaVersion?.fecha_actualizacion
      )
      
      const versionesActualizadas = [versionActualizada, ...otrasVersiones]
      
      const cursoId = curso.id || curso.documentId
      await strapiClient.put(`/api/cursos/${cursoId}`, {
        data: {
          versiones_materiales: versionesActualizadas,
        },
      })
      
      guardadoExitoso = true
      logger.success('Guardado exitoso en Strapi', {
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
