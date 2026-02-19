import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/mira/profesores/[id]/asignar-carga
 * Crea una persona-trayectoria (carga académica) para el profesor [id].
 * Payload: colegio_id, curso_id (opcional), asignatura_id (opcional), cargo, anio.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personaId } = await params
    if (!personaId) {
      return NextResponse.json({ success: false, error: 'ID de profesor es requerido' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { colegio_id, curso_id, asignatura_id, cargo, anio } = body

    if (!colegio_id) {
      return NextResponse.json({ success: false, error: 'Debes seleccionar un colegio' }, { status: 400 })
    }
    if (!cargo || typeof cargo !== 'string' || !cargo.trim()) {
      return NextResponse.json({ success: false, error: 'Debes seleccionar un cargo' }, { status: 400 })
    }

    const anioFinal = typeof anio === 'number' && anio >= 2000 && anio <= 2100
      ? anio
      : new Date().getFullYear()

    const payload: Record<string, unknown> = {
      data: {
        persona: personaId,
        colegio: colegio_id,
        cargo: String(cargo).trim(),
        anio: anioFinal,
        is_current: true,
        publishedAt: new Date().toISOString(),
      },
    }
    const dataPayload = payload.data as Record<string, unknown>
    if (curso_id) dataPayload.curso = curso_id
    if (asignatura_id) dataPayload.asignatura = asignatura_id

    const response = await strapiClient.post<{ data?: { id?: number; documentId?: string } }>(
      '/api/persona-trayectorias',
      payload
    )

    return NextResponse.json({
      success: true,
      data: response?.data ?? response,
      message: 'Carga académica asignada correctamente',
    })
  } catch (error: any) {
    console.error('[API /mira/profesores/[id]/asignar-carga POST] Error:', error?.message)
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al asignar carga académica' },
      { status: error?.status || 500 }
    )
  }
}
