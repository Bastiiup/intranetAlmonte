import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST: Parsear una imagen de pauta maestra con el script OMR en Strapi,
 * SIN crear registros en la base de datos.
 *
 * Body: FormData con:
 *   - imagen_hoja o files.imagen_hoja: File (imagen de la pauta maestra)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('imagen_hoja') ?? formData.get('files.imagen_hoja')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Falta el archivo "imagen_hoja" (imagen de la pauta maestra)' },
        { status: 400 },
      )
    }

    const strapiFormData = new FormData()
    strapiFormData.append('files.imagen_hoja', file as Blob, (file as File).name || 'pauta.jpg')

    const url = getStrapiUrl('/api/evaluaciones/parse-omr')
    const headers: HeadersInit = {}
    if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: strapiFormData,
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: json.error?.message || json.error || res.statusText },
        { status: res.status },
      )
    }
    return NextResponse.json(json)
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Error al procesar la pauta maestra con el servicio OMR'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

