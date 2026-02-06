import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

type VincularBody = {
  libroId: number | string
  videos: { id: string; nombre: string }[]
}

/**
 * POST /api/mira/recursos/vincular
 * Vincula videos de Bunny a un libro MIRA (upsert por video_id).
 * - Si ya existe recurso con ese video_id: PUT solo libro_mira y orden (no sobrescribe capítulo/sección).
 * - Si no existe: POST crea nuevo recurso.
 * Body: { libroId: number, videos: { id: string, nombre: string }[] }
 */
export async function POST(request: NextRequest) {
  if (!STRAPI_API_TOKEN) {
    return NextResponse.json(
      { error: 'Strapi no configurado: falta STRAPI_API_TOKEN' },
      { status: 503 }
    )
  }

  let body: VincularBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo JSON inválido' },
      { status: 400 }
    )
  }

  const { libroId, videos } = body
  if (libroId == null || !Array.isArray(videos)) {
    return NextResponse.json(
      { error: 'Se requieren libroId (number) y videos (array de { id, nombre })' },
      { status: 400 }
    )
  }

  const baseUrl = getStrapiUrl('api/recursos-mira')
  const headers: HeadersInit = {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json',
  }

  const creados: { id: string; nombre: string; orden: number; actualizado?: boolean }[] = []
  const errores: { id: string; nombre: string; error: string }[] = []

  console.log('[MIRA vincular] Inicio upsert:', { libroId, totalVideos: videos.length, baseUrl })

  for (let orden = 0; orden < videos.length; orden++) {
    const v = videos[orden]
    const guid = v?.id ?? ''
    const nombre = (v?.nombre ?? guid) || `Video ${orden + 1}`

    try {
      // 1) Buscar si ya existe un recurso con este video_id
      const searchUrl = `${baseUrl}?filters[video_id][$eq]=${encodeURIComponent(guid)}`
      const searchRes = await fetch(searchUrl, { method: 'GET', headers })
      const searchText = await searchRes.text()
      let existingId: number | null = null
      if (searchRes.ok && searchText) {
        try {
          const searchJson = JSON.parse(searchText) as { data?: { id: number }[] }
          if (Array.isArray(searchJson.data) && searchJson.data.length > 0) {
            existingId = searchJson.data[0].id
          }
        } catch {
          // ignorar parse error
        }
      }

      if (existingId != null) {
        // 2a) Existe: PUT solo libro_mira y orden (no tocamos numero_capitulo ni seccion)
        const putUrl = `${baseUrl}/${existingId}`
        const putPayload = { data: { libro_mira: libroId, orden } }
        const putRes = await fetch(putUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(putPayload),
        })
        const putText = await putRes.text()
        if (!putRes.ok) {
          let errorMsg = putText || putRes.statusText
          try {
            const errJson = JSON.parse(putText) as { error?: { message?: string } }
            errorMsg = errJson.error?.message ?? putText
          } catch {
            // mantener putText
          }
          console.error('[MIRA vincular] Strapi PUT error:', putRes.status, errorMsg)
          errores.push({ id: guid, nombre, error: errorMsg })
          continue
        }
        creados.push({ id: guid, nombre, orden, actualizado: true })
      } else {
        // 2b) No existe: POST crear nuevo
        const payload = {
          data: {
            nombre,
            tipo: 'video',
            proveedor: 'bunny_stream',
            video_id: guid,
            libro_mira: libroId,
            orden,
          },
        }
        const res = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        const text = await res.text()
        let errorMsg = text || res.statusText

        if (!res.ok) {
          try {
            const errJson = JSON.parse(text) as { error?: { message?: string; details?: unknown } }
            errorMsg = errJson.error?.message ?? text
          } catch {
            // mantener text si no es JSON
          }
          console.error('[MIRA vincular] Strapi POST error:', res.status, errorMsg, text.slice(0, 500))
          errores.push({ id: guid, nombre, error: errorMsg })
          continue
        }
        creados.push({ id: guid, nombre, orden })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error de red'
      console.error('[MIRA vincular] Excepción:', msg, e)
      errores.push({ id: guid, nombre, error: msg })
    }
  }

  if (errores.length > 0) {
    console.warn('[MIRA vincular] Resumen errores:', errores.map((e) => e.error))
  }

  return NextResponse.json({
    success: true,
    creados: creados.length,
    errores: errores.length,
    primerError: errores[0]?.error ?? null,
    detalle: { creados, errores },
  })
}
