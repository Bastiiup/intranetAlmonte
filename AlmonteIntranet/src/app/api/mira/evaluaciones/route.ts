import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/mira/evaluaciones
 * Crea una evaluación (hoja maestra) en Strapi api::evaluacion.evaluacion.
 * Body: { data: { nombre, categoria, cantidad_preguntas, libro_mira, activo, formas } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body?.data) {
      return NextResponse.json(
        { error: 'Falta el objeto data en el body' },
        { status: 400 }
      )
    }

    const result = await strapiClient.post<{ data?: unknown }>(
      '/api/evaluaciones',
      body
    )
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al crear la evaluación'
    const err = e as { status?: number; details?: unknown }
    return NextResponse.json(
      { error: message, details: err?.details },
      { status: err?.status ?? 500 }
    )
  }
}
