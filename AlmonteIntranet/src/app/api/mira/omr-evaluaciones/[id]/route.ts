import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * PUT: Actualizar evaluación OMR (confirmar / publicar con respuestas finales).
 * Body: JSON { data: { publishedAt?, resultados?, rut? } }.
 * Strapi aplica la corrección automática (pauta maestra) al publicar.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Falta id de evaluación OMR' }, { status: 400 })
    }
    const body = await request.json().catch(() => ({}))
    const url = `${getStrapiUrl('/api/omr-evaluaciones')}/${encodeURIComponent(id)}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: json.error?.message || json.error || res.statusText },
        { status: res.status }
      )
    }
    return NextResponse.json(json)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error actualizando evaluación OMR'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
