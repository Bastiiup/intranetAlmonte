/**
 * API Route para procesar PDF de lista de útiles con Claude AI (Anthropic)
 * POST /api/crm/listas/[id]/procesar-pdf
 * 
 * Extrae texto del PDF y lo envía a Claude para obtener productos estructurados
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createWooCommerceClient } from '@/lib/woocommerce/client'
import type { WooCommerceProduct } from '@/lib/woocommerce/types'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

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
  woocommerce_id?: number
  woocommerce_sku?: string
  stock_quantity?: number
  encontrado_en_woocommerce?: boolean
  coordenadas?: CoordenadasProducto
}

/**
 * POST /api/crm/listas/[id]/procesar-pdf
 * Procesa el PDF del curso usando Claude AI para extraer productos
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validar API key de Claude
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
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
      return NextResponse.json(
        {
          success: false,
          error: 'ID de lista es requerido',
        },
        { status: 400 }
      )
    }

    console.log('[Procesar PDF] 🚀 Iniciando procesamiento con Claude AI...')

    // ============================================
    // 1. OBTENER CURSO DESDE STRAPI
    // ============================================
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
        console.log('[Procesar PDF] ✅ Curso encontrado')
      }
    } catch (docIdError: any) {
      console.warn('[Procesar PDF] ⚠️ Error buscando por documentId:', docIdError.message)
    }

    if (!curso && /^\d+$/.test(String(id))) {
      try {
        const cursoResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/cursos/${id}?publicationState=preview&populate[colegio]=true`
        )
        
        if (cursoResponse.data) {
          curso = Array.isArray(cursoResponse.data) ? cursoResponse.data[0] : cursoResponse.data
        }
      } catch (idError: any) {
        console.warn('[Procesar PDF] ⚠️ Error buscando por id:', idError.message)
      }
    }

    if (!curso) {
      return NextResponse.json(
        {
          success: false,
          error: 'Curso no encontrado',
        },
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
      return NextResponse.json(
        {
          success: false,
          error: 'El curso no tiene PDF asociado',
        },
        { status: 400 }
      )
    }

    // ============================================
    // 2. DESCARGAR PDF
    // ============================================
    console.log('[Procesar PDF] 📥 Descargando PDF...')
    
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

    console.log('[Procesar PDF] ✅ PDF descargado:', pdfBuffer.length, 'bytes')

    // ============================================
    // 3. EXTRAER TEXTO DEL PDF
    // ============================================
    console.log('[Procesar PDF] 📄 Extrayendo texto del PDF...')
    
    const pdfData = await pdf(pdfBuffer)
    const textoExtraido = pdfData.text
    
    if (!textoExtraido || textoExtraido.trim().length === 0) {
      throw new Error('No se pudo extraer texto del PDF. Puede ser un PDF escaneado o corrupto.')
    }
    
    console.log('[Procesar PDF] ✅ Texto extraído:', textoExtraido.length, 'caracteres')
    console.log('[Procesar PDF] Páginas:', pdfData.numpages)
    
    // ============================================
    // 4. PROCESAR CON CLAUDE
    // ============================================
    console.log('[Procesar PDF] 🤖 Procesando con Claude AI (Sonnet 4)...')
    
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    })

    const prompt = `Eres un asistente experto en analizar listas de útiles escolares de Chile.

A continuación te proporciono el texto extraído de un PDF de lista de útiles escolares.

Tu tarea es:
1. Identificar TODOS los productos/materiales escolares mencionados
2. Extraer la información de cada producto de forma estructurada
3. Ser preciso con cantidades, marcas y especificaciones
4. Si un producto tiene marca/editorial específica, incluirla
5. Normalizar nombres (ej: "cuaderno universitario" vs "cuaderno")

IMPORTANTE:
- Extrae SOLO productos escolares (útiles, libros, materiales)
- NO incluyas instrucciones, títulos de sección, o texto informativo
- Si aparece "Editorial" o "Marca", inclúyela en el campo marca
- La cantidad debe ser un número
- Si no hay cantidad explícita, usa 1

Formato de respuesta (JSON):
{
  "productos": [
    {
      "nombre": "Nombre del producto",
      "cantidad": 1,
      "marca": "Marca o editorial (opcional)",
      "isbn": "ISBN si es libro (opcional)",
      "asignatura": "Asignatura si está especificada (opcional)",
      "especificaciones": "Detalles adicionales (tamaño, color, etc.)"
    }
  ]
}

TEXTO DEL PDF:
${textoExtraido}

Responde SOLO con el JSON, sin explicaciones adicionales.`

    let productosExtraidos: any[] = []
    
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      console.log('[Procesar PDF] 📝 Respuesta de Claude:', responseText.substring(0, 500))

      // Parsear respuesta JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0])
        productosExtraidos = jsonData.productos || []
            } else {
        throw new Error('Claude no devolvió un JSON válido')
      }

      console.log('[Procesar PDF] ✅ Productos extraídos:', productosExtraidos.length)

    } catch (claudeError: any) {
      console.error('[Procesar PDF] ❌ Error de Claude:', claudeError)
      throw new Error(`Error al procesar con Claude: ${claudeError.message}`)
    }

    if (productosExtraidos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontraron productos en el PDF',
          data: {
            productos: [],
            guardadoEnStrapi: false,
          }
        },
        { status: 200 }
      )
    }

    // ============================================
    // 5. BUSCAR EN WOOCOMMERCE
    // ============================================
    console.log('[Procesar PDF] 🔍 Buscando productos en WooCommerce...')
    
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
        }
      } catch (wooError: any) {
        console.warn(`[Procesar PDF] ⚠️ Error buscando "${nombreBuscar}":`, wooError.message)
      }

      productosConInfo.push({
        id: `producto-${i + 1}`,
        validado: false,
        nombre: nombreBuscar,
        marca: prod.marca || prod.editorial || undefined,
        cantidad: parseInt(String(prod.cantidad)) || 1,
        isbn: prod.isbn || undefined,
        asignatura: prod.asignatura || undefined,
        comprar: true,
        disponibilidad: encontrado ? 'disponible' : 'no_encontrado',
        precio: wooProduct ? parseFloat(wooProduct.price) : 0,
        precio_woocommerce: wooProduct ? parseFloat(wooProduct.price) : undefined,
        woocommerce_id: wooProduct?.id || undefined,
        woocommerce_sku: wooProduct?.sku || undefined,
        stock_quantity: wooProduct?.stock_quantity || undefined,
        encontrado_en_woocommerce: encontrado,
        imagen: wooProduct?.images?.[0]?.src || undefined,
      })
    }

    console.log('[Procesar PDF] ✅ Productos procesados:', productosConInfo.length)
    console.log('[Procesar PDF] 📊 Encontrados en WooCommerce:', productosConInfo.filter(p => p.encontrado_en_woocommerce).length)

    // ============================================
    // 6. GUARDAR EN STRAPI
    // ============================================
    console.log('[Procesar PDF] 💾 Guardando en Strapi...')
    
    let guardadoExitoso = false
    let errorGuardado = null

    try {
      const versionActualizada = {
        ...ultimaVersion,
        materiales: productosConInfo,
            fecha_actualizacion: new Date().toISOString(),
            procesado_con_ia: true,
        modelo_ia: 'claude-sonnet-4',
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
      console.log('[Procesar PDF] ✅ Guardado exitoso en Strapi')
    } catch (saveError: any) {
      errorGuardado = saveError.message
      console.error('[Procesar PDF] ❌ Error al guardar:', saveError)
    }
    
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
        modelo_usado: 'claude-sonnet-4',
        paginas_procesadas: pdfData.numpages,
      },
    })

  } catch (error: any) {
    console.error('[Procesar PDF] ❌ Error general:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar PDF',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
