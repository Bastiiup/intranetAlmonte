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

type ResolvedCursoIds = {
  internalId: number
  documentId: string | number
}

async function resolveCursoInternalIds(rawId: string): Promise<ResolvedCursoIds | null> {
  const trimmedId = rawId?.trim()
  if (!trimmedId) return null

  const queryParams = new URLSearchParams({
    'fields[0]': 'id',
    'fields[1]': 'documentId',
    'filters[$or][0][id][$eq]': trimmedId,
    'filters[$or][1][documentId][$eq]': trimmedId,
    'pagination[pageSize]': '1',
  })

  const listUrl = `${getStrapiUrl('/api/cursos')}?${queryParams.toString()}`

  console.log('[API /api/mira/cursos/[id] resolveCursoInternalIds] Resolviendo ID interno', {
    rawId,
    trimmedId,
    listUrl,
  })

  const response = await fetch(listUrl, {
    method: 'GET',
    headers: await buildStrapiHeaders(),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error(
      '[API /api/mira/cursos/[id] resolveCursoInternalIds] Error al buscar curso en lista',
      {
        status: response.status,
        statusText: response.statusText,
        body: text.slice(0, 500),
      }
    )
    return null
  }

  const json = await response.json().catch(() => ({}))
  const dataArray = Array.isArray(json.data) ? json.data : json.data?.data ?? []
  const first = dataArray[0]

  console.log('[API /api/mira/cursos/[id] resolveCursoInternalIds] Resultado de búsqueda', {
    cantidad: dataArray.length,
    primerId: first?.id,
    primerDocumentId: first?.documentId,
  })

  if (!first || first.id == null) return null

  return {
    internalId: Number(first.id),
    documentId: first.documentId ?? first.id,
  }
}

function mapStrapiCurso(item: any) {
  if (!item) return null
  const attrs = item.attributes ?? item ?? {}

  const colegioRel = attrs.colegio?.data ?? attrs.colegio ?? null
  const colegioAttrs = colegioRel?.attributes ?? colegioRel ?? {}

  const colegio = colegioRel
    ? {
        id: colegioRel.id,
        documentId: colegioRel.documentId ?? String(colegioRel.id),
        colegio_nombre: colegioAttrs.colegio_nombre ?? '',
        rbd: colegioAttrs.rbd ?? null,
      }
    : null

  return {
    id: item.id,
    documentId: item.documentId ?? String(item.id),
    nombre_curso: attrs.nombre_curso ?? '',
    nivel: attrs.nivel ?? null,
    grado: attrs.grado ?? null,
    letra: attrs.letra ?? null,
    anio: attrs.anio ?? null,
    colegio,
    colegio_nombre: colegio?.colegio_nombre ?? '',
  }
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
        { success: false, error: 'ID de curso requerido' },
        { status: 400 }
      )
    }

    const queryParams = new URLSearchParams({
      'fields[0]': 'nombre_curso',
      'fields[1]': 'nivel',
      'fields[2]': 'grado',
      'fields[3]': 'letra',
      'fields[4]': 'anio',
      'populate[colegio][fields][0]': 'colegio_nombre',
      'populate[colegio][fields][1]': 'rbd',
      'filters[$or][0][id][$eq]': trimmedId,
      'filters[$or][1][documentId][$eq]': trimmedId,
    })

    const listUrl = `${getStrapiUrl('/api/cursos')}?${queryParams.toString()}`

    const response = await fetch(listUrl, {
      method: 'GET',
      headers: await buildStrapiHeaders(),
    })

    const json = await response.json()

    if (!response.ok) {
      const errorMsg =
        json?.error?.message ??
        json?.error?.details?.errors?.[0]?.message ??
        `Error al obtener curso: ${response.status}`
      throw new Error(errorMsg)
    }

    const dataArray = Array.isArray(json.data) ? json.data : json.data?.data ?? []
    const mapped = dataArray.length > 0 ? mapStrapiCurso(dataArray[0]) : null

    if (!mapped) {
      return NextResponse.json(
        { success: false, error: 'Curso no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mapped,
    })
  } catch (error: any) {
    console.error('[API /api/mira/cursos/[id] GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al obtener curso',
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
        { success: false, error: 'ID de curso requerido' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))

    const payload = {
      data: {
        nombre_curso: body.nombre_curso ?? undefined,
        nivel: body.nivel ?? undefined,
        // En el schema de Strapi, grado es string
        grado:
          body.grado != null && body.grado !== ''
            ? String(body.grado)
            : undefined,
        letra: body.letra ?? undefined,
        anio: body.anio != null ? Number(body.anio) : undefined,
        colegio: body.colegio ?? body.colegioId ?? undefined,
      },
    }

    console.log('[API /api/mira/cursos/[id] PUT] Iniciando actualización de curso', {
      rawId: id,
      payload,
    })

    const resolved = await resolveCursoInternalIds(id)
    if (!resolved) {
      console.error(
        '[API /api/mira/cursos/[id] PUT] No se encontró ID interno en Strapi para el curso',
        { rawId: id }
      )
      return NextResponse.json(
        {
          success: false,
          error:
            'Curso no encontrado en Strapi para actualizar (no se pudo resolver id interno a partir de id/documentId).',
        },
        { status: 404 }
      )
    }

    const pathId = String(resolved.documentId ?? resolved.internalId)
    const url = getStrapiUrl(`/api/cursos/${encodeURIComponent(pathId)}`)

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
        JSON.stringify(json?.error ?? 'Error al actualizar curso')
      console.error('[API /api/mira/cursos/[id] PUT] Error desde Strapi', {
        rawId: id,
        internalId: resolved.internalId,
        documentId: resolved.documentId,
        pathId,
        status: response.status,
        statusText: response.statusText,
        error: errorMsg,
      })
      throw new Error(errorMsg)
    }

    const mapped = mapStrapiCurso(json.data ?? json)

    return NextResponse.json({
      success: true,
      data: mapped,
    })
  } catch (error: any) {
    console.error('[API /api/mira/cursos/[id] PUT] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al actualizar curso',
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
        { success: false, error: 'ID de curso requerido' },
        { status: 400 }
      )
    }

    const resolved = await resolveCursoInternalIds(id)
    if (!resolved) {
      console.error(
        '[API /api/mira/cursos/[id] DELETE] No se encontró ID interno en Strapi para el curso',
        { rawId: id }
      )
      return NextResponse.json(
        {
          success: false,
          error:
            'Curso no encontrado en Strapi para eliminar (no se pudo resolver id interno a partir de id/documentId).',
        },
        { status: 404 }
      )
    }

    const pathId = String(resolved.documentId ?? resolved.internalId)
    const url = getStrapiUrl(`/api/cursos/${encodeURIComponent(pathId)}`)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: await buildStrapiHeaders(),
    })

    const json = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMsg =
        json?.error?.message ??
        json?.error?.details?.errors?.[0]?.message ??
        `Error al eliminar curso: ${response.status}`
      throw new Error(errorMsg)
    }

    return NextResponse.json({
      success: true,
      data: null,
    })
  } catch (error: any) {
    console.error('[API /api/mira/cursos/[id] DELETE] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al eliminar curso',
      },
      { status: 500 }
    )
  }
}

