import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')

    const queryParams = new URLSearchParams({
      'fields[0]': 'rbd',
      'fields[1]': 'colegio_nombre',
      'fields[2]': 'dependencia',
      'fields[3]': 'estado',
      'fields[4]': 'estado_nombre',
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      sort: 'colegio_nombre:asc',
    })

    const url = `${getStrapiUrl('/api/colegios')}?${queryParams.toString()}`

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
      const attrs = item.attributes ?? item
      return {
        id: item.id,
        documentId: item.documentId ?? String(item.id),
        rbd: attrs.rbd ?? null,
        colegio_nombre: attrs.colegio_nombre ?? '',
        dependencia: attrs.dependencia ?? null,
        estado: attrs.estado ?? attrs.estado_nombre ?? null,
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
