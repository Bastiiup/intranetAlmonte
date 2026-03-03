import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')

    const queryParams = new URLSearchParams({
      'fields[0]': 'nombre_curso',
      'fields[1]': 'nivel',
      'fields[2]': 'grado',
      'fields[3]': 'letra',
      'fields[4]': 'anio',
      'populate[colegio][fields][0]': 'colegio_nombre',
      'populate[colegio][fields][1]': 'rbd',
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      sort: 'anio:desc',
    })

    const url = `${getStrapiUrl('/api/cursos')}?${queryParams.toString()}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error ${response.status}: ${errorText}`)
    }

    const json = await response.json()

    const data = Array.isArray(json.data) ? json.data : json.data?.data ?? []
    const meta = json.meta ?? null

    const transformed = data.map((item: any) => {
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
    })

    return NextResponse.json({
      success: true,
      data: transformed,
      meta,
    })
  } catch (error: any) {
    console.error('[API /api/mira/cursos] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al obtener cursos',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const payload = {
      data: {
        nombre_curso: body.nombre_curso ?? undefined,
        nivel: body.nivel ?? undefined,
        grado: body.grado != null ? Number(body.grado) : undefined,
        letra: body.letra ?? undefined,
        anio: body.anio != null ? Number(body.anio) : undefined,
        colegio: body.colegio ?? body.colegioId ?? undefined,
      },
    }

    const url = getStrapiUrl('/api/cursos')

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const json = await response.json()

    if (!response.ok) {
      const errorMsg =
        json.error?.message ??
        json.error?.details?.errors?.[0]?.message ??
        JSON.stringify(json.error ?? 'Error al crear curso')
      throw new Error(errorMsg)
    }

    const item = json.data
    const attrs = item?.attributes ?? item ?? {}

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

    return NextResponse.json({
      success: true,
      data: {
        id: item?.id,
        documentId: item?.documentId ?? String(item?.id),
        nombre_curso: attrs.nombre_curso ?? '',
        nivel: attrs.nivel ?? null,
        grado: attrs.grado ?? null,
        letra: attrs.letra ?? null,
        anio: attrs.anio ?? null,
        colegio,
        colegio_nombre: colegio?.colegio_nombre ?? '',
      },
    })
  } catch (error: any) {
    console.error('[API /api/mira/cursos POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al crear curso',
      },
      { status: 500 }
    )
  }
}

