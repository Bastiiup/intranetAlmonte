import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * GET: Listar personas MIRA (estudiantes) para selector en formulario OMR
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pageSize = searchParams.get('pageSize') || '100'
    const queryParams = new URLSearchParams({
      'populate[persona][fields][0]': 'nombre',
      'populate[persona][fields][1]': 'apellido_paterno',
      'populate[persona][fields][2]': 'rut',
      'pagination[pageSize]': pageSize,
      sort: 'id:asc',
    })
    const url = `${getStrapiUrl('/api/personas-mira')}?${queryParams.toString()}`
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
    const message = e instanceof Error ? e.message : 'Error listando personas MIRA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
