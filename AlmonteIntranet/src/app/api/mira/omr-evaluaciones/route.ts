import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * GET: Listar evaluaciones OMR desde Strapi
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pageSize') || '20'
    const queryParams = new URLSearchParams({
      'populate[estudiante][fields][0]': 'email',
      'populate[estudiante][fields][1]': 'nivel',
      'populate[libro_mira][fields][0]': 'nombre_libro',
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      sort: 'createdAt:desc',
    })
    const url = `${getStrapiUrl('/api/omr-evaluaciones')}?${queryParams.toString()}`
    const headers: HeadersInit = {}
    if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`

    const res = await fetch(url, { method: 'GET', headers })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: text || res.statusText }, { status: res.status })
    }
    const json = await res.json()
    return NextResponse.json(json)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error listando evaluaciones OMR'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST: Crear evaluación OMR (subir hoja y procesar en Strapi).
 * Body: FormData con:
 *   - data: string JSON { estudiante: number, libro_mira?: number }
 *   - imagen_hoja: File (imagen de la hoja de respuestas)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const dataRaw = formData.get('data')
    const file = formData.get('imagen_hoja') ?? formData.get('files.imagen_hoja')

    if (!dataRaw || typeof dataRaw !== 'string') {
      return NextResponse.json(
        { error: 'Falta el campo "data" (JSON con estudiante y opcional libro_mira)' },
        { status: 400 }
      )
    }
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Falta el archivo "imagen_hoja" (imagen de la hoja de respuestas)' },
        { status: 400 }
      )
    }

    const strapiFormData = new FormData()
    strapiFormData.append('data', dataRaw)
    strapiFormData.append('files.imagen_hoja', file as Blob, (file as File).name || 'hoja.jpg')

    const url = getStrapiUrl('/api/omr-evaluaciones')
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
        { status: res.status }
      )
    }
    return NextResponse.json(json)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error subiendo evaluación OMR'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
