import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

function mapLibroMiraDetalle(item: any) {
  const attrs = item.attributes ?? item ?? {}
  const libroRel = attrs.libro?.data ?? attrs.libro ?? null
  const libroAttrs = libroRel?.attributes ?? libroRel ?? {}
  const asigRel = attrs.asignatura?.data ?? attrs.asignatura ?? null
  const asigAttrs = asigRel?.attributes ?? asigRel ?? {}

  return {
    id: item.id,
    documentId: item.documentId ?? String(item.id),
    libro: libroRel
      ? {
          id: libroRel.id ?? null,
          documentId: libroRel.documentId ?? String(libroRel.id ?? ''),
          nombre_libro: libroAttrs.nombre_libro ?? 'Sin título',
          isbn_libro: libroAttrs.isbn_libro ?? null,
        }
      : null,
    asignatura: asigRel
      ? {
          id: asigRel.id ?? null,
          documentId: asigRel.documentId ?? String(asigRel.id ?? ''),
          nombre: asigAttrs.nombre ?? null,
        }
      : null,
    url_qr_redireccion: attrs.url_qr_redireccion ?? null,
    google_drive_folder_id: attrs.google_drive_folder_id ?? null,
    tiene_omr: attrs.tiene_omr === true,
    activo: attrs.activo !== false,
  }
}

/**
 * GET: Obtener un libro MIRA por id o documentId (para edición en CRUD admin).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
  }

  try {
    const queryParams = new URLSearchParams({
      'populate[libro][fields][0]': 'nombre_libro',
      'populate[libro][fields][1]': 'isbn_libro',
      'populate[asignatura][fields][0]': 'nombre',
    })
    const url = `${getStrapiUrl(`/api/libros-mira/${encodeURIComponent(id)}`)}?${queryParams.toString()}`
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

    const mapped = mapLibroMiraDetalle(json.data ?? json)
    return NextResponse.json({ success: true, data: mapped })
  } catch (e: any) {
    console.error('[API /api/mira/libros-mira/[id] GET] Error:', e)
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Error al obtener libro MIRA' },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
  }

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

    const url = getStrapiUrl(`/api/libros-mira/${encodeURIComponent(id)}`)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`

    const res = await fetch(url, {
      method: 'PUT',
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

    const mapped = mapLibroMiraDetalle(json.data ?? json)
    return NextResponse.json({ success: true, data: mapped })
  } catch (e: any) {
    console.error('[API /api/mira/libros-mira/[id] PUT] Error:', e)
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Error al actualizar libro MIRA' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
  }

  try {
    const url = getStrapiUrl(`/api/libros-mira/${encodeURIComponent(id)}`)
    const headers: HeadersInit = {}
    if (STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`

    const res = await fetch(url, { method: 'DELETE', headers })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg =
        json?.error?.message ??
        json?.error?.details?.errors?.[0]?.message ??
        res.statusText
      throw new Error(msg)
    }

    return NextResponse.json({ success: true, data: null })
  } catch (e: any) {
    console.error('[API /api/mira/libros-mira/[id] DELETE] Error:', e)
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Error al eliminar libro MIRA' },
      { status: 500 },
    )
  }
}
