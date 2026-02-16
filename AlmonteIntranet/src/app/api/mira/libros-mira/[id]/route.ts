import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * GET: Obtener un libro MIRA por id o documentId, con recursos (recursos_mira) poblados.
 * Para usar en la vista de detalle del libro y mostrar ListaRecursos.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  try {
    const queryParams = new URLSearchParams({
      'populate[libro][fields][0]': 'nombre_libro',
      'populate[libro][fields][1]': 'isbn_libro',
      'populate[libro][populate]': 'portada_libro',
      'populate[recursos_mira][populate]': 'archivo_adjunto',
    })
    const url = `${getStrapiUrl(`/api/libros-mira/${id}`)}?${queryParams.toString()}`
    const headers: HeadersInit = {}
    if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`

    const res = await fetch(url, { method: 'GET', headers })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: text || res.statusText },
        { status: res.status }
      )
    }
    const json = await res.json()
    return NextResponse.json(json)
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Error al obtener libro MIRA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
