/**
 * Sugerir asignatura (y opcionalmente categoría) por producto usando IA (Gemini).
 * POST /api/crm/listas/detectar-asignaturas-ia
 * Body: { productos: { id: string|number, nombre: string }[] }
 * Response: { success: true, suggestions: { [productId]: { asignatura?: string, categoria?: string } } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MODELOS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']

export async function POST(request: NextRequest) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { productos } = body as {
      productos?: Array<{ id: string | number; nombre: string }>
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere productos (array de { id, nombre })' },
        { status: 400 }
      )
    }

    const listaProductos = productos
      .map((p) => `- id: ${p.id} | nombre: "${(p.nombre || '').slice(0, 200)}"`)
      .join('\n')

    const prompt = `Eres un asistente para listas escolares chilenas. Dado una lista de productos (útiles, libros, materiales), asigna a cada uno:
1. ASIGNATURA: la materia o asignatura a la que pertenece (ej. Matemáticas, Lenguaje y Comunicación, Ciencias Naturales, Historia, Inglés, Educación Física, Artes, Tecnología, Religión, Orientación, etc.). Si es un útil genérico (lápiz, cuaderno, carpeta) que se usa en varias asignaturas, usa "Varios" o "General".
2. CATEGORÍA: tipo de ítem (ej. Libro, Cuaderno, Útil de escritorio, Manual, Material de arte, etc.).

LISTA DE PRODUCTOS:
${listaProductos}

Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra, con esta forma exacta:
{"suggestions": {"ID1": {"asignatura": "Nombre Asignatura", "categoria": "Categoría"}, "ID2": {...}, ...}}

- Las claves de "suggestions" deben ser los IDs exactos como string (ej. "123" o "producto-1").
- Incluye TODOS los IDs de la lista.
- asignatura y categoria en español, nombres cortos y claros.`

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    let lastError: Error | null = null

    for (const modelName of MODELOS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        if (!text) continue

        let jsonStr = text.trim()
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) jsonStr = jsonMatch[0]

        const parsed = JSON.parse(jsonStr) as { suggestions?: Record<string, { asignatura?: string; categoria?: string }> }
        const suggestions = parsed.suggestions || {}

        return NextResponse.json({
          success: true,
          suggestions,
        })
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        continue
      }
    }

    throw lastError || new Error('No se pudo obtener respuesta de la IA')
  } catch (error: any) {
    console.error('[detectar-asignaturas-ia] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al detectar asignaturas' },
      { status: 500 }
    )
  }
}
