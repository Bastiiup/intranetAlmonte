import { NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN, STRAPI_API_URL } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mira/historial-excels
 * Lista Excels de licencias guardados en Strapi (upload plugin).
 */
export async function GET() {
  try {
    const params = new URLSearchParams({
      'filters[name][$containsi]': 'Licencias',
      'filters[ext][$eq]': '.xlsx',
      'sort[0]': 'createdAt:desc',
      'pagination[pageSize]': '100',
    })
    const url = `${getStrapiUrl('/api/upload/files')}?${params.toString()}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: text || res.statusText },
        { status: res.status }
      )
    }
    const data = await res.json()
    const list = Array.isArray(data) ? data : data?.data ?? []
    const files = list.map((f: any) => {
      const attrs = f.attributes ?? f
      const fileUrl = attrs.url ?? f.url
      const absoluteUrl = fileUrl?.startsWith('http')
        ? fileUrl
        : `${STRAPI_API_URL.replace(/\/$/, '')}${fileUrl?.startsWith('/') ? '' : '/'}${fileUrl || ''}`
      return {
        id: f.id ?? f.documentId,
        name: attrs.name ?? f.name ?? 'archivo.xlsx',
        createdAt: attrs.createdAt ?? f.createdAt ?? null,
        url: absoluteUrl,
      }
    })
    return NextResponse.json({ data: files })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al listar archivos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
