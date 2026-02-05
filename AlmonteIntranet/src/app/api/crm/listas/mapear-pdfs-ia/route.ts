/**
 * API para mapear nombres de PDFs a grupos de curso usando IA (Claude).
 * POST /api/crm/listas/mapear-pdfs-ia
 * Body: { pdfFileNames: string[], grupos: { key: string, curso: string, colegio: string }[] }
 * Response: { success: true, mapping: Record<string, string>, sinMatch: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const MODELOS = [
  'claude-3-5-haiku-20241022',    // Más rápido y económico
  'claude-sonnet-4-20250514',     // Más preciso
  'claude-3-5-sonnet-20241022',   // Fallback
]

export async function POST(request: NextRequest) {
  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { pdfFileNames, grupos } = body as {
      pdfFileNames?: string[]
      grupos?: Array<{ key: string; curso: string; colegio: string }>
    }

    if (!Array.isArray(pdfFileNames) || pdfFileNames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere pdfFileNames (array de nombres de archivo)' },
        { status: 400 }
      )
    }
    if (!Array.isArray(grupos) || grupos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere grupos (array de { key, curso, colegio })' },
        { status: 400 }
      )
    }

    const listaCursos = grupos
      .map((g) => `- key: "${g.key}" | Colegio: ${g.colegio} | Curso: ${g.curso}`)
      .join('\n')
    const listaPdfs = pdfFileNames.map((n) => `- ${n}`).join('\n')

    const prompt = `Eres un asistente que mapea nombres de archivos PDF de listas escolares a cursos.

NOMBRES DE LOS PDFs (solo el nombre del archivo, pueden incluir RBD, colegio, nivel, grado, año):
${listaPdfs}

CURSOS DISPONIBLES (cada uno tiene un "key" único que DEBES devolver exactamente):
${listaCursos}

INSTRUCCIONES:
1. Para cada nombre de PDF, elige el curso que mejor coincida (mismo colegio/nivel/grado cuando aparezcan en el nombre).
2. Ejemplos: "257_Colegio_Chuquicamata_1_Basico.pdf" → curso "1º Básico" del Colegio Chuquicamata; "II_Medio" o "2_Medio" → "II° Medio"; "Kinder", "Prekinder", "Lactante" pueden mapear a cursos de prebásica si existen.
3. Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra, con esta forma exacta:
{"mapping": {"nombre_archivo.pdf": "key_completo_del_curso", ...}, "sinMatch": ["archivo_sin_match.pdf"]}
4. "mapping" debe tener como clave el nombre del archivo exactamente como aparece en la lista de PDFs, y como valor el "key" exacto del curso de la lista.
5. En "sinMatch" pon los nombres de archivo que no pudiste asignar a ningún curso.
6. Si un PDF coincide con un solo curso, usa ese key. Si hay varios cursos del mismo colegio/nivel, elige el que mejor coincida con el nombre del PDF.`

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    })
    let lastError: Error | null = null

    for (const modelName of MODELOS) {
      try {
        const response = await anthropic.messages.create({
          model: modelName,
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })

        // Extraer texto de la respuesta
        const contenido = response.content[0]
        if (contenido.type !== 'text') {
          throw new Error('Claude no devolvió texto')
        }

        let jsonStr = contenido.text.trim()

        // Extraer JSON (puede venir envuelto en ```json ... ```)
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) jsonStr = jsonMatch[0]
        
        const parsed = JSON.parse(jsonStr) as {
          mapping?: Record<string, string>
          sinMatch?: string[]
        }
        const mapping = parsed.mapping || {}
        const sinMatch = Array.isArray(parsed.sinMatch) ? parsed.sinMatch : []
        // Validar que los keys del mapping existan en grupos
        const keysValidos = new Set(grupos.map((g) => g.key))
        const mappingLimpio: Record<string, string> = {}
        for (const [fileName, key] of Object.entries(mapping)) {
          if (keysValidos.has(key)) mappingLimpio[fileName] = key
        }
        const sinMatchSet = new Set<string>(sinMatch)
        for (const name of pdfFileNames) {
          if (!mappingLimpio[name]) sinMatchSet.add(name)
        }
        return NextResponse.json({
          success: true,
          mapping: mappingLimpio,
          sinMatch: Array.from(sinMatchSet),
          model: modelName,
        })
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        continue
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo obtener respuesta de la IA',
        detalle: lastError?.message,
      },
      { status: 502 }
    )
  } catch (e: any) {
    console.error('[mapear-pdfs-ia]', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
