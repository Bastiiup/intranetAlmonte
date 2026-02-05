/**
 * API Route para carga masiva de listas usando IA
 * POST /api/crm/listas/carga-masiva-ia
 * 
 * Procesa múltiples PDFs y crea las listas correspondientes
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 600 // 10 minutos para procesar múltiples PDFs

// Modelos de Claude disponibles (en orden de preferencia)
const MODELOS_DISPONIBLES = [
  'claude-sonnet-4-20250514',      // Modelo más reciente y potente
  'claude-3-5-sonnet-20241022',   // Sonnet 3.5 (fallback)
  'claude-3-5-haiku-20241022',    // Haiku (más rápido y económico)
  'claude-3-opus-20240229',       // Opus (más preciso pero más lento)
]

interface ArchivoPDF {
  nombre: string
  contenido: string // base64
  colegioId?: number | string
  nivel?: 'Basica' | 'Media'
  grado?: number
  año?: number
  url_original?: string // URL de la página de origen del PDF
}

export async function POST(request: NextRequest) {
  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'ANTHROPIC_API_KEY no está configurada',
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

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    })

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
        // PDF ya está en base64
        const pdfBase64 = archivo.contenido

        // Prompt para Claude (similar al procesamiento individual)
        const prompt = `Extrae TODOS los productos de útiles escolares del PDF. Copia el texto EXACTAMENTE como aparece e indica la ubicación EXACTA de cada producto.

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
- posicion_x_porcentaje: distancia EXACTA desde el borde izquierdo (0-100)
- orden_en_pagina: posición relativa en esa página (1=primero, 2=segundo, etc)

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

⚠️ MUY IMPORTANTE:
- Responde SOLO con el JSON
- NO uses backticks (\`\`\`)
- NO agregues texto antes o después del JSON
- NO uses markdown
- El JSON debe empezar con { y terminar con }`

        // Procesar con Claude
        let resultado: any = null
        let modeloUsado: string | null = null

        for (const nombreModelo of MODELOS_DISPONIBLES) {
          try {
            // Construir contenido con PDF para Claude
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

            const response = await anthropic.messages.create({
              model: nombreModelo,
              max_tokens: 16000,
              messages: [{
                role: 'user',
                content: content
              }]
            })

            // Extraer texto de la respuesta
            const contenido = response.content[0]
            if (contenido.type !== 'text') {
              throw new Error('Claude no devolvió texto')
            }

            let textoParaParsear = contenido.text.trim()

            // Extraer JSON si está envuelto en markdown
            if (!textoParaParsear.startsWith('{')) {
              const jsonMatch = textoParaParsear.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                textoParaParsear = jsonMatch[0]
              } else {
                throw new Error('Claude no devolvió JSON válido')
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
            console.log(`[Carga Masiva IA] ✅ ${nombreArchivo}: ${resultado.productos.length} productos extraídos con ${nombreModelo}`)
            break
          } catch (error: any) {
            console.warn(`[Carga Masiva IA] ⚠️ Modelo ${nombreModelo} falló:`, error.message)
            continue
          }
        }

        if (!resultado || !resultado.productos) {
          throw new Error('No se pudieron extraer productos del PDF con Claude')
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

        // Subir PDF a Strapi Media Library
        let pdfId: number | string | null = null
        let pdfUrl: string | null = null
        
        try {
          console.log(`[Carga Masiva IA] 📤 Subiendo PDF a Strapi Media Library: ${nombreArchivo}`)
          
          // Convertir base64 a Buffer
          const pdfBuffer = Buffer.from(pdfBase64, 'base64')
          const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
          
          // Crear FormData para subir el archivo
          const uploadFormData = new FormData()
          uploadFormData.append('files', pdfBlob, nombreArchivo)
          
          // Subir a Strapi Media Library usando fetch directamente
          const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL || 'https://strapi.moraleja.cl'
          const uploadUrl = `${strapiUrl}/api/upload`
          const uploadHeaders: HeadersInit = {
            'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN || ''}`,
          }
          
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: uploadHeaders,
            body: uploadFormData,
          })
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json()
            if (uploadResult && Array.isArray(uploadResult) && uploadResult.length > 0) {
              const uploadedFile = uploadResult[0]
              pdfId = uploadedFile.id || uploadedFile.documentId
              // Construir URL completa del PDF
              pdfUrl = uploadedFile.url ? `${strapiUrl}${uploadedFile.url}` : null
              console.log(`[Carga Masiva IA] ✅ PDF subido exitosamente: ID=${pdfId}, URL=${pdfUrl}`)
            } else {
              console.warn(`[Carga Masiva IA] ⚠️ Respuesta de upload inesperada:`, uploadResult)
            }
          } else {
            const errorText = await uploadResponse.text()
            console.error(`[Carga Masiva IA] ⚠️ Error al subir PDF a Strapi:`, {
              status: uploadResponse.status,
              error: errorText,
            })
          }
        } catch (uploadError: any) {
          console.error(`[Carga Masiva IA] ❌ Error al subir PDF a Strapi:`, uploadError)
          // Continuar sin PDF, pero registrar el error
        }

        // Crear versión de materiales
        const versionMaterial = {
          id: `version-${Date.now()}-${Math.random()}`,
          fecha_subida: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          nombre_archivo: nombreArchivo,
          pdf_id: pdfId, // ID del PDF en Strapi Media Library
          pdf_url: pdfUrl, // URL del PDF
          materiales: productosNormalizados,
          procesado_con_ia: true,
          fecha_procesamiento: new Date().toISOString(),
          activo: true, // Marcar como activa por defecto
          metadata: {
            url_original: archivo.url_original || null, // URL de la página de origen
          },
        }

        // Verificar si el curso ya existe
        let cursoId: string | number | undefined = archivo.cursoId || undefined
        
        if (!cursoId) {
          // Buscar curso existente
          try {
            // Obtener ID numérico del colegio si es documentId
            let colegioIdNum = colegioId
            if (typeof colegioId === 'string' && !/^\d+$/.test(colegioId)) {
              const colegioResponse = await strapiClient.get<any>(
                `/api/colegios/${colegioId}?fields=id&publicationState=preview`
              )
              const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
              colegioIdNum = colegioData?.id || colegioData?.attributes?.id || colegioId
            }
            
            const buscarCursosResponse = await strapiClient.get<any>(
              `/api/cursos?filters[colegio][id][$eq]=${colegioIdNum}&filters[nivel][$eq]=${nivel}&filters[grado][$eq]=${grado}&filters[anio][$eq]=${año}&fields[0]=id&fields[1]=documentId&pagination[pageSize]=1&publicationState=preview`
            )
            
            const cursosExistentes = Array.isArray(buscarCursosResponse.data) 
              ? buscarCursosResponse.data 
              : [buscarCursosResponse.data]
            
            if (cursosExistentes.length > 0) {
              const cursoExistente = cursosExistentes[0]
              cursoId = cursoExistente.documentId || cursoExistente.id
              console.log(`[Carga Masiva IA] ✅ Curso existente encontrado: ${cursoId}`)
            }
          } catch (error: any) {
            console.warn(`[Carga Masiva IA] ⚠️ Error buscando curso existente:`, error.message)
          }
        }

        if (cursoId) {
          // Actualizar curso existente: agregar nueva versión a versiones_materiales
          console.log(`[Carga Masiva IA] 🔄 Actualizando curso existente: ${cursoId}`)
          
          try {
            // Obtener curso actual para obtener versiones existentes
            const cursoActualResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/cursos/${cursoId}?publicationState=preview`
            )
            
            const cursoActual = Array.isArray(cursoActualResponse.data) 
              ? cursoActualResponse.data[0] 
              : cursoActualResponse.data
            
            const attrs = cursoActual?.attributes || cursoActual
            const versionesExistentes = attrs?.versiones_materiales || []
            
            // Agregar nueva versión al array existente
            const nuevasVersiones = Array.isArray(versionesExistentes) 
              ? [...versionesExistentes, versionMaterial]
              : [versionMaterial]
            
            // Actualizar curso con nuevas versiones
            const updateData = {
              data: {
                versiones_materiales: nuevasVersiones,
              },
            }
            
            await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
              `/api/cursos/${cursoId}`,
              updateData
            )
            
            console.log(`[Carga Masiva IA] ✅ Curso actualizado: ${cursoId} (${nuevasVersiones.length} versiones)`)
          } catch (error: any) {
            console.error(`[Carga Masiva IA] ❌ Error actualizando curso ${cursoId}:`, error)
            throw new Error(`Error al actualizar curso: ${error.message}`)
          }
        } else {
          // Crear curso nuevo
          console.log(`[Carga Masiva IA] ➕ Creando nuevo curso`)
          
          // Obtener ID numérico del colegio si es documentId
          let colegioIdNum = colegioId
          if (typeof colegioId === 'string' && !/^\d+$/.test(colegioId)) {
            try {
              const colegioResponse = await strapiClient.get<any>(
                `/api/colegios/${colegioId}?fields=id&publicationState=preview`
              )
              const colegioData = Array.isArray(colegioResponse.data) ? colegioResponse.data[0] : colegioResponse.data
              colegioIdNum = colegioData?.id || colegioData?.attributes?.id || colegioId
              console.log(`[Carga Masiva IA] 🔄 Convertido documentId ${colegioId} a ID numérico ${colegioIdNum}`)
            } catch (error: any) {
              console.warn(`[Carga Masiva IA] ⚠️ Error obteniendo ID numérico del colegio:`, error.message)
              // Intentar usar el colegioId original
            }
          }
          
          const cursoData: any = {
            data: {
              nombre_curso: `${grado}° ${nivel}`,
              colegio: { connect: [colegioIdNum] }, // Usar ID numérico para la relación
              nivel: nivel,
              grado: String(grado),
              anio: año, // Strapi usa "anio" sin tilde
              activo: true,
              versiones_materiales: [versionMaterial],
            },
          }

          const cursoResponse = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
            '/api/cursos',
            cursoData
          )

          // Manejar respuesta que puede ser objeto único o array
          const cursoCreado = Array.isArray(cursoResponse.data) 
            ? cursoResponse.data[0] 
            : cursoResponse.data
          
          cursoId = cursoCreado?.id || cursoCreado?.documentId || undefined
          
          console.log(`[Carga Masiva IA] ✅ Curso creado: ${cursoId}`)
        }

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
