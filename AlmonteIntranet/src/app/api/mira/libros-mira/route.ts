import { NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * GET: Listar libros MIRA para selectores (ej. formulario OMR).
 * Devuelve id, documentId y nombre del libro (libro.nombre_libro).
 */
export async function GET() {
  try {
    const queryParams = new URLSearchParams({
      'populate[libro][fields][0]': 'nombre_libro',
      'populate[libro][fields][1]': 'isbn_libro',
      'pagination[pageSize]': '100',
      sort: 'id:asc',
    })
    const url = `${getStrapiUrl('/api/libros-mira')}?${queryParams.toString()}`
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
    const message = e instanceof Error ? e.message : 'Error listando libros MIRA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
