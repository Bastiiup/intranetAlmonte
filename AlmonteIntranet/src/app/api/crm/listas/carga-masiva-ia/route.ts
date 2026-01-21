/**
 * API Route para carga masiva de listas usando IA
 * POST /api/crm/listas/carga-masiva-ia
 * 
 * Procesa múltiples PDFs y crea las listas correspondientes
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 600 // 10 minutos para procesar múltiples PDFs

// Modelos disponibles (en orden de preferencia)
// Solo modelos que realmente existen y están disponibles
const MODELOS_DISPONIBLES = [
  'gemini-2.5-flash',      // Más rápido y eficiente (límite: 20 req/día en plan gratuito)
  'gemini-2.5-flash-lite', // Versión lite (puede tener más cuota)
  // NOTA: gemini-1.5-flash y gemini-1.5-pro ya no existen (404)
  // NOTA: gemini-2.5-pro y gemini-pro-latest requieren plan de pago (límite: 0 en gratuito)
]

interface ArchivoPDF {
  nombre: string
  contenido: string // base64
  colegioId?: number | string
  nivel?: 'Basica' | 'Media'
  grado?: number
  año?: number
}

export async function POST(request: NextRequest) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'GEMINI_API_KEY no está configurada',
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { archivos, colegioId } = body

    if (!archivos || !Array.isArray(archivos) || archivos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere al menos un archivo PDF',
        },
        { status: 400 }
      )
    }

    if (!colegioId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de colegio es requerido',
        },
        { status: 400 }
      )
    }

    console.log('[Carga Masiva IA] 🚀 Iniciando procesamiento de', archivos.length, 'archivos')

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const resultados: Array<{
      archivo: string
      success: boolean
      error?: string
      cursoId?: string | number
      productosExtraidos?: number
    }> = []

    // Procesar cada archivo
    for (const archivo of archivos) {
      const nombreArchivo = archivo.nombre || 'sin-nombre.pdf'
      console.log(`[Carga Masiva IA] 📄 Procesando: ${nombreArchivo}`)

      try {
        // Decodificar base64
        const pdfBuffer = Buffer.from(archivo.contenido, 'base64')
        const pdfBase64 = archivo.contenido // Ya está en base64

        // Prompt para Gemini (similar al procesamiento individual)
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
❌ Páginas de portada o índice

REGLAS:
1. Si ves un número al inicio, es la cantidad
2. Si no hay número, la cantidad es 1
3. Incluye marca/características en "descripcion"
4. Normaliza nombres similares (ej: "cuaderno" = "Cuaderno")
5. Si hay ISBN o código, extráelo en "isbn"
6. Si hay precio mencionado, extráelo como número (sin símbolos) en "precio"
7. Si hay asignatura o materia mencionada, extráela en "asignatura"
8. Para cada producto, identifica en qué página del PDF aparece y su posición aproximada

COORDENADAS (OBLIGATORIO):
- "pagina": Número de página donde aparece el producto (empezando desde 1)
- "posicion_x": Posición horizontal aproximada como porcentaje (0-100)
- "posicion_y": Posición vertical aproximada como porcentaje (0-100)
- "region": Descripción opcional de la región (ej: "superior-izquierda", "medio-derecha")

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
      "descripcion": "100 hojas cuadriculado",
      "coordenadas": {
        "pagina": 2,
        "posicion_x": 15,
        "posicion_y": 30,
        "region": "superior-izquierda"
      }
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

        // Procesar con Gemini
        let resultado: any = null
        let modeloUsado: string | null = null

        for (const nombreModelo of MODELOS_DISPONIBLES) {
          try {
            const model = genAI.getGenerativeModel({ 
              model: nombreModelo,
              generationConfig: {
                temperature: 0.1,
                topP: 0.8,
                topK: 40,
              }
            })

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
            let textoParaParsear = textoRespuesta.trim()

            if (!textoParaParsear.startsWith('{')) {
              const jsonMatch = textoParaParsear.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                textoParaParsear = jsonMatch[0]
              } else {
                throw new Error('Gemini no devolvió JSON válido')
              }
            }

            const jsonLimpio = textoParaParsear
              .replace(/```json\s*/g, '')
              .replace(/```\s*/g, '')
              .trim()

            resultado = JSON.parse(jsonLimpio)

            if (!resultado.productos || !Array.isArray(resultado.productos) || resultado.productos.length === 0) {
              throw new Error('No se encontraron productos en el PDF')
            }

            modeloUsado = nombreModelo
            break
          } catch (error: any) {
            console.warn(`[Carga Masiva IA] ⚠️ Modelo ${nombreModelo} falló:`, error.message)
            continue
          }
        }

        if (!resultado || !resultado.productos) {
          throw new Error('No se pudieron extraer productos del PDF')
        }

        console.log(`[Carga Masiva IA] ✅ ${nombreArchivo}: ${resultado.productos.length} productos extraídos`)

        // Crear curso en Strapi
        const nivel = archivo.nivel || 'Basica'
        const grado = archivo.grado || 1
        const año = archivo.año || new Date().getFullYear()

        // Normalizar productos
        const productosNormalizados = resultado.productos.map((producto: any, index: number) => ({
          cantidad: parseInt(String(producto.cantidad)) || 1,
          nombre: producto.nombre || `Producto ${index + 1}`,
          isbn: producto.isbn || null,
          marca: producto.marca || null,
          comprar: producto.comprar !== false,
          precio: parseFloat(String(producto.precio)) || 0,
          asignatura: producto.asignatura || null,
          descripcion: producto.descripcion || null,
          coordenadas: producto.coordenadas || null,
          aprobado: false,
        }))

        // Crear versión de materiales
        const versionMaterial = {
          id: `version-${Date.now()}-${Math.random()}`,
          fecha_subida: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          nombre_archivo: nombreArchivo,
          pdf_id: null, // Se puede subir el PDF después si es necesario
          materiales: productosNormalizados,
          procesado_con_ia: true,
          fecha_procesamiento: new Date().toISOString(),
        }

        // Crear curso
        const cursoData: any = {
          data: {
            nombre_curso: `${grado}° ${nivel}`,
            colegio: { connect: [colegioId] },
            nivel: nivel,
            grado: String(grado),
            año: año,
            activo: true,
            versiones_materiales: [versionMaterial],
          },
        }

        const cursoResponse = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
          '/api/cursos',
          cursoData
        )

        const cursoCreado = cursoResponse.data
        const cursoId = cursoCreado?.id || cursoCreado?.documentId

        resultados.push({
          archivo: nombreArchivo,
          success: true,
          cursoId: cursoId,
          productosExtraidos: productosNormalizados.length,
        })

        console.log(`[Carga Masiva IA] ✅ Curso creado: ${cursoId}`)

      } catch (error: any) {
        console.error(`[Carga Masiva IA] ❌ Error procesando ${nombreArchivo}:`, error)
        resultados.push({
          archivo: nombreArchivo,
          success: false,
          error: error.message || 'Error desconocido',
        })
      }
    }

    const exitosos = resultados.filter(r => r.success).length
    const fallidos = resultados.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Procesados ${exitosos} de ${archivos.length} archivos`,
      data: {
        total: archivos.length,
        exitosos,
        fallidos,
        resultados,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Carga Masiva IA] ❌ Error general:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar carga masiva',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
