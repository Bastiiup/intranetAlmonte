import { NextRequest, NextResponse } from 'next/server'
import { getStrapiUrl, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

type VincularBody = {
  libroId: number | string
  videos: { id: string; nombre: string }[]
}

/**
 * POST /api/mira/recursos/vincular
 * Crea entradas en Strapi (recursos-mira) vinculando videos de Bunny a un libro MIRA.
 * Body: { libroId: number, videos: { id: string, nombre: string }[] }
 * Asigna orden incremental. Tipo fijo: "video", proveedor: Bunny.
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

  const creados: { id: string; nombre: string; orden: number }[] = []
  const errores: { id: string; nombre: string; error: string }[] = []

  console.log('[MIRA vincular] Inicio:', { libroId, totalVideos: videos.length, baseUrl })

  for (let orden = 0; orden < videos.length; orden++) {
    const v = videos[orden]
    const id = v?.id ?? ''
    const nombre = (v?.nombre ?? id) || `Video ${orden + 1}`

    const payload = {
      data: {
        nombre,
        tipo: 'video',
        proveedor: 'bunny_stream',
        video_id: id,
        libro_mira: libroId,
        orden,
      },
    }

    try {
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
        console.error('[MIRA vincular] Strapi error:', res.status, errorMsg, text.slice(0, 500))
        errores.push({ id, nombre, error: errorMsg })
        continue
      }
      creados.push({ id, nombre, orden })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error de red'
      console.error('[MIRA vincular] Excepción:', msg, e)
      errores.push({ id, nombre, error: msg })
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
