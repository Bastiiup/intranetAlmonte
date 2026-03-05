import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

type LibroMiraListado = {
  id: number | string
  documentId: string
  libroId: number | string | null
  libroNombre: string
  isbn: string | null
  asignaturaId: number | string | null
  asignaturaNombre: string | null
  activo: boolean
  tiene_omr: boolean
}

function mapLibroMiraItem(item: any): LibroMiraListado {
  const attrs = item.attributes ?? item ?? {}
  const libroRel = attrs.libro?.data ?? attrs.libro ?? null
  const libroAttrs = libroRel?.attributes ?? libroRel ?? {}
  const asigRel = attrs.asignatura?.data ?? attrs.asignatura ?? null
  const asigAttrs = asigRel?.attributes ?? asigRel ?? {}

  return {
    id: item.id,
    documentId: item.documentId ?? String(item.id),
    libroId: libroRel?.id ?? null,
    libroNombre: libroAttrs.nombre_libro ?? 'Sin título',
    isbn: libroAttrs.isbn_libro ?? null,
    asignaturaId: asigRel?.id ?? null,
    asignaturaNombre: asigAttrs.nombre ?? null,
    activo: attrs.activo !== false,
    tiene_omr: attrs.tiene_omr === true,
  }
}

/**
 * GET /api/mira/libros-mira
 *
 * - Sin query `page` ni `pageSize` → proxy directo a Strapi (modo compat para selects existentes).
 * - Con `page` / `pageSize` → listado paginado para el CRUD admin (transformado).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pageParam = searchParams.get('page')
  const pageSizeParam = searchParams.get('pageSize')

  // Modo compat: otros módulos usan /api/mira/libros-mira?pagination[pageSize]=...
  if (!pageParam && !pageSizeParam) {
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

  // Modo CRUD admin: listado paginado + búsqueda
  try {
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.max(1, parseInt(pageSizeParam || '25', 10) || 25)
    const search = (searchParams.get('search') || '').trim()

    const query = new URLSearchParams({
      'populate[libro][fields][0]': 'nombre_libro',
      'populate[libro][fields][1]': 'isbn_libro',
      'populate[asignatura][fields][0]': 'nombre',
      'fields[0]': 'tiene_omr',
      'fields[1]': 'activo',
      'pagination[page]': String(page),
      'pagination[pageSize]': String(pageSize),
      'sort[0]': 'id:asc',
    })

    if (search) {
      let orIndex = 0
      query.set(
        `filters[$or][${orIndex}][libro][nombre_libro][$containsi]`,
        search,
      )
      orIndex += 1
      query.set(
        `filters[$or][${orIndex}][libro][isbn_libro][$containsi]`,
        search,
      )
      orIndex += 1
      query.set(
        `filters[$or][${orIndex}][asignatura][nombre][$containsi]`,
        search,
      )
    }

    const url = `${getStrapiUrl('/api/libros-mira')}?${query.toString()}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
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

    const rawData = Array.isArray(json.data) ? json.data : json.data?.data ?? []
    const data: LibroMiraListado[] = rawData.map(mapLibroMiraItem)
    const meta = json.meta ?? null

    return NextResponse.json({
      success: true,
      data,
      meta,
    })
  } catch (e: any) {
    console.error('[API /api/mira/libros-mira] Error listado CRUD:', e)
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Error al obtener libros MIRA' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const payload = {
      data: {
        libro: body.libro != null ? Number(body.libro) : undefined,
        asignatura: body.asignatura != null ? Number(body.asignatura) : undefined,
        url_qr_redireccion: body.url_qr_redireccion ?? undefined,
        google_drive_folder_id: body.google_drive_folder_id ?? undefined,
        tiene_omr: body.tiene_omr ?? false,
        activo: body.activo ?? true,
      },
    }

    const url = getStrapiUrl('/api/libros-mira')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!res.ok) {
      const msg =
        json?.error?.message ??
        json?.error?.details?.errors?.[0]?.message ??
        res.statusText
      throw new Error(msg)
    }

    const mapped = mapLibroMiraItem(json.data ?? json)
    return NextResponse.json({ success: true, data: mapped })
  } catch (e: any) {
    console.error('[API /api/mira/libros-mira POST] Error:', e)
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Error al crear libro MIRA' },
      { status: 500 },
    )
  }
}

