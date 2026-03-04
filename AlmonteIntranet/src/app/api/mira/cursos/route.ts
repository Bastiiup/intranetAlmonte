import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawPageSize = searchParams.get('pageSize')
    const search = (searchParams.get('search') || '').trim()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`
    }

    const baseParams = new URLSearchParams({
      'fields[0]': 'nombre_curso',
      'fields[1]': 'nivel',
      'fields[2]': 'grado',
      'fields[3]': 'letra',
      'fields[4]': 'anio',
      'populate[colegio][fields][0]': 'colegio_nombre',
      'populate[colegio][fields][1]': 'rbd',
      sort: 'anio:desc',
    })

    if (search) {
      let orIndex = 0
      baseParams.set(
        `filters[$or][${orIndex}][nombre_curso][$containsi]`,
        search
      )
      orIndex += 1
      baseParams.set(
        `filters[$or][${orIndex}][nivel][$containsi]`,
        search
      )
      orIndex += 1
      baseParams.set(
        `filters[$or][${orIndex}][grado][$containsi]`,
        search
      )
      orIndex += 1
      baseParams.set(
        `filters[$or][${orIndex}][letra][$containsi]`,
        search
      )
      orIndex += 1
      baseParams.set(
        `filters[$or][${orIndex}][colegio][colegio_nombre][$containsi]`,
        search
      )
      orIndex += 1

      const maybeYear = parseInt(search, 10)
      if (!Number.isNaN(maybeYear)) {
        baseParams.set(
          `filters[$or][${orIndex}][anio][$eq]`,
          String(maybeYear)
        )
      }
    }

    const fetchAll = rawPageSize === '-1' || rawPageSize === 'all'
    let allItems: any[] = []
    let meta: any = null

    if (fetchAll) {
      const perPage = 300
      let page = 1
      let pageCount = 1

      do {
        baseParams.set('pagination[page]', page.toString())
        baseParams.set('pagination[pageSize]', perPage.toString())

        const url = `${getStrapiUrl('/api/cursos')}?${baseParams.toString()}`

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
        meta = json.meta ?? null

        allItems = allItems.concat(data)

        const pagination = meta?.pagination
        pageCount = pagination?.pageCount ?? page
        page += 1
      } while (page <= pageCount)
    } else {
      const page = parseInt(searchParams.get('page') || '1')
      const pageSize = parseInt(rawPageSize || '100')

      baseParams.set('pagination[page]', page.toString())
      baseParams.set('pagination[pageSize]', pageSize.toString())

      const url = `${getStrapiUrl('/api/cursos')}?${baseParams.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      const json = await response.json()
      allItems = Array.isArray(json.data) ? json.data : json.data?.data ?? []
      meta = json.meta ?? null
    }

    const transformed = allItems.map((item: any) => {
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

