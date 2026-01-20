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

// Obtener API key de Gemini (debe estar configurada como variable de entorno)
// La validación se hace dentro de la función POST para devolver respuesta HTTP adecuada

// Modelos disponibles (en orden de preferencia)
const MODELOS_DISPONIBLES = [
  'gemini-2.5-flash',      // Más rápido y eficiente
  'gemini-flash-latest',   // Siempre el último Flash
  'gemini-2.5-pro',        // Más potente
  'gemini-pro-latest',     // Siempre el último Pro
  'gemini-1.5-flash',      // Fallback
  'gemini-1.5-pro'         // Fallback
]

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

    // ============================================
    // 4. PROCESAR PDF DIRECTAMENTE CON GEMINI
    // ============================================
    console.log('[Procesar PDF] 🤖 Procesando con Gemini AI...')
    
    // GEMINI_API_KEY ya está validada arriba
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!)
    
    const prompt = `Eres un experto en analizar listas de útiles escolares de Chile.

Tu tarea es extraer TODOS los productos/útiles mencionados en este PDF.

FORMATO DE LISTAS ESCOLARES TÍPICAS:
- Pueden tener formato de tabla
- Pueden tener viñetas o números
- Pueden incluir cantidad seguida del producto
- Pueden agrupar por categorías (ej: "Matemáticas", "Lenguaje", "Arte")

EJEMPLOS DE ITEMS QUE DEBES EXTRAER:
✅ "2 Cuadernos universitarios 100 hojas cuadriculado"
✅ "1 Caja de lápices de colores 12 unidades"
✅ "Lápiz grafito N°2" (sin cantidad = asume 1)
✅ "3 Gomas de borrar blancas"
✅ "1 Regla de 30 cm"
✅ "Tijeras punta roma"

ITEMS QUE DEBES IGNORAR:
❌ Títulos de secciones (ej: "ÚTILES ESCOLARES 2024")
❌ Nombres de asignaturas (ej: "Matemáticas", "Lenguaje")
❌ Instrucciones generales (ej: "Marcar con nombre")
❌ Información del colegio
❌ Fechas y encabezados

REGLAS:
1. Si ves un número al inicio, es la cantidad
2. Si no hay número, la cantidad es 1
3. Incluye marca/características en "descripcion"
4. Normaliza nombres similares (ej: "cuaderno" = "Cuaderno")
5. Si hay ISBN o código, extráelo en "isbn"
6. Si hay precio mencionado, extráelo como número (sin símbolos) en "precio"
7. Si hay asignatura o materia mencionada, extráela en "asignatura"

FORMATO DE RESPUESTA (JSON puro, SIN markdown, SIN backticks):
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
      "descripcion": "100 hojas cuadriculado"
    },
    {
      "cantidad": 1,
      "nombre": "Lápiz grafito",
      "isbn": null,
      "marca": null,
      "comprar": true,
      "precio": 0,
      "asignatura": null,
      "descripcion": "N°2 HB"
    }
  ]
}

⚠️ MUY IMPORTANTE:
- Responde SOLO con el JSON
- NO uses backticks (\`\`\`)
- NO agregues texto antes o después del JSON
- NO uses markdown
- El JSON debe empezar con { y terminar con }

Ahora analiza este PDF y extrae TODOS los productos:`

    let resultado: any = null
    let modeloUsado: string | null = null
    let errorModelos: Array<{ modelo: string; error: string }> = []
    
    // Probar modelos en orden hasta que uno funcione
    for (const nombreModelo of MODELOS_DISPONIBLES) {
      try {
        console.log(`[Procesar PDF] Probando modelo: ${nombreModelo}`)
        
        const model = genAI.getGenerativeModel({ model: nombreModelo })
        
        // Enviar PDF directamente a Gemini
        console.log(`[Procesar PDF] Enviando PDF a Gemini (${nombreModelo})...`)
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: pdfBase64,
              mimeType: 'application/pdf'
            }
          }
        ])
        
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
        
      } catch (error: any) {
        const errorMsg = error.message || String(error)
        console.log(`[Procesar PDF] ❌ Modelo ${nombreModelo} falló:`, errorMsg)
        console.log('[Procesar PDF] Stack del error:', error.stack)
        errorModelos.push({ modelo: nombreModelo, error: errorMsg })
        continue // Intentar siguiente
      }
    }
    
    // Si ningún modelo funcionó
    if (!resultado?.productos || resultado.productos.length === 0) {
      console.error('[Procesar PDF] ❌ Ningún modelo funcionó o no se encontraron productos')
      console.error('[Procesar PDF] Errores de todos los modelos:', JSON.stringify(errorModelos, null, 2))
      
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudieron extraer productos del PDF',
          details: errorModelos.length > 0 
            ? `Errores: ${errorModelos.map(e => `${e.modelo}: ${e.error}`).join(', ')}`
            : 'Gemini procesó el PDF pero no encontró productos válidos. El PDF puede estar vacío o no contener una lista de útiles reconocible.',
          sugerencia: 'Verifica que el PDF contenga una lista de útiles escolares válida y que tu API key de Gemini tenga acceso a los modelos. Puede que necesites habilitar la API en Google Cloud Console: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com',
        },
        { status: 500 }
      )
    }
    
    console.log('[Procesar PDF] 📦 Productos extraídos:', resultado.productos.length)
    
    // Convertir a formato de productos normalizados
    const productos = resultado.productos


    // ============================================
    // 7. NORMALIZAR PRODUCTOS
    // ============================================
    const productosNormalizados: ProductoIdentificado[] = productos.map((producto: any, index: number) => ({
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
    }))

    // ============================================
    // 8. VALIDAR PRODUCTOS CONTRA WOOCOMMERCE
    // ============================================
    console.log('[API /crm/listas/[id]/procesar-pdf] 🔍 Validando productos en WooCommerce Escolar...')
    
    const wooCommerceClient = createWooCommerceClient('woo_escolar')
    
    const buscarProductoEnWooCommerce = async (producto: ProductoIdentificado): Promise<WooCommerceProduct | null> => {
      try {
        // 1. Buscar por SKU/ISBN primero
        if (producto.isbn) {
          try {
            const productosPorSKU = await wooCommerceClient.get<WooCommerceProduct[]>('products', {
              sku: producto.isbn,
              per_page: 1,
              status: 'publish',
            })
            
            if (Array.isArray(productosPorSKU) && productosPorSKU.length > 0) {
              const encontrado = productosPorSKU.find(p => p.sku?.toLowerCase() === producto.isbn?.toLowerCase())
              if (encontrado) {
                console.log(`[API /crm/listas/[id]/procesar-pdf] ✅ Encontrado por SKU: ${producto.nombre} (SKU: ${producto.isbn})`)
                return encontrado
              }
            }
          } catch (skuError: any) {
            console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error buscando por SKU ${producto.isbn}:`, skuError.message)
          }
        }

        // 2. Buscar por nombre
        const nombreBusqueda = producto.nombre.trim()
        try {
          const productosPorNombre = await wooCommerceClient.get<WooCommerceProduct[]>('products', {
            search: nombreBusqueda,
            per_page: 10,
            status: 'publish',
          })

          if (Array.isArray(productosPorNombre) && productosPorNombre.length > 0) {
            const nombreLower = nombreBusqueda.toLowerCase()
            const encontrado = productosPorNombre.find(p => {
              const nombreWooLower = p.name.toLowerCase()
              return nombreWooLower === nombreLower || 
                     nombreWooLower.includes(nombreLower) || 
                     nombreLower.includes(nombreWooLower)
            })
            
            if (encontrado) {
              console.log(`[API /crm/listas/[id]/procesar-pdf] ✅ Encontrado por nombre: ${producto.nombre}`)
              return encontrado
            }
          }
        } catch (nombreError: any) {
          console.warn(`[API /crm/listas/[id]/procesar-pdf] ⚠️ Error buscando por nombre ${producto.nombre}:`, nombreError.message)
        }

        return null
      } catch (error: any) {
        console.error(`[API /crm/listas/[id]/procesar-pdf] ❌ Error al buscar producto "${producto.nombre}":`, error.message)
        return null
      }
    }

    // Validar cada producto
    const productosValidados = await Promise.all(
      productosNormalizados.map(async (producto) => {
        const productoWooCommerce = await buscarProductoEnWooCommerce(producto)
        
        if (productoWooCommerce) {
          const precioWoo = parseFloat(productoWooCommerce.price || productoWooCommerce.regular_price || '0')
          const stockWoo = productoWooCommerce.stock_quantity || 0
          const disponibleWoo = productoWooCommerce.stock_status === 'instock'
          
          return {
            ...producto,
            woocommerce_id: productoWooCommerce.id,
            woocommerce_sku: productoWooCommerce.sku || producto.isbn,
            precio: precioWoo > 0 ? precioWoo : producto.precio,
            precio_woocommerce: precioWoo,
            stock_quantity: stockWoo,
            disponibilidad: disponibleWoo ? 'disponible' : 'no_disponible',
            encontrado_en_woocommerce: true,
            imagen: productoWooCommerce.images && productoWooCommerce.images.length > 0 
              ? productoWooCommerce.images[0].src 
              : undefined,
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
