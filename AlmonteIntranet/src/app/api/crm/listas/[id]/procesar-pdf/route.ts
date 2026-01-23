/**
 * API Route para procesar PDF de lista de útiles con Gemini AI
 * POST /api/crm/listas/[id]/procesar-pdf
 * 
 * Envía el PDF directamente a Gemini AI (que soporta PDFs nativamente) para obtener productos estructurados
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createWooCommerceClient } from '@/lib/woocommerce/client'
import type { WooCommerceProduct } from '@/lib/woocommerce/types'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Aumentar timeout para PDFs grandes (máximo 5 minutos)
export const maxDuration = 300

// Obtener API key de Gemini (debe estar configurada como variable de entorno)
// La validación se hace dentro de la función POST para devolver respuesta HTTP adecuada

// Modelos disponibles (en orden de preferencia)
// Actualizado para usar modelos 2.0 y 2.5 que están disponibles en la API
// El modelo gemini-2.5-flash está verificado como funcional
const MODELOS_DISPONIBLES = [
  'gemini-2.5-flash',      // ✅ VERIFICADO: Modelo flash más reciente y funcional
  'gemini-2.0-flash',      // Modelo flash 2.0 (fallback)
  'gemini-2.0-flash-001',  // Modelo flash 2.0 con versión específica
  'gemini-2.5-pro',        // Modelo pro más reciente (disponible)
  'gemini-2.0-flash-lite', // Modelo flash lite (más rápido)
  'gemini-flash-latest',   // Última versión flash (alias)
  'gemini-pro-latest',     // Última versión pro (alias)
  // NOTA: Los modelos 1.5 ya no están disponibles (404)
  // NOTA: gemini-2.5-flash está verificado como funcional con la nueva API key
]

interface CoordenadasProducto {
  pagina: number
  posicion_x?: number // Posición horizontal aproximada (0-100 como porcentaje del ancho de página)
  posicion_y?: number // Posición vertical aproximada (0-100 como porcentaje del alto de página)
  region?: string // Descripción de la región (ej: "superior", "medio", "inferior", "izquierda", "derecha")
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
  woocommerce_id?: number
  woocommerce_sku?: string
  stock_quantity?: number
  encontrado_en_woocommerce?: boolean
  coordenadas?: CoordenadasProducto
}

/**
 * POST /api/crm/listas/[id]/procesar-pdf
 * Procesa el PDF del curso usando Gemini AI para extraer productos
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validar API key de Gemini
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'GEMINI_API_KEY no está configurada. Por favor, configura esta variable de entorno en Railway o .env.local',
          detalles: 'La API key de Google Gemini es necesaria para procesar los PDFs. Consulta la documentación en docs/COMO-OBTENER-API-KEY-GEMINI.md'
        },
        { status: 500 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista es requerido',
        },
        { status: 400 }
      )
    }

    console.log('[Procesar PDF] 🚀 Iniciando procesamiento...')

    // ============================================
    // 1. OBTENER CURSO DESDE STRAPI
    // ============================================
    let curso: any = null
    let errorMessages: string[] = []

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
        console.log('[Procesar PDF] ✅ Curso encontrado')
      } else if (cursoResponse.data && !Array.isArray(cursoResponse.data)) {
        curso = cursoResponse.data
        console.log('[API /crm/listas/[id]/procesar-pdf] ✅ Curso encontrado por documentId (no array)')
      }
    } catch (docIdError: any) {
      errorMessages.push(`Error al buscar por documentId: ${docIdError.message}`)
      console.warn('[API /crm/listas/[id]/procesar-pdf] ⚠️', errorMessages[errorMessages.length - 1])
    }

    // Si no se encontró con documentId, intentar con id numérico
    if (!curso && /^\d+$/.test(String(id))) {
      try {
        console.log('[API /crm/listas/[id]/procesar-pdf] 📋 Buscando curso por id numérico:', id)
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${id}?publicationState=preview&populate[colegio]=true`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
          console.log('[API /crm/listas/[id]/procesar-pdf] ✅ Curso encontrado por id numérico')
        }
      } catch (idError: any) {
        errorMessages.push(`Error al buscar por id numérico: ${idError.message}`)
        console.warn('[API /crm/listas/[id]/procesar-pdf] ⚠️', errorMessages[errorMessages.length - 1])
      }
    }

    if (!curso) {
      console.error('[API /crm/listas/[id]/procesar-pdf] ❌ Curso no encontrado. ID:', id)
      return NextResponse.json(
        {
          success: false,
          error: 'Lista no encontrada',
          details: `No se pudo encontrar el curso con ID: ${id}`,
          errors: errorMessages,
        },
        { status: 404 }
      )
    }

    // ============================================
    // 2. OBTENER PDF ID Y DESCARGAR PDF
    // ============================================
    const attrs = curso.attributes || curso
    const versiones = attrs.versiones_materiales || []
    const ultimaVersion = versiones.length > 0 
      ? versiones.sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
          const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
          return fechaB - fechaA
        })[0]
      : null

    const pdfId = ultimaVersion?.pdf_id || null

    if (!pdfId) {
      return NextResponse.json(
        {
          success: false,
          error: 'La lista no tiene PDF asociado',
        },
        { status: 400 }
      )
    }

    // Descargar PDF desde Strapi
    const { getStrapiUrl, STRAPI_API_TOKEN } = await import('@/lib/strapi/config')
    const strapiUrl = getStrapiUrl(`/api/upload/files/${pdfId}`)
    
    console.log('[Procesar PDF] ⬇️ Descargando PDF desde Strapi...')
    
    let pdfBuffer: ArrayBuffer
    try {
      const fileResponse = await fetch(strapiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN || ''}`,
        },
      })

      if (!fileResponse.ok) {
        throw new Error(`Error al obtener archivo desde Strapi: ${fileResponse.status}`)
      }

      const fileData = await fileResponse.json()
      
      if (!fileData.url) {
        throw new Error('El archivo no tiene URL')
      }

      const fileUrl = fileData.url.startsWith('http')
        ? fileData.url
        : `${getStrapiUrl('').replace(/\/$/, '')}${fileData.url}`

      const pdfResponse = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN || ''}`,
        },
      })

      if (!pdfResponse.ok) {
        throw new Error(`Error al descargar PDF: ${pdfResponse.status}`)
      }

      pdfBuffer = await pdfResponse.arrayBuffer()
      console.log('[Procesar PDF] ✅ PDF descargado:', pdfBuffer.byteLength, 'bytes')
    } catch (downloadError: any) {
      console.error('[API /crm/listas/[id]/procesar-pdf] ❌ Error al descargar PDF:', downloadError)
      return NextResponse.json(
        {
          success: false,
          error: 'Error al descargar el PDF',
          details: downloadError.message,
          sugerencia: 'Verifica que el PDF exista en Strapi y que tengas permisos para accederlo',
        },
        { status: 500 }
      )
    }

    // ============================================
    // 3. CONVERTIR PDF A BASE64 PARA GEMINI
    // ============================================
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
    const pdfSizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(2)
    
    console.log('[Procesar PDF] 📊 Información del PDF:', {
      tamañoBytes: pdfBuffer.byteLength,
      tamañoMB: `${pdfSizeMB} MB`,
      tamañoBase64: `${(pdfBase64.length / (1024 * 1024)).toFixed(2)} MB`,
    })
    
    // Advertencia si el PDF es muy grande (>20MB)
    if (pdfBuffer.byteLength > 20 * 1024 * 1024) {
      console.warn('[Procesar PDF] ⚠️ PDF muy grande, puede tardar más tiempo en procesarse')
    }

    // ============================================
    // 4. PROCESAR PDF DIRECTAMENTE CON GEMINI
    // ============================================
    console.log('[Procesar PDF] 🤖 Procesando con Gemini AI...')
    
    // GEMINI_API_KEY ya está validada arriba
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!)
    
    // ============================================
    // 3.5. MODELOS PARA PROCESAR (OPTIMIZADO)
    // ============================================
    
    // OPTIMIZACIÓN: Usar directamente la lista predeterminada sin consultar API
    // Esto ahorra ~200-500ms por request. El modelo gemini-2.5-flash está verificado como funcional.
    const modelosParaProbar = MODELOS_DISPONIBLES.slice(0, 3) // Solo probar los 3 primeros (más rápidos)
    
    // OPTIMIZACIÓN: Prompt más conciso (reduce tokens y tiempo de procesamiento)
    const prompt = `Extrae TODOS los productos de esta lista de útiles escolares chilena.

REGLAS:
- Número al inicio = cantidad (si no hay, cantidad = 1)
- "nombre" = nombre COMPLETO y específico (NO genéricos como "Libro")
- Ignora: títulos, asignaturas, instrucciones, portadas, índices
- Extrae: ISBN, precio, asignatura si están presentes
- Coordenadas: página (1+), posicion_x (centro horizontal 0-100), posicion_y (centro vertical 0-100)

EJEMPLOS:
✅ "2 Cuadernos universitarios" → cantidad: 2, nombre: "Cuaderno universitario"
✅ "El laberinto de la soledad" → cantidad: 1, nombre: "El laberinto de la soledad"
✅ "Lápiz grafito N°2" → cantidad: 1, nombre: "Lápiz grafito N°2"

FORMATO JSON (sin markdown, sin backticks):
{
  "productos": [
    {
      "cantidad": 2,
      "nombre": "Cuaderno universitario",
      "isbn": null,
      "marca": null,
      "comprar": true,
      "precio": 0,
      "asignatura": null,
      "descripcion": "100 hojas cuadriculado",
      "coordenadas": {
        "pagina": 2,
        "posicion_x": 15,
        "posicion_y": 30
      }
    }
  ]
}

Responde SOLO con JSON válido.`

    let resultado: any = null
    let modeloUsado: string | null = null
    let errorModelos: Array<{ modelo: string; error: string }> = []
    
    // Probar modelos en orden hasta que uno funcione
    console.log(`[Procesar PDF] 🔍 Modelos disponibles para probar:`, modelosParaProbar.length > 0 ? modelosParaProbar : MODELOS_DISPONIBLES)
    for (const nombreModelo of (modelosParaProbar.length > 0 ? modelosParaProbar : MODELOS_DISPONIBLES)) {
      try {
        console.log(`[Procesar PDF] 🔄 Probando modelo: ${nombreModelo}`)
        
        const model = genAI.getGenerativeModel({ 
          model: nombreModelo,
          generationConfig: {
            temperature: 0.0, // OPTIMIZACIÓN: Más determinista = más rápido
            topP: 0.7, // OPTIMIZACIÓN: Reducido para respuestas más rápidas
            topK: 20, // OPTIMIZACIÓN: Reducido para respuestas más rápidas
            maxOutputTokens: 8192, // OPTIMIZACIÓN: Límite razonable para evitar respuestas muy largas
          }
        })
        
        // Enviar PDF directamente a Gemini con timeout
        console.log(`[Procesar PDF] Enviando PDF a Gemini (${nombreModelo})...`)
        console.log(`[Procesar PDF] Tamaño del PDF: ${pdfSizeMB} MB`)
        
        // OPTIMIZACIÓN: Reducir timeout a 3 minutos (gemini-2.5-flash es más rápido)
        const controller = new AbortController()
        const timeoutMs = 180000 // 3 minutos (reducido de 4)
        let timeoutId: NodeJS.Timeout | null = null
        
        try {
          timeoutId = setTimeout(() => {
            controller.abort()
          }, timeoutMs)
        
          const result = await Promise.race([
          model.generateContent([
            prompt,
            {
              inlineData: {
                data: pdfBase64,
                mimeType: 'application/pdf'
              }
            }
          ]),
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error(`Timeout: El procesamiento tardó más de ${timeoutMs / 1000} segundos. El PDF puede ser muy grande.`))
            })
          })
        ]) as any
        
          if (timeoutId) clearTimeout(timeoutId)
          
          if (!result || !result.response) {
            throw new Error('Respuesta inválida de Gemini')
          }
          
          const textoRespuesta = result.response.text()
          
          // ⭐ LOG COMPLETO DE LA RESPUESTA
          console.log(`[Procesar PDF] 📝 Respuesta completa de Gemini (${nombreModelo}):`)
          console.log(textoRespuesta)
          console.log('[Procesar PDF] Fin de respuesta')
          console.log(`[Procesar PDF] Longitud de respuesta: ${textoRespuesta.length} caracteres`)
          
          // Verificar si la respuesta parece ser JSON
          let textoParaParsear = textoRespuesta.trim()
          
          if (!textoParaParsear.startsWith('{')) {
            console.log('[Procesar PDF] ⚠️ La respuesta no empieza con {, intentando extraer JSON...')
            
            // Buscar JSON dentro del texto
            const jsonMatch = textoParaParsear.match(/\{[\s\S]*\}/)
            
            if (jsonMatch) {
              textoParaParsear = jsonMatch[0]
              console.log('[Procesar PDF] ✅ JSON extraído del texto')
            } else {
              throw new Error(`Gemini no devolvió JSON válido. Respuesta: ${textoParaParsear.substring(0, 200)}`)
            }
          }
          
          // Limpiar respuesta
          let jsonLimpio = textoParaParsear
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim()
          
          console.log('[Procesar PDF] JSON limpio para parsear:')
          console.log(jsonLimpio.substring(0, 500) + (jsonLimpio.length > 500 ? '...' : ''))
          
          // Intentar parsear JSON
          resultado = JSON.parse(jsonLimpio)
          
          console.log('[Procesar PDF] JSON parseado exitosamente:')
          console.log(JSON.stringify(resultado, null, 2).substring(0, 1000) + '...')
          
          // ⭐ VERIFICAR que tenga productos
          if (!resultado.productos || !Array.isArray(resultado.productos)) {
            console.log('[Procesar PDF] ⚠️ Respuesta no tiene array de productos')
            console.log('[Procesar PDF] Estructura recibida:', Object.keys(resultado))
            throw new Error('La respuesta no contiene un array de productos')
          }
          
          if (resultado.productos.length === 0) {
            console.log('[Procesar PDF] ⚠️ Array de productos está vacío')
            throw new Error('No se encontraron productos en el PDF')
          }
          
          modeloUsado = nombreModelo
          
          console.log(`[Procesar PDF] ✅ Éxito con: ${nombreModelo}`)
          console.log(`[Procesar PDF] Productos extraídos: ${resultado.productos.length}`)
          console.log('[Procesar PDF] Primeros productos:', resultado.productos.slice(0, 3).map((p: any) => ({
            cantidad: p.cantidad,
            nombre: p.nombre,
            descripcion: p.descripcion?.substring(0, 50)
          })))
          
          break // Salir si funcionó
          
        } catch (innerError: any) {
          if (timeoutId) clearTimeout(timeoutId)
          throw innerError
        }
        
      } catch (error: any) {
        const errorMsg = error.message || String(error)
        console.error(`[Procesar PDF] ❌ Modelo ${nombreModelo} falló:`, errorMsg)
        console.error('[Procesar PDF] Stack del error:', error.stack)
        console.error('[Procesar PDF] Error completo:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        
        // Detectar tipos de errores específicamente
        if (errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
          console.error('[Procesar PDF] ⏱️ Error de timeout detectado')
          errorModelos.push({ 
            modelo: nombreModelo, 
            error: `Timeout: El PDF es muy grande (${pdfSizeMB} MB). Intenta con un PDF más pequeño o divide el contenido.` 
          })
        } else if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Quota') || errorMsg.includes('Too Many Requests')) {
          // Error de cuota excedida
          console.error('[Procesar PDF] ⚠️ Error de cuota detectado')
          const retryAfter = errorMsg.match(/retry in (\d+\.?\d*)s/i)?.[1] || '20'
          errorModelos.push({ 
            modelo: nombreModelo, 
            error: `Cuota excedida: Has alcanzado el límite de solicitudes del plan gratuito. Espera ${retryAfter} segundos o actualiza a un plan de pago.` 
          })
          // Si es error de cuota, esperar un poco antes de intentar el siguiente modelo
          if (MODELOS_DISPONIBLES.indexOf(nombreModelo) < MODELOS_DISPONIBLES.length - 1) {
            const waitTime = Math.min(parseFloat(retryAfter) * 1000 || 20000, 30000) // Máximo 30 segundos
            console.log(`[Procesar PDF] ⏳ Esperando ${waitTime / 1000}s antes de probar siguiente modelo...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        } else if (errorMsg.includes('404') || errorMsg.includes('Not Found') || errorMsg.includes('not found')) {
          // Modelo no existe
          console.warn(`[Procesar PDF] ⚠️ Modelo ${nombreModelo} no existe o no está disponible`)
          errorModelos.push({ 
            modelo: nombreModelo, 
            error: `Modelo no disponible: Este modelo ya no existe o no está disponible en la API v1beta.` 
          })
        } else {
          errorModelos.push({ modelo: nombreModelo, error: errorMsg })
        }
        continue // Intentar siguiente
      }
    }
    
    // Si ningún modelo funcionó
    if (!resultado?.productos || resultado.productos.length === 0) {
      console.error('[Procesar PDF] ❌ Ningún modelo funcionó o no se encontraron productos')
      console.error('[Procesar PDF] Errores de todos los modelos:', JSON.stringify(errorModelos, null, 2))
      
      // Detectar tipos de errores
      const todosTimeouts = errorModelos.every(e => e.error.includes('Timeout') || e.error.includes('timeout'))
      const todosQuotas = errorModelos.every(e => e.error.includes('Cuota') || e.error.includes('quota') || e.error.includes('Quota'))
      const todos404 = errorModelos.every(e => e.error.includes('404') || e.error.includes('Not Found') || e.error.includes('no existe'))
      
      let errorMessage = 'No se pudieron extraer productos del PDF'
      let sugerencia = 'Verifica que el PDF contenga una lista de útiles escolares válida y que tu API key de Gemini tenga acceso a los modelos.'
      let statusCode = 500
      
      if (todosQuotas) {
        errorMessage = 'Cuota de API excedida: Has alcanzado el límite de solicitudes del plan gratuito de Gemini'
        sugerencia = `El plan gratuito de Gemini tiene límites estrictos. Opciones:\n1) Esperar hasta mañana para que se reinicie la cuota\n2) Actualizar a un plan de pago en Google Cloud Console\n3) Usar una API key diferente con cuota disponible\n\nVer detalles: https://ai.google.dev/gemini-api/docs/rate-limits`
        statusCode = 429
      } else if (todosTimeouts) {
        errorMessage = 'El PDF es muy grande y el procesamiento excedió el tiempo límite'
        sugerencia = `El PDF es muy grande (${pdfSizeMB} MB). Intenta: 1) Dividir el PDF en partes más pequeñas, 2) Usar un PDF con menos páginas, 3) Optimizar el PDF reduciendo su tamaño.`
        statusCode = 504
      } else if (errorModelos.some(e => e.error.includes('403') || e.error.includes('Forbidden') || e.error.includes('leaked'))) {
        errorMessage = 'API key de Gemini reportada como filtrada (403)'
        sugerencia = `Tu API key fue reportada como "leaked" (filtrada) y Google la ha deshabilitado.\n\n🔑 SOLUCIÓN:\n1) Ve a: https://aistudio.google.com/apikey\n2) Elimina la API key actual (si es necesario)\n3) Genera una NUEVA API key\n4) Actualiza GEMINI_API_KEY en Railway o .env.local con la nueva key\n\n⚠️ IMPORTANTE:\n- No compartas tu API key públicamente\n- No la subas a repositorios públicos\n- Usa variables de entorno para almacenarla`
        statusCode = 403
      } else if (todos404) {
        errorMessage = 'Modelos de Gemini no disponibles (404)'
        sugerencia = `Todos los modelos probados dieron error 404. Esto puede indicar:\n\n1) La API key de Gemini no está configurada o es inválida\n   - Verifica que GEMINI_API_KEY esté en Railway o .env.local\n   - Verifica que la API key sea válida en: https://aistudio.google.com/apikey\n\n2) La API "Generative Language API" no está habilitada\n   - Ve a: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com\n   - Habilita la API si no está habilitada\n\n3) Los nombres de los modelos pueden haber cambiado\n   - Prueba el endpoint de diagnóstico: /api/crm/listas/diagnostico-gemini\n   - Verifica modelos disponibles en: https://ai.google.dev/gemini-api/docs/models`
        statusCode = 503
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: errorModelos.length > 0 
            ? `Errores de modelos: ${errorModelos.map(e => `${e.modelo}: ${e.error.substring(0, 100)}`).join(' | ')}`
            : 'Gemini procesó el PDF pero no encontró productos válidos. El PDF puede estar vacío o no contener una lista de útiles reconocible.',
          sugerencia: sugerencia,
          pdfSizeMB: parseFloat(pdfSizeMB),
          erroresModelos: errorModelos, // Incluir todos los errores para debugging
        },
        { status: statusCode }
      )
    }
    
    console.log('[Procesar PDF] 📦 Productos extraídos:', resultado.productos.length)
    
    // Convertir a formato de productos normalizados
    const productos = resultado.productos


    // ============================================
    // 7. NORMALIZAR PRODUCTOS
    // ============================================
    const productosNormalizados: ProductoIdentificado[] = productos.map((producto: any, index: number) => {
      // Normalizar coordenadas
      let coordenadas: CoordenadasProducto | undefined = undefined
      
      if (producto.coordenadas) {
        coordenadas = {
          pagina: parseInt(String(producto.coordenadas.pagina)) || 1,
          posicion_x: producto.coordenadas.posicion_x !== undefined 
            ? parseFloat(String(producto.coordenadas.posicion_x)) 
            : undefined,
          posicion_y: producto.coordenadas.posicion_y !== undefined 
            ? parseFloat(String(producto.coordenadas.posicion_y)) 
            : undefined,
          region: producto.coordenadas.region || undefined,
        }
      } else if (producto.pagina !== undefined) {
        // Fallback: si viene como campo directo "pagina"
        coordenadas = {
          pagina: parseInt(String(producto.pagina)) || 1,
        }
      }
      
      return {
        id: `producto-${index + 1}`,
        validado: false,
        nombre: producto.nombre || `Producto ${index + 1}`,
        isbn: producto.isbn || null,
        marca: producto.marca || null,
        cantidad: parseInt(String(producto.cantidad)) || 1,
        comprar: producto.comprar !== false,
        precio: parseFloat(String(producto.precio)) || 0,
        asignatura: producto.asignatura || null,
        descripcion: producto.descripcion || null,
        disponibilidad: 'disponible',
        encontrado_en_woocommerce: false,
        coordenadas: coordenadas,
      }
    })

    // ============================================
    // 8. VALIDAR PRODUCTOS CONTRA WOOCOMMERCE
    // ============================================
    console.log('[API /crm/listas/[id]/procesar-pdf] 🔍 Validando productos en WooCommerce Escolar...')
    
    const wooCommerceClient = createWooCommerceClient('woo_escolar')
    
    // Función para normalizar nombres (quitar acentos, espacios extra, etc.)
    const normalizarNombre = (nombre: string): string => {
      if (!nombre) return ''
      
      return nombre
        .toLowerCase()
        .normalize('NFD') // Normalizar a NFD (descomponer acentos)
        .replace(/[\u0300-\u036f]/g, '') // Quitar diacríticos (acentos)
        .replace(/[^\w\s]/g, '') // Quitar caracteres especiales excepto letras, números y espacios
        .replace(/\s+/g, ' ') // Normalizar espacios múltiples a uno solo
        .trim()
    }
    
    // Función para calcular similitud entre dos nombres (0-1)
    const calcularSimilitud = (nombre1: string, nombre2: string): number => {
      const n1 = normalizarNombre(nombre1)
      const n2 = normalizarNombre(nombre2)
      
      // Coincidencia exacta
      if (n1 === n2) return 1.0
      
      // Una contiene a la otra
      if (n1.includes(n2) || n2.includes(n1)) return 0.9
      
      // Calcular palabras en común
      const palabras1 = n1.split(' ').filter(p => p.length > 2) // Ignorar palabras muy cortas
      const palabras2 = n2.split(' ').filter(p => p.length > 2)
      
      if (palabras1.length === 0 || palabras2.length === 0) return 0
      
      const palabrasComunes = palabras1.filter(p => palabras2.includes(p))
      const similitud = palabrasComunes.length / Math.max(palabras1.length, palabras2.length)
      
      return similitud
    }
    
    // Función para extraer palabras clave importantes del nombre
    const extraerPalabrasClave = (nombre: string): string[] => {
      const normalizado = normalizarNombre(nombre)
      const palabras = normalizado.split(' ')
      
      // Filtrar palabras comunes que no son útiles para búsqueda
      const palabrasComunes = ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'a', 'en', 'un', 'una', 'con', 'por', 'para']
      
      return palabras
        .filter(p => p.length > 2 && !palabrasComunes.includes(p))
        .slice(0, 5) // Máximo 5 palabras clave
    }
    
    // Función helper para hacer llamadas a WooCommerce con retry y delays
    const wooCommerceGetWithRetry = async <T>(
      path: string, 
      params: Record<string, any>,
      retries = 3,
      baseDelay = 500
    ): Promise<T> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          // Delay antes de cada intento (excepto el primero)
          if (attempt > 0) {
            const delay = baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
            console.log(`[API /crm/listas/[id]/procesar-pdf] ⏳ Esperando ${delay}ms antes de reintentar (intento ${attempt + 1}/${retries})...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          
          // Delay base entre todas las llamadas para evitar saturar la API
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 100)) // OPTIMIZACIÓN: Reducido a 100ms entre búsquedas
          }
          
          return await wooCommerceClient.get<T>(path, params)
        } catch (error: any) {
          const is429 = error.status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests')
          
          if (is429 && attempt < retries - 1) {
            const retryAfter = error.message?.match(/retry.*?(\d+)/i)?.[1] || '5'
            const delay = parseInt(retryAfter) * 1000 || baseDelay * Math.pow(2, attempt)
            console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error 429 (intento ${attempt + 1}/${retries}), esperando ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          
          // Si no es 429 o es el último intento, lanzar el error
          throw error
        }
      }
      
      throw new Error('Max retries exceeded')
    }
    
    const buscarProductoEnWooCommerce = async (producto: ProductoIdentificado): Promise<WooCommerceProduct | null> => {
      try {
        console.log(`[API /crm/listas/[id]/procesar-pdf] 🔍 Buscando producto: "${producto.nombre}"${producto.isbn ? ` (ISBN: ${producto.isbn})` : ''}`)
        
        // 1. Buscar por SKU/ISBN primero (más preciso)
        if (producto.isbn) {
          try {
            // Limpiar ISBN (quitar guiones, espacios, etc.)
            const isbnLimpio = producto.isbn.replace(/[-\s]/g, '')
            
            const productosPorSKU = await wooCommerceGetWithRetry<WooCommerceProduct[]>('products', {
              sku: producto.isbn,
              per_page: 20, // Aumentar para tener más opciones
              status: 'publish',
            })
            
            if (Array.isArray(productosPorSKU) && productosPorSKU.length > 0) {
              // Buscar coincidencia exacta o parcial del SKU
              const encontrado = productosPorSKU.find(p => {
                const skuWoo = (p.sku || '').replace(/[-\s]/g, '').toLowerCase()
                const isbnBusqueda = isbnLimpio.toLowerCase()
                return skuWoo === isbnBusqueda || 
                       skuWoo.includes(isbnBusqueda) || 
                       isbnBusqueda.includes(skuWoo)
              })
              
              if (encontrado) {
                console.log(`[API /crm/listas/[id]/procesar-pdf] ✅ Encontrado por SKU/ISBN: ${producto.nombre} (SKU: ${encontrado.sku})`)
                return encontrado
              }
            }
          } catch (skuError: any) {
            const is429 = skuError.status === 429 || skuError.message?.includes('429')
            if (is429) {
              console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error 429 buscando por SKU ${producto.isbn}, continuando con búsqueda por nombre...`)
            } else {
              console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error buscando por SKU ${producto.isbn}:`, skuError.message)
            }
          }
        }

        // 2. Buscar por nombre completo
        const nombreBusqueda = producto.nombre.trim()
        let mejorMatch: { producto: WooCommerceProduct; similitud: number } | null = null
        
        try {
          console.log(`[API /crm/listas/[id]/procesar-pdf] 🔎 Buscando por nombre completo: "${nombreBusqueda}"`)
          
          // Primero intentar búsqueda exacta
          const productosPorNombre = await wooCommerceGetWithRetry<WooCommerceProduct[]>('products', {
            search: nombreBusqueda,
            per_page: 50, // Aumentar para tener más opciones
            status: 'publish',
          })

          console.log(`[API /crm/listas/[id]/procesar-pdf] 📦 Productos encontrados en WooCommerce para "${nombreBusqueda}": ${Array.isArray(productosPorNombre) ? productosPorNombre.length : 0}`)

          if (Array.isArray(productosPorNombre) && productosPorNombre.length > 0) {
            // Mostrar los primeros 5 productos encontrados para debugging
            console.log(`[API /crm/listas/[id]/procesar-pdf] 📋 Primeros productos encontrados:`, productosPorNombre.slice(0, 5).map((p: any) => ({
              id: p.id,
              nombre: p.name,
              sku: p.sku
            })))
            
            // Calcular similitud para cada producto
            productosPorNombre.forEach((p, index) => {
              const similitud = calcularSimilitud(nombreBusqueda, p.name)
              console.log(`[API /crm/listas/[id]/procesar-pdf] 🔢 Similitud [${index + 1}/${productosPorNombre.length}]: "${p.name}" = ${(similitud * 100).toFixed(1)}%`)
              
              if (similitud > 0.5) { // Solo considerar si similitud > 50%
                const currentMatch = mejorMatch as { producto: WooCommerceProduct; similitud: number } | null
                if (!currentMatch || similitud > currentMatch.similitud) {
                  mejorMatch = { producto: p, similitud }
                  console.log(`[API /crm/listas/[id]/procesar-pdf] ⭐ Nuevo mejor match: "${p.name}" (${(similitud * 100).toFixed(1)}%)`)
                }
              }
            })
            
            // Type guard con type assertion explícito para resolver problema de inferencia de TypeScript
            if (mejorMatch) {
              const match = mejorMatch as { producto: WooCommerceProduct; similitud: number }
              const similitud = match.similitud
              if (similitud >= 0.7) {
                console.log(`[API /crm/listas/[id]/procesar-pdf] ✅ Encontrado por nombre (similitud ${(similitud * 100).toFixed(0)}%): ${producto.nombre} -> ${match.producto.name}`)
                return match.producto
              } else {
                console.log(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Mejor match encontrado pero similitud insuficiente (${(similitud * 100).toFixed(0)}% < 70%): ${producto.nombre} -> ${match.producto.name}`)
              }
            }
          } else {
            console.log(`[API /crm/listas/[id]/procesar-pdf] ⚠️ No se encontraron productos en WooCommerce para: "${nombreBusqueda}"`)
          }
        } catch (nombreError: any) {
          const is429 = nombreError.status === 429 || nombreError.message?.includes('429')
          if (is429) {
            console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error 429 buscando por nombre ${producto.nombre}, continuando con búsqueda por palabras clave...`)
          } else {
            console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error buscando por nombre ${producto.nombre}:`, nombreError.message)
          }
        }

        // 3. Si no se encontró, intentar búsqueda por palabras clave
        const matchActual = mejorMatch as { producto: WooCommerceProduct; similitud: number } | null
        if (!matchActual || matchActual.similitud < 0.7) {
          const palabrasClave = extraerPalabrasClave(nombreBusqueda)
          console.log(`[API /crm/listas/[id]/procesar-pdf] 🔑 Palabras clave extraídas de "${nombreBusqueda}":`, palabrasClave)
          
          if (palabrasClave.length > 0) {
            // Buscar por la palabra clave más importante (la más larga)
            const palabraPrincipal = palabrasClave.sort((a, b) => b.length - a.length)[0]
            console.log(`[API /crm/listas/[id]/procesar-pdf] 🔍 Buscando por palabra clave principal: "${palabraPrincipal}"`)
            
            try {
              const productosPorPalabra = await wooCommerceGetWithRetry<WooCommerceProduct[]>('products', {
                search: palabraPrincipal,
                per_page: 50,
                status: 'publish',
              })

              console.log(`[API /crm/listas/[id]/procesar-pdf] 📦 Productos encontrados por palabra clave "${palabraPrincipal}": ${Array.isArray(productosPorPalabra) ? productosPorPalabra.length : 0}`)

              if (Array.isArray(productosPorPalabra) && productosPorPalabra.length > 0) {
                productosPorPalabra.forEach((p, index) => {
                  const similitud = calcularSimilitud(nombreBusqueda, p.name)
                  console.log(`[API /crm/listas/[id]/procesar-pdf] 🔢 Similitud por palabra clave [${index + 1}/${productosPorPalabra.length}]: "${p.name}" = ${(similitud * 100).toFixed(1)}%`)
                  
                  if (similitud > 0.5) {
                    const currentMatch = mejorMatch as { producto: WooCommerceProduct; similitud: number } | null
                    if (!currentMatch || similitud > currentMatch.similitud) {
                      mejorMatch = { producto: p, similitud }
                      console.log(`[API /crm/listas/[id]/procesar-pdf] ⭐ Nuevo mejor match por palabra clave: "${p.name}" (${(similitud * 100).toFixed(1)}%)`)
                    }
                  }
                })
                
                // Type guard con type assertion explícito para resolver problema de inferencia de TypeScript
                if (mejorMatch) {
                  const match = mejorMatch as { producto: WooCommerceProduct; similitud: number }
                  const similitud = match.similitud
                  if (similitud >= 0.6) {
                    console.log(`[API /crm/listas/[id]/procesar-pdf] ✅ Encontrado por palabra clave "${palabraPrincipal}" (similitud ${(similitud * 100).toFixed(0)}%): ${producto.nombre} -> ${match.producto.name}`)
                    return match.producto
                  } else {
                    console.log(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Mejor match por palabra clave pero similitud insuficiente (${(similitud * 100).toFixed(0)}% < 60%): ${producto.nombre} -> ${match.producto.name}`)
                  }
                }
              }
            } catch (palabraError: any) {
              const is429 = palabraError.status === 429 || palabraError.message?.includes('429')
              if (is429) {
                console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error 429 buscando por palabra clave, continuando...`)
              } else {
                console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error buscando por palabra clave:`, palabraError.message)
              }
            }
          }
        }

        // Si no se encontró nada
        const finalMatch = mejorMatch as { producto: WooCommerceProduct; similitud: number } | null
        if (!finalMatch) {
          console.log(`[API /crm/listas/[id]/procesar-pdf] ⚠️ NO encontrado: ${producto.nombre}${producto.isbn ? ` (ISBN: ${producto.isbn})` : ''}`)
        } else {
          console.log(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Mejor match encontrado pero similitud baja (${(finalMatch.similitud * 100).toFixed(0)}%): ${producto.nombre} -> ${finalMatch.producto.name}`)
        }

        return null
      } catch (error: any) {
        console.error(`[API /crm/listas/[id]/procesar-pdf] ❌ Error al buscar producto "${producto.nombre}":`, error.message)
        return null
      }
    }

    // Validar cada producto en lotes para evitar saturar la API de WooCommerce
    const BATCH_SIZE = 5 // Procesar 5 productos a la vez
    const productosValidados: any[] = []
    
    for (let i = 0; i < productosNormalizados.length; i += BATCH_SIZE) {
      const batch = productosNormalizados.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(productosNormalizados.length / BATCH_SIZE)
      console.log(`[API /crm/listas/[id]/procesar-pdf] 📦 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} productos)`)
      
      const batchResults = await Promise.all(
        batch.map(async (producto) => {
          const productoWooCommerce = await buscarProductoEnWooCommerce(producto)
          
          if (productoWooCommerce) {
            const precioWoo = parseFloat(productoWooCommerce.price || productoWooCommerce.regular_price || '0')
            const stockWoo = productoWooCommerce.stock_quantity || 0
            const manageStock = productoWooCommerce.manage_stock === true
            
            // Determinar disponibilidad: 
            // - Si no maneja stock (manage_stock = false), está disponible
            // - Si maneja stock, debe estar 'instock' o 'onbackorder', o tener stock_quantity > 0
            const disponibleWoo = !manageStock || 
                                  productoWooCommerce.stock_status === 'instock' || 
                                  productoWooCommerce.stock_status === 'onbackorder' ||
                                  (manageStock && stockWoo > 0)
            
            // Obtener imagen (verificar múltiples formatos posibles)
            let imagenUrl: string | undefined = undefined
            if (productoWooCommerce.images && Array.isArray(productoWooCommerce.images) && productoWooCommerce.images.length > 0) {
              const primeraImagen = productoWooCommerce.images[0]
              // Type assertion para permitir propiedades adicionales que pueden venir de la API
              const imagen = primeraImagen as { src?: string; url?: string; image?: string }
              imagenUrl = imagen.src || imagen.url || imagen.image || undefined
              
              // Log para debugging
              if (imagenUrl) {
                console.log(`[API /crm/listas/[id]/procesar-pdf] 🖼️ Imagen encontrada para ${producto.nombre}:`, imagenUrl)
              } else {
                console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Imagen sin URL válida para ${producto.nombre}:`, primeraImagen)
              }
            } else {
              console.log(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Producto ${producto.nombre} no tiene imágenes en WooCommerce`)
            }
            
            console.log(`[API /crm/listas/[id]/procesar-pdf] ✅ Producto validado: ${producto.nombre}`, {
              stock_status: productoWooCommerce.stock_status,
              stock_quantity: stockWoo,
              manage_stock: manageStock,
              disponible: disponibleWoo,
              tiene_imagen: !!imagenUrl,
            })
            
            return {
              ...producto,
              woocommerce_id: productoWooCommerce.id,
              woocommerce_sku: productoWooCommerce.sku || producto.isbn,
              precio: precioWoo > 0 ? precioWoo : producto.precio,
              precio_woocommerce: precioWoo,
              stock_quantity: stockWoo,
              disponibilidad: disponibleWoo ? 'disponible' : 'no_disponible',
              encontrado_en_woocommerce: true,
              imagen: imagenUrl,
            }
          } else {
            console.log(`[API /crm/listas/[id]/procesar-pdf] ⚠️ NO encontrado en WooCommerce: ${producto.nombre}`)
            return {
              ...producto,
              encontrado_en_woocommerce: false,
              disponibilidad: 'no_encontrado',
            }
          }
        })
      )
      
      productosValidados.push(...batchResults)
      
      // Delay entre lotes para evitar saturar la API (excepto en el último lote)
      if (i + BATCH_SIZE < productosNormalizados.length) {
        await new Promise(resolve => setTimeout(resolve, 150)) // OPTIMIZACIÓN: Reducido a 150ms entre lotes
      }
    }

    const productosEncontrados = productosValidados.filter(p => p.encontrado_en_woocommerce).length
    const productosNoEncontrados = productosValidados.filter(p => !p.encontrado_en_woocommerce).length
    
    console.log('[API /crm/listas/[id]/procesar-pdf] ✅ Validación completada:', {
      total: productosValidados.length,
      encontrados: productosEncontrados,
      noEncontrados: productosNoEncontrados,
    })

    // ============================================
    // 9. GUARDAR PRODUCTOS EN STRAPI
    // ============================================
    console.log('[Procesar PDF] 💾 Guardando productos en Strapi...')
    console.log('[Procesar PDF] Estado inicial:', {
      tieneUltimaVersion: !!ultimaVersion,
      versionesCount: versiones.length,
      productosValidadosCount: productosValidados.length,
    })
    
    let productosGuardados = false
    let errorGuardado: string | null = null
    
    if (!ultimaVersion) {
      errorGuardado = 'No hay versión de materiales disponible para guardar productos'
      console.warn('[Procesar PDF] ⚠️', errorGuardado)
      console.warn('[Procesar PDF] Versiones disponibles:', versiones.length)
    } else {
      console.log('[Procesar PDF] ✅ Ultima versión encontrada:', {
        id: ultimaVersion.id,
        fecha_subida: ultimaVersion.fecha_subida,
        fecha_actualizacion: ultimaVersion.fecha_actualizacion,
        tieneMateriales: !!ultimaVersion.materiales,
        materialesCount: Array.isArray(ultimaVersion.materiales) ? ultimaVersion.materiales.length : 0,
      })
      
      // Preparar productos para guardar (solo campos necesarios)
      const productosParaGuardar = productosValidados.map((p: any) => ({
        cantidad: p.cantidad || 1,
        nombre: p.nombre || '',
        isbn: p.isbn || null,
        marca: p.marca || null,
        comprar: p.comprar !== false,
        precio: p.precio || 0,
        asignatura: p.asignatura || null,
        descripcion: p.descripcion || null,
        woocommerce_id: p.woocommerce_id || null,
        woocommerce_sku: p.woocommerce_sku || null,
        precio_woocommerce: p.precio_woocommerce || null,
        stock_quantity: p.stock_quantity || null,
        disponibilidad: p.disponibilidad || 'disponible',
        encontrado_en_woocommerce: p.encontrado_en_woocommerce || false,
        imagen: p.imagen || null,
        coordenadas: p.coordenadas || null,
      }))
      
      console.log('[Procesar PDF] Productos preparados para guardar:', productosParaGuardar.length)
      console.log('[Procesar PDF] Primer producto de ejemplo:', JSON.stringify(productosParaGuardar[0], null, 2))
      
      const versionesActualizadas = versiones.map((v: any) => {
        const isUltimaVersion = v.id === ultimaVersion.id || 
                               (v.fecha_subida === ultimaVersion.fecha_subida && 
                                v.fecha_actualizacion === ultimaVersion.fecha_actualizacion) ||
                               v === ultimaVersion
        
        if (isUltimaVersion) {
          return {
            ...v,
            materiales: productosParaGuardar,
            fecha_actualizacion: new Date().toISOString(),
            procesado_con_ia: true,
            fecha_procesamiento: new Date().toISOString(),
            validado_woocommerce: true,
            fecha_validacion: new Date().toISOString(),
          }
        }
        return v
      })

      try {
        // Obtener el documentId del curso (Strapi usa documentId para actualizaciones)
        const cursoDocumentId = curso.documentId || curso.id
        const cursoIdNumerico = curso.id
        
        console.log('[Procesar PDF] 📤 Información del curso:', {
          documentId: curso.documentId,
          id: curso.id,
          idUsado: cursoDocumentId,
          estructura: {
            tieneDocumentId: !!curso.documentId,
            tieneId: !!curso.id,
            tieneAttributes: !!curso.attributes,
          }
        })
        
        if (!cursoDocumentId) {
          throw new Error('El curso no tiene documentId ni id válido para actualizar')
        }
        
        console.log('[Procesar PDF] 📤 Actualizando curso en Strapi:', {
          cursoId: cursoDocumentId,
          tipoId: curso.documentId ? 'documentId' : 'id',
          productosCount: productosParaGuardar.length,
          versionesCount: versionesActualizadas.length,
        })
        
        // Preparar datos para Strapi (solo incluir versiones_materiales)
        const updateData = {
          data: {
            versiones_materiales: versionesActualizadas,
          },
        }
        
        console.log('[Procesar PDF] 📦 Datos a enviar a Strapi:', {
          versiones_materiales_count: versionesActualizadas.length,
          ultima_version_materiales_count: versionesActualizadas.find((v: any) => {
            const isUltimaVersion = v.id === ultimaVersion.id || 
                                   (v.fecha_subida === ultimaVersion.fecha_subida && 
                                    v.fecha_actualizacion === ultimaVersion.fecha_actualizacion) ||
                                   v === ultimaVersion
            return isUltimaVersion
          })?.materiales?.length || 0,
          estructura_versiones: JSON.stringify(versionesActualizadas[0], null, 2).substring(0, 500),
        })
        
        console.log('[Procesar PDF] 🔄 Enviando actualización a Strapi...')
        console.log('[Procesar PDF] 🔗 Endpoint:', `/api/cursos/${cursoDocumentId}`)
        
        const response = await strapiClient.put<any>(`/api/cursos/${cursoDocumentId}`, updateData)
        
        console.log('[Procesar PDF] ✅ Respuesta de Strapi recibida:', {
          hasData: !!(response as any)?.data,
          hasError: !!(response as any)?.error,
          responseKeys: response ? Object.keys(response as any) : [],
        })
        
        // Verificar respuesta
        if ((response as any)?.error) {
          throw new Error(`Strapi devolvió un error: ${JSON.stringify((response as any).error)}`)
        }
        
        productosGuardados = true
        console.log('[Procesar PDF] ✅ Productos guardados exitosamente en Strapi:', productosParaGuardar.length)
      } catch (strapiError: any) {
        console.error('[Procesar PDF] ❌ Error al guardar en Strapi:')
        console.error('[Procesar PDF] Tipo de error:', typeof strapiError)
        console.error('[Procesar PDF] Error message:', strapiError.message)
        console.error('[Procesar PDF] Error status:', strapiError.status)
        console.error('[Procesar PDF] Error details:', strapiError.details)
        console.error('[Procesar PDF] Error completo:', JSON.stringify(strapiError, Object.getOwnPropertyNames(strapiError), 2))
        
        // El cliente de Strapi ya maneja los errores y los lanza con status y details
        const errorDetails: any = {
          message: strapiError.message || 'Error desconocido',
          status: strapiError.status,
          details: strapiError.details,
          response: strapiError.response,
          stack: process.env.NODE_ENV === 'development' ? strapiError.stack : undefined,
        }
        
        console.error('[Procesar PDF] 📋 Detalles completos del error:', JSON.stringify(errorDetails, null, 2))
        
        // Si hay detalles de validación de Strapi, mostrarlos
        if (errorDetails.details) {
          console.error('[Procesar PDF] ⚠️ Errores de validación de Strapi:', errorDetails.details)
        }
        
        // Si hay respuesta de Strapi, mostrarla
        if (errorDetails.response) {
          console.error('[Procesar PDF] 📄 Respuesta de Strapi:', JSON.stringify(errorDetails.response, null, 2))
        }
        
        errorGuardado = errorDetails.message || 'Error desconocido al guardar en Strapi'
        
        // Continuar aunque falle el guardado, pero informar en la respuesta
      }
    }

    // ============================================
    // 10. RETORNAR RESPUESTA
    // ============================================
    // Siempre retornar success: true si se extrajeron productos
    // El campo guardadoEnStrapi indica si se guardaron o no
    const mensaje = productosGuardados
      ? `Se extrajeron ${productosValidados.length} productos del PDF. ${productosEncontrados} encontrados en WooCommerce, ${productosNoEncontrados} no encontrados. Productos guardados en Strapi.`
      : `Se extrajeron ${productosValidados.length} productos del PDF. ${productosEncontrados} encontrados en WooCommerce, ${productosNoEncontrados} no encontrados. ${errorGuardado ? `Error al guardar: ${errorGuardado}` : 'No se pudieron guardar en Strapi.'}`
    
    return NextResponse.json({
      success: true, // Siempre true si se extrajeron productos
      message: mensaje,
      data: {
        productos: productosValidados,
        total: productosValidados.length,
        encontrados: productosEncontrados,
        noEncontrados: productosNoEncontrados,
        modeloUsado: modeloUsado,
        guardadoEnStrapi: productosGuardados,
        errorGuardado: errorGuardado,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[API /crm/listas/[id]/procesar-pdf] ❌ Error general:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar el PDF',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        sugerencia: 'Verifica que el PDF contenga texto y que la API key de Gemini sea válida',
      },
      { status: 500 }
    )
  }
}
