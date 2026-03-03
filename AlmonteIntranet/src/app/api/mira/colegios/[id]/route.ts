import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

async function buildStrapiHeaders() {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`
  }
  return headers
}

function mapStrapiColegio(item: any) {
  if (!item) return null
  const attrs = item.attributes ?? item ?? {}
  return {
    id: item.id,
    documentId: item.documentId ?? String(item.id),
    rbd: attrs.rbd ?? null,
    colegio_nombre: attrs.colegio_nombre ?? '',
    dependencia: attrs.dependencia ?? null,
    ruralidad: attrs.ruralidad ?? null,
    estado: attrs.estado ?? attrs.estado_nombre ?? null,
  }
}

async function resolveColegioInternalId(rawId: string): Promise<number | null> {
  const trimmedId = rawId?.trim()
  if (!trimmedId) return null

  const queryParams = new URLSearchParams({
    'fields[0]': 'id',
    'filters[$or][0][id][$eq]': trimmedId,
    'filters[$or][1][documentId][$eq]': trimmedId,
    'pagination[pageSize]': '1',
  })

  const listUrl = `${getStrapiUrl('/api/colegios')}?${queryParams.toString()}`

  const response = await fetch(listUrl, {
    method: 'GET',
    headers: await buildStrapiHeaders(),
  })

  if (!response.ok) {
    return null
  }

  const json = await response.json().catch(() => ({}))
  const dataArray = Array.isArray(json.data) ? json.data : json.data?.data ?? []
  const first = dataArray[0]
  if (!first || first.id == null) return null
  return Number(first.id)
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const trimmedId = id?.trim()
    if (!trimmedId) {
      return NextResponse.json(
        { success: false, error: 'ID de colegio requerido' },
        { status: 400 }
      )
    }

    const queryParams = new URLSearchParams({
      'fields[0]': 'rbd',
      'fields[1]': 'colegio_nombre',
      'fields[2]': 'dependencia',
      'fields[3]': 'ruralidad',
      'fields[4]': 'estado',
      'fields[5]': 'estado_nombre',
      // Buscar tanto por id numérico como por documentId
      'filters[$or][0][id][$eq]': trimmedId,
      'filters[$or][1][documentId][$eq]': trimmedId,
    })

    const listUrl = `${getStrapiUrl('/api/colegios')}?${queryParams.toString()}`

    const response = await fetch(listUrl, {
      method: 'GET',
      headers: await buildStrapiHeaders(),
    })

    const json = await response.json()

    if (!response.ok) {
      const errorMsg =
        json?.error?.message ??
        json?.error?.details?.errors?.[0]?.message ??
        `Error al obtener colegio: ${response.status}`
      throw new Error(errorMsg)
    }

    const dataArray = Array.isArray(json.data) ? json.data : json.data?.data ?? []
    const mapped = dataArray.length > 0 ? mapStrapiColegio(dataArray[0]) : null

    if (!mapped) {
      return NextResponse.json(
        { success: false, error: 'Colegio no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mapped,
    })
  } catch (error: any) {
    console.error('[API /api/mira/colegios/[id] GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al obtener colegio',
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de colegio requerido' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))

    const payload = {
      data: {
        rbd: body.rbd != null ? Number(body.rbd) : undefined,
        rbd_digito_verificador: body.rbd_digito_verificador ?? undefined,
        colegio_nombre: body.colegio_nombre ?? undefined,
        dependencia: body.dependencia ?? undefined,
        ruralidad: body.ruralidad ?? undefined,
      },
    }

    // Resolver ID interno numérico en Strapi a partir de id o documentId
    const internalId = await resolveColegioInternalId(id)
    if (internalId == null) {
      return NextResponse.json(
        { success: false, error: 'Colegio no encontrado en Strapi para actualizar' },
        { status: 404 }
      )
    }

    const url = getStrapiUrl(`/api/colegios/${encodeURIComponent(String(internalId))}`)

    const response = await fetch(url, {
      method: 'PUT',
      headers: await buildStrapiHeaders(),
      body: JSON.stringify(payload),
    })

    const json = await response.json()

    if (!response.ok) {
      const errorMsg =
        json?.error?.message ??
        json?.error?.details?.errors?.[0]?.message ??
        JSON.stringify(json?.error ?? 'Error al actualizar colegio')
      throw new Error(errorMsg)
    }

    const mapped = mapStrapiColegio(json.data ?? json)

    return NextResponse.json({
      success: true,
      data: mapped,
    })
  } catch (error: any) {
    console.error('[API /api/mira/colegios/[id] PUT] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al actualizar colegio',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de colegio requerido' },
        { status: 400 }
      )
    }
    const internalId = await resolveColegioInternalId(id)
    if (internalId == null) {
      return NextResponse.json(
        { success: false, error: 'Colegio no encontrado en Strapi para eliminar' },
        { status: 404 }
      )
    }

    const url = getStrapiUrl(`/api/colegios/${encodeURIComponent(String(internalId))}`)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: await buildStrapiHeaders(),
    })

    const json = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMsg =
        json?.error?.message ??
        json?.error?.details?.errors?.[0]?.message ??
        `Error al eliminar colegio: ${response.status}`
      throw new Error(errorMsg)
    }

    return NextResponse.json({
      success: true,
      data: null,
    })
  } catch (error: any) {
    console.error('[API /api/mira/colegios/[id] DELETE] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al eliminar colegio',
      },
      { status: 500 }
    )
  }
}

