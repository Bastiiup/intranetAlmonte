/**
 * POST /api/crm/listas/[id]/extract-pdf
 * Extrae datos estructurados de un PDF usando IA (Google Gemini)
 */

// IMPORTANTE: Aplicar polyfills ANTES de cualquier importación que use pdfjs-dist
// Esto previene errores como "Class constructor cannot be invoked without 'new'"
if (typeof globalThis !== 'undefined') {
  // Polyfill para AbortException (necesario para pdfjs-dist@2.16.105)
  // Debe funcionar tanto con 'new AbortException()' como con 'AbortException()'
  if (typeof (globalThis as any).AbortException === 'undefined') {
    class AbortExceptionPolyfill extends Error {
      constructor(message?: string) {
        super(message || 'Operation aborted')
        this.name = 'AbortException'
        // Asegurar que sea una instancia de Error
        Object.setPrototypeOf(this, AbortExceptionPolyfill.prototype)
      }
    }
    
    // Crear una función que pueda ser llamada con o sin 'new'
    const AbortExceptionFactory = function (this: any, message?: string) {
      if (!(this instanceof AbortExceptionFactory)) {
        // Llamado sin 'new', crear nueva instancia
        return new AbortExceptionPolyfill(message)
      }
      // Llamado con 'new', usar como constructor
      return new AbortExceptionPolyfill(message)
    } as any
    
    // Copiar el prototipo para que funcione como clase
    AbortExceptionFactory.prototype = AbortExceptionPolyfill.prototype
    AbortExceptionFactory.prototype.constructor = AbortExceptionPolyfill
    
    ;(globalThis as any).AbortException = AbortExceptionFactory
  }
  
  // Polyfill adicional: Asegurar que Error tenga todas las propiedades necesarias
  // Esto ayuda con compatibilidad de pdfjs-dist
  if (typeof Error.captureStackTrace === 'undefined') {
    Error.captureStackTrace = function (obj: any, func?: Function) {
      // Polyfill básico para captureStackTrace
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
import strapiClient from '@/lib/strapi/client'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Asegurar que se ejecute en Node.js

// Función helper para extraer texto de PDF
// SOLUCIÓN SIMPLE: Enviar solo el texto básico o usar una aproximación diferente
// Dado que pdfjs-dist y pdf-parse tienen problemas, usamos una solución más simple
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    debugLogExtract('Iniciando extracción de texto...')
    debugLogExtract('Tamaño del buffer:', pdfBuffer.length, 'bytes')
    
    // SOLUCIÓN: Configurar pdfjs-dist ANTES de cargar pdf-parse
    // pdf-parse usa pdfjs-dist internamente, así que necesitamos configurar el worker primero
    try {
      // Configurar pdfjs-dist con el worker ANTES de que pdf-parse lo cargue
      // Intentar diferentes rutas según la versión de pdfjs-dist
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
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            pdfjs = require(pdfjsPath)
            if (pdfjs) break
          } catch {
            // Continuar con el siguiente path
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
          debugLogExtract('✅ Worker configurado:', workerPath)
        }
      } catch (pdfjsError: any) {
        debugLogExtract('⚠️ No se pudo configurar pdfjs-dist, continuando...', pdfjsError.message)
      }
      
      // Ahora cargar pdf-parse (usará pdfjs-dist ya configurado)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
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
      
      debugLogExtract('✅ pdf-parse cargado, ejecutando...')
      const data = await pdfParse(pdfBuffer)
      const text = data.text || ''
      
      if (text.trim().length > 0) {
        debugLogExtract('✅ Extracción exitosa con pdf-parse')
        return text.trim()
      }
      
      throw new Error('PDF no contiene texto extraíble')
    } catch (parseError: any) {
      debugLogExtract('⚠️ pdf-parse falló:', parseError.message)
      
      // Si el error es relacionado con worker, proporcionar mensaje específico
      if (parseError.message.includes('worker') || parseError.message.includes('pdf.worker')) {
        throw new Error(
          `Error de configuración: Las librerías de PDF requieren configuración adicional. ` +
          `Por favor, contacta al administrador del sistema. ` +
          `Error técnico: ${parseError.message}`
        )
      }
      
      // Si el error es de constructor, también es un problema de configuración
      if (parseError.message.includes('constructor') || parseError.message.includes('cannot be invoked')) {
        throw new Error(
          `Error de compatibilidad con las librerías de PDF. ` +
          `Por favor, contacta al administrador del sistema. ` +
          `Error técnico: ${parseError.message}`
        )
      }
      
      // Intentar extraer texto básico del buffer como último recurso
      try {
        debugLogExtract('Intentando extracción básica del buffer...')
        const bufferString = pdfBuffer.toString('utf8', 0, Math.min(10000, pdfBuffer.length))
        // Buscar patrones de texto común en PDFs
        const textMatches = bufferString.match(/\((.*?)\)/g) || []
        if (textMatches.length > 0) {
          const extractedText = textMatches
            .map((match: string) => match.slice(1, -1)) // Remover paréntesis
            .filter((text: string) => text.length > 2 && !text.match(/^[\d\s]+$/)) // Filtrar números solos
            .join(' ')
          
          if (extractedText.trim().length > 50) {
            debugLogExtract('✅ Texto básico extraído del buffer')
            return extractedText.trim()
          }
        }
      } catch (basicError: any) {
        debugLogExtract('⚠️ Extracción básica también falló:', basicError.message)
      }
      
      // Si todo falla, lanzar error con mensaje útil
      throw new Error(
        `No se pudo extraer texto del PDF. ` +
        `El PDF puede estar protegido, ser solo imágenes, o haber un problema con las librerías. ` +
        `Error original: ${parseError.message}. ` +
        `Por favor, verifica que el PDF contenga texto seleccionable.`
      )
    }
  } catch (error: any) {
    debugLogExtract('❌ Error en extractTextFromPDF:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    throw new Error(`Error al extraer texto del PDF: ${error.message}`)
  }
}

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG_CRM === 'true'
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

// Helper para debug dentro de extractTextFromPDF
const debugLogExtract = (...args: any[]) => {
  if (DEBUG) {
    console.log('[extractTextFromPDF]', ...args)
  }
}

interface MaterialItem {
  relacion_orden?: string
  asignatura: string
  relacion_orden_num?: number
  cantidad: string
  categoria: string
  imagen?: string
  item: string
  marca: string
  isbn?: string
  notas?: string
  boton?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { pdf_id } = body

    if (!pdf_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'pdf_id es requerido',
        },
        { status: 400 }
      )
    }

    debugLog('[API /crm/listas/[id]/extract-pdf POST] Iniciando extracción...', { id, pdf_id })

    // 1. Obtener el PDF desde Strapi usando fetch directo (más confiable)
    let pdfUrl: string | null = null
    try {
      const strapiUrl = getStrapiUrl(`/api/upload/files/${pdf_id}`)
      
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Obteniendo PDF desde:', strapiUrl)
      
      const pdfResponse = await fetch(strapiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN || ''}`,
        },
      })

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text().catch(() => 'Error desconocido')
        throw new Error(`HTTP ${pdfResponse.status}: ${errorText}`)
      }

      const fileData = await pdfResponse.json()
      
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Datos del archivo:', {
        hasUrl: !!fileData.url,
        fileDataKeys: Object.keys(fileData || {}),
        url: fileData.url,
      })
      
      if (!fileData.url) {
        throw new Error('El archivo no tiene URL en la respuesta de Strapi')
      }

      // Construir URL completa del archivo
      pdfUrl = fileData.url.startsWith('http')
        ? fileData.url
        : `${getStrapiUrl('').replace(/\/$/, '')}${fileData.url}`
      
      debugLog('[API /crm/listas/[id]/extract-pdf POST] PDF URL final:', pdfUrl)
    } catch (pdfError: any) {
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Error al obtener PDF:', {
        message: pdfError.message,
        pdf_id,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener el PDF: ' + pdfError.message,
        },
        { status: 404 }
      )
    }

    if (!pdfUrl) {
      debugLog('[API /crm/listas/[id]/extract-pdf POST] ⚠️ No se pudo obtener URL del PDF')
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la URL del PDF. Verifica que el PDF exista en Strapi.',
        },
        { status: 404 }
      )
    }

    // 2. Descargar el PDF y enviarlo directamente a Gemini (evita problemas de extracción de texto)
    let pdfBase64 = ''
    try {
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Descargando PDF desde:', pdfUrl)
      
      // Descargar el PDF con autenticación si es necesario
      const pdfResponse = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN || ''}`,
        },
      })
      
      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text().catch(() => pdfResponse.statusText)
        throw new Error(`Error al descargar PDF (${pdfResponse.status}): ${errorText.substring(0, 200)}`)
      }

      const pdfBuffer = await pdfResponse.arrayBuffer()
      debugLog('[API /crm/listas/[id]/extract-pdf POST] PDF descargado, tamaño:', pdfBuffer.byteLength, 'bytes')
      
      // Convertir a base64 para enviar a Gemini
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
      debugLog('[API /crm/listas/[id]/extract-pdf POST] PDF convertido a base64, longitud:', pdfBase64.length)
    } catch (downloadError: any) {
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Error al descargar PDF:', downloadError.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Error al descargar PDF: ' + downloadError.message,
        },
        { status: 500 }
      )
    }

    // 3. Enviar PDF directamente a Google Gemini (Gemini 1.5 puede procesar PDFs directamente)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'GEMINI_API_KEY no está configurada. Por favor, configura la variable de entorno.',
        },
        { status: 500 }
      )
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    const prompt = `
Analiza este PDF de lista de útiles escolares y extrae todos los materiales en formato JSON.

Estructura esperada:
{
  "materiales": [
    {
      "asignatura": "Lenguaje",
      "item": "Diccionario 4",
      "cantidad": "1",
      "categoria": "Libro",
      "marca": "Santillana",
      "isbn": "123456789",
      "notas": "Ver descuentos en web",
      "relacion_orden": "1 Lenguaje",
      "relacion_orden_num": 1
    },
    ...
  ]
}

Campos requeridos:
- asignatura: La asignatura o materia (Lenguaje, Matemática, etc.)
- item: El nombre del material
- cantidad: La cantidad necesaria (puede ser "1", "5 Varios", etc.)
- categoria: Tipo de material (Materiales, Libro, Cuaderno, Otro)
- marca: La marca del producto (puede ser "N/A" si no aplica)

Campos opcionales:
- isbn: ISBN del libro si aplica
- notas: Notas adicionales
- relacion_orden: Relación de orden completa (ej: "1 Lenguaje")
- relacion_orden_num: Número de orden (1, 2, 3, etc.)
- imagen: URL de imagen si está disponible
- boton: Texto de botón si hay (ej: "Validar")

IMPORTANTE:
- Extrae TODOS los materiales que encuentres en el PDF
- Si hay tablas, lee todas las filas
- Si hay listas, incluye todos los items
- Mantén la información lo más completa posible
- Si un campo no está disponible, usa valores por defecto razonables (ej: marca: "N/A", categoria: "Materiales")
- Analiza el PDF completo, incluyendo todas las páginas
`

    try {
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Procesando PDF con gemini-pro...')
      
      // Usar solo gemini-pro (más estable y ampliamente disponible)
      // Este modelo requiere extracción de texto previa
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Modelo inicializado: gemini-pro')
      
      // Extraer texto del PDF primero
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Extrayendo texto del PDF...')
      const pdfBuffer = Buffer.from(pdfBase64, 'base64')
      const pdfText = await extractTextFromPDF(pdfBuffer)
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Texto extraído, longitud:', pdfText.length)
      
      // Crear prompt con el texto extraído
      const promptWithText = `${prompt}\n\nTexto extraído del PDF:\n${pdfText}`
      
      // Enviar a Gemini
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Enviando a gemini-pro...')
      const result = await model.generateContent(promptWithText)
      debugLog('[API /crm/listas/[id]/extract-pdf POST] ✅ Respuesta recibida de gemini-pro')
      
      const response = await result.response
      const responseText = response.text()
      
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Respuesta de Gemini:', responseText.substring(0, 500))

      // 4. Parsear la respuesta JSON
      let materiales: MaterialItem[] = []
      try {
        // Intentar extraer JSON de la respuesta (puede venir con markdown)
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/)
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText
        
        const parsed = JSON.parse(jsonText)
        materiales = Array.isArray(parsed.materiales) ? parsed.materiales : []
        
        // Asegurar que todos los materiales tengan campos requeridos
        materiales = materiales.map((m, index) => ({
          ...m,
          asignatura: m.asignatura || 'Lenguaje',
          item: m.item || `Material ${index + 1}`,
          cantidad: m.cantidad || '1',
          categoria: m.categoria || 'Materiales',
          marca: m.marca || 'N/A',
          relacion_orden_num: m.relacion_orden_num || index + 1,
        }))

        debugLog('[API /crm/listas/[id]/extract-pdf POST] Materiales extraídos:', materiales.length)
      } catch (parseError: any) {
        debugLog('[API /crm/listas/[id]/extract-pdf POST] Error al parsear JSON:', parseError.message)
        return NextResponse.json(
          {
            success: false,
            error: 'Error al parsear respuesta de IA: ' + parseError.message,
            rawResponse: responseText.substring(0, 1000),
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          materiales,
          extractedAt: new Date().toISOString(),
        },
        message: `Se extrajeron ${materiales.length} materiales del PDF`,
      })
    } catch (geminiError: any) {
      debugLog('[API /crm/listas/[id]/extract-pdf POST] Error en Google Gemini:', geminiError.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Error al comunicarse con Google Gemini: ' + geminiError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    debugLog('[API /crm/listas/[id]/extract-pdf POST] Error general:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al extraer datos del PDF',
      },
      { status: 500 }
    )
  }
}

