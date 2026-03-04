import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawPageSize = searchParams.get('pageSize')
    const search = (searchParams.get('search') || '').trim()

    // Si pageSize = -1 o = all, traemos TODOS los colegios paginando internamente
    const fetchAll = rawPageSize === '-1' || rawPageSize === 'all'

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (STRAPI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`
    }

    const baseParams = new URLSearchParams({
      'fields[0]': 'rbd',
      'fields[1]': 'colegio_nombre',
      'fields[2]': 'dependencia',
      'fields[3]': 'estado',
      'fields[4]': 'estado_nombre',
      'fields[5]': 'estado_estab',
      'fields[6]': 'region',
      'fields[7]': 'provincia',
      'fields[8]': 'zona',
      sort: 'colegio_nombre:asc',
    })

    if (search) {
      let orIndex = 0
      baseParams.set(
        `filters[$or][${orIndex}][colegio_nombre][$containsi]`,
        search
      )
      orIndex += 1
      baseParams.set(
        `filters[$or][${orIndex}][dependencia][$containsi]`,
        search
      )
      orIndex += 1
      baseParams.set(`filters[$or][${orIndex}][region][$containsi]`, search)
      orIndex += 1
      baseParams.set(`filters[$or][${orIndex}][provincia][$containsi]`, search)
      orIndex += 1
      baseParams.set(`filters[$or][${orIndex}][zona][$containsi]`, search)
      orIndex += 1

      const maybeRbd = parseInt(search, 10)
      if (!Number.isNaN(maybeRbd)) {
        baseParams.set(
          `filters[$or][${orIndex}][rbd][$eq]`,
          String(maybeRbd)
        )
      }
    }

    let allItems: any[] = []
    let meta: any = null

    if (fetchAll) {
      const perPage = 200
      let page = 1
      let pageCount = 1

      do {
        baseParams.set('pagination[page]', page.toString())
        baseParams.set('pagination[pageSize]', perPage.toString())

        const url = `${getStrapiUrl('/api/colegios')}?${baseParams.toString()}`

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

      const url = `${getStrapiUrl('/api/colegios')}?${baseParams.toString()}`

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
      const attrs = item.attributes ?? item
      return {
        id: item.id,
        documentId: item.documentId ?? String(item.id),
        rbd: attrs.rbd ?? null,
        colegio_nombre: attrs.colegio_nombre ?? '',
        dependencia: attrs.dependencia ?? null,
        estado: attrs.estado ?? attrs.estado_nombre ?? null,
        estado_nombre: attrs.estado_nombre ?? null,
        estado_estab: attrs.estado_estab ?? null,
        region: attrs.region ?? null,
        provincia: attrs.provincia ?? null,
        zona: attrs.zona ?? null,
      }
    })

    return NextResponse.json({
      success: true,
      data: transformed,
      meta,
    })
  } catch (error: any) {
    console.error('[API /api/mira/colegios] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al obtener colegios',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const telefonoPrincipal =
      typeof body.telefono_principal === 'string'
        ? body.telefono_principal.trim()
        : ''
    const emailPrincipal =
      typeof body.email_principal === 'string'
        ? body.email_principal.trim()
        : ''
    const direccionPrincipal =
      typeof body.direccion_principal === 'string'
        ? body.direccion_principal.trim()
        : ''
    const websitePrincipal =
      typeof body.website_principal === 'string'
        ? body.website_principal.trim()
        : ''

    const telefonosPayload =
      telefonoPrincipal !== ''
        ? [
            {
              telefono_raw: telefonoPrincipal,
              principal: true,
              status: true,
            },
          ]
        : undefined

    const emailsPayload =
      emailPrincipal !== ''
        ? [
            {
              email: emailPrincipal,
              principal: true,
              status: true,
            },
          ]
        : undefined

    const direccionesPayload =
      direccionPrincipal !== ''
        ? [
            {
              nombre_calle: direccionPrincipal,
            },
          ]
        : undefined

    const websitesPayload =
      websitePrincipal !== ''
        ? [
            {
              website: websitePrincipal,
              status: true,
            },
          ]
        : undefined

    const payload = {
      data: {
        rbd: body.rbd ? Number(body.rbd) : undefined,
        rbd_digito_verificador: body.rbd_digito_verificador ?? undefined,
        colegio_nombre: body.colegio_nombre ?? undefined,
        dependencia: body.dependencia ?? undefined,
        ruralidad: body.ruralidad ?? undefined,
        estado_nombre: body.estado_nombre ?? undefined,
        estado: body.estado ?? undefined,
        estado_estab: body.estado_estab ?? undefined,
        region: body.region ?? undefined,
        provincia: body.provincia ?? undefined,
        zona: body.zona ?? undefined,
        telefonos: telefonosPayload,
        emails: emailsPayload,
        direcciones: direccionesPayload,
        Website: websitesPayload,
      },
    }

    const url = getStrapiUrl('/api/colegios')

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
        JSON.stringify(json.error ?? 'Error al crear colegio')
      throw new Error(errorMsg)
    }

    const item = json.data
    const attrs = item?.attributes ?? item ?? {}

    return NextResponse.json({
      success: true,
      data: {
        id: item?.id,
        documentId: item?.documentId ?? String(item?.id),
        rbd: attrs.rbd ?? null,
        colegio_nombre: attrs.colegio_nombre ?? '',
        dependencia: attrs.dependencia ?? null,
        estado: attrs.estado ?? attrs.estado_nombre ?? null,
      },
    })
  } catch (error: any) {
    console.error('[API /api/mira/colegios POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? 'Error al crear colegio',
      },
      { status: 500 }
    )
  }
}
