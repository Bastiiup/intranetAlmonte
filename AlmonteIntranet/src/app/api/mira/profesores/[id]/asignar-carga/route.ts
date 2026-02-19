import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { getStrapiUrl } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

type AsignacionItem = {
  colegio_id: string | number
  curso_id?: string | number
  asignatura_id?: string | number
  cargo: string
  anio?: number
}

function buildPayload(personaId: string, item: AsignacionItem) {
  const anioFinal =
    typeof item.anio === 'number' && item.anio >= 2000 && item.anio <= 2100
      ? item.anio
      : new Date().getFullYear()
  const data: Record<string, unknown> = {
    persona: personaId,
    colegio: item.colegio_id,
    cargo: String(item.cargo).trim(),
    anio: anioFinal,
    is_current: true,
    publishedAt: new Date().toISOString(),
  }
  if (item.curso_id) data.curso = item.curso_id
  if (item.asignatura_id) data.asignatura = item.asignatura_id
  return { data }
}

/**
 * POST /api/mira/profesores/[id]/asignar-carga
 * Crea una o más persona-trayectoria (carga académica) para el profesor [id].
 * Payload: { asignaciones: [{ colegio_id, curso_id?, asignatura_id?, cargo, anio? }, ...] }
 * o un solo objeto { colegio_id, curso_id?, asignatura_id?, cargo, anio? }.
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
    const asignaciones: AsignacionItem[] = Array.isArray(body.asignaciones)
      ? body.asignaciones
      : body.colegio_id && body.cargo
        ? [body as AsignacionItem]
        : []

    if (asignaciones.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Envía al menos una asignación (colegio y cargo obligatorios).' },
        { status: 400 }
      )
    }

    for (const item of asignaciones) {
      if (!item.colegio_id) {
        return NextResponse.json({ success: false, error: 'Cada asignación debe tener colegio' }, { status: 400 })
      }
      if (!item.cargo || typeof item.cargo !== 'string' || !String(item.cargo).trim()) {
        return NextResponse.json({ success: false, error: 'Cada asignación debe tener cargo' }, { status: 400 })
      }
    }

    const created: unknown[] = []
    for (const item of asignaciones) {
      const payload = buildPayload(personaId, item)
      const response = await strapiClient.post<{ data?: unknown }>(
        '/api/persona-trayectorias',
        payload
      )
      created.push(response?.data ?? response)
    }

    return NextResponse.json({
      success: true,
      data: created.length === 1 ? created[0] : created,
      created: created.length,
      message: created.length === 1
        ? 'Carga académica asignada correctamente'
        : `${created.length} asignaciones creadas correctamente`,
    })
  } catch (error: any) {
    const isFetchFailed =
      error?.message === 'fetch failed' ||
      (error?.cause && String(error.cause).includes('fetch'))
    const strapiUrl = getStrapiUrl('/api/persona-trayectorias')
    console.error('[API /mira/profesores/[id]/asignar-carga POST] Error:', {
      message: error?.message,
      cause: error?.cause,
      strapiHost: strapiUrl.replace(/\/api\/persona-trayectorias$/, ''),
      tieneUrl: !!process.env.NEXT_PUBLIC_STRAPI_URL,
      tieneToken: !!process.env.STRAPI_API_TOKEN,
    })
    if (isFetchFailed) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se pudo conectar con Strapi. Revisa NEXT_PUBLIC_STRAPI_URL y STRAPI_API_TOKEN en las variables de entorno (Railway).',
        },
        { status: 502 }
      )
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al asignar carga académica' },
      { status: error?.status || 500 }
    )
  }
}
