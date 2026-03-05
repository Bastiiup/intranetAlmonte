import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mira/libros-base
 * Lista libros generales (api::libro.libro) para el selector de Libro Base.
 * Soporta búsqueda básica por nombre o ISBN.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = (searchParams.get('search') || '').trim()

    const params = new URLSearchParams({
      'pagination[pageSize]': '50',
      'sort[0]': 'nombre_libro:asc',
      'fields[0]': 'nombre_libro',
      'fields[1]': 'isbn_libro',
    })

    if (search) {
      let orIndex = 0
      params.set(
        `filters[$or][${orIndex}][nombre_libro][$containsi]`,
        search,
      )
      orIndex += 1
      params.set(
        `filters[$or][${orIndex}][isbn_libro][$containsi]`,
        search,
      )
    }

    const url = `${getStrapiUrl('/api/libros')}?${params.toString()}`
    const headers: HeadersInit = {}
    if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`

    const res = await fetch(url, { method: 'GET', headers })
    const json = await res.json()

    if (!res.ok) {
      const msg =
        json?.error?.message ??
        json?.error?.details?.errors?.[0]?.message ??
        res.statusText
      throw new Error(msg)
    }

    const raw = Array.isArray(json.data) ? json.data : json.data ? [json.data] : []
    const data = raw.map((item: any) => {
      const attrs = item.attributes ?? item ?? {}
      return {
        id: item.id,
        documentId: item.documentId ?? String(item.id),
        nombre_libro: attrs.nombre_libro ?? 'Sin título',
        isbn_libro: attrs.isbn_libro ?? null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[API /api/mira/libros-base] Error:', e)
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Error al obtener libros base' },
      { status: 500 },
    )
  }
}

