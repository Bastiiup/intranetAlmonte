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

  const telefonos = Array.isArray(attrs.telefonos) ? attrs.telefonos : []
  const emails = Array.isArray(attrs.emails) ? attrs.emails : []
  const direcciones = Array.isArray(attrs.direcciones) ? attrs.direcciones : []
  const websites = Array.isArray(attrs.Website) ? attrs.Website : []

  const telefonoPrincipal =
    (telefonos[0]?.telefono_raw as string | undefined) ??
    (telefonos[0]?.telefono_norm as string | undefined) ??
    ''

  const emailPrincipal = (emails[0]?.email as string | undefined) ?? ''

  const direccionPrincipal = (() => {
    const d = (direcciones[0] as any) ?? {}
    const calle = (d.nombre_calle as string | undefined) ?? ''
    const numero = (d.numero_calle as string | undefined) ?? ''
    const complemento = (d.complemento_direccion as string | undefined) ?? ''
    return [calle, numero, complemento].filter(Boolean).join(' ').trim()
  })()

  const websitePrincipal = (websites[0]?.website as string | undefined) ?? ''

  const estadoNombre = attrs.estado_nombre ?? null
  const estado = attrs.estado ?? estadoNombre ?? null

  return {
    id: item.id,
    documentId: item.documentId ?? String(item.id),
    rbd: attrs.rbd ?? null,
    colegio_nombre: attrs.colegio_nombre ?? '',
    dependencia: attrs.dependencia ?? null,
    ruralidad: attrs.ruralidad ?? null,
    estado,
    estado_nombre: estadoNombre,
    estado_estab: attrs.estado_estab ?? null,
    region: attrs.region ?? '',
    provincia: attrs.provincia ?? '',
    zona: attrs.zona ?? '',
    telefono_principal: telefonoPrincipal,
    email_principal: emailPrincipal,
    direccion_principal: direccionPrincipal,
    website_principal: websitePrincipal,
  }
}

type ResolvedColegioIds = {
  internalId: number
  documentId: string | number
}

async function resolveColegioInternalIds(rawId: string): Promise<ResolvedColegioIds | null> {
  const trimmedId = rawId?.trim()
  if (!trimmedId) return null

  const queryParams = new URLSearchParams({
    'fields[0]': 'id',
    'fields[1]': 'documentId',
    'filters[$or][0][id][$eq]': trimmedId,
    'filters[$or][1][documentId][$eq]': trimmedId,
    'pagination[pageSize]': '1',
  })

  const listUrl = `${getStrapiUrl('/api/colegios')}?${queryParams.toString()}`

  console.log('[API /api/mira/colegios/[id] resolveColegioInternalId] Resolviendo ID interno', {
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
      '[API /api/mira/colegios/[id] resolveColegioInternalId] Error al buscar colegio en lista',
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
  console.log(
    '[API /api/mira/colegios/[id] resolveColegioInternalId] Resultado de búsqueda',
    {
      cantidad: dataArray.length,
      primerId: first?.id,
      primerDocumentId: first?.documentId,
    }
  )
  if (!first || first.id == null) return null
  return {
    internalId: Number(first.id),
    documentId: first.documentId ?? first.id,
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
      'fields[6]': 'estado_estab',
      'fields[7]': 'region',
      'fields[8]': 'provincia',
      'fields[9]': 'zona',
      // Buscar tanto por id numérico como por documentId
      'filters[$or][0][id][$eq]': trimmedId,
      'filters[$or][1][documentId][$eq]': trimmedId,
    })

    // Necesitamos los componentes de contacto para poder editarlos desde Intranet
    queryParams.set('populate[telefonos]', 'true')
    queryParams.set('populate[emails]', 'true')
    queryParams.set('populate[direcciones]', 'true')
    queryParams.set('populate[Website]', 'true')

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
        rbd: body.rbd != null ? Number(body.rbd) : undefined,
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

    console.log('[API /api/mira/colegios/[id] PUT] Iniciando actualización de colegio', {
      rawId: id,
      payload,
    })

    // Resolver IDs interno y documentId en Strapi a partir de id o documentId
    const resolved = await resolveColegioInternalIds(id)
    if (!resolved) {
      console.error(
        '[API /api/mira/colegios/[id] PUT] No se encontró ID interno en Strapi para el colegio',
        { rawId: id }
      )
      return NextResponse.json(
        {
          success: false,
          error:
            'Colegio no encontrado en Strapi para actualizar (no se pudo resolver id interno a partir de id/documentId).',
        },
        { status: 404 }
      )
    }

    // Igual que en Autores: usamos documentId como identificador estable en la URL
    const pathId = String(resolved.documentId ?? resolved.internalId)
    const url = getStrapiUrl(`/api/colegios/${encodeURIComponent(pathId)}`)

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
      console.error('[API /api/mira/colegios/[id] PUT] Error desde Strapi', {
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
    const resolved = await resolveColegioInternalIds(id)
    if (!resolved) {
      console.error(
        '[API /api/mira/colegios/[id] DELETE] No se encontró ID interno en Strapi para el colegio',
        { rawId: id }
      )
      return NextResponse.json(
        {
          success: false,
          error:
            'Colegio no encontrado en Strapi para eliminar (no se pudo resolver id interno a partir de id/documentId).',
        },
        { status: 404 }
      )
    }

    const pathId = String(resolved.documentId ?? resolved.internalId)
    const url = getStrapiUrl(`/api/colegios/${encodeURIComponent(pathId)}`)

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

