import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getBunnyApiKey, getBunnyLibraryId, BUNNY_VIDEO_BASE } from '@/lib/bunny/config'

export const dynamic = 'force-dynamic'

type CreateUploadBody = {
  title?: string
}

/**
 * POST /api/bunny/videos/upload
 *
 * En lugar de recibir el archivo de video (que rompe el límite de 10MB de Next.js),
 * este endpoint solo:
 *   1) Crea el video en Bunny (POST /library/{id}/videos) y obtiene el GUID.
 *   2) Genera una firma SHA256 para subida directa vía TUS desde el navegador.
 *
 * Devuelve los datos necesarios para que el cliente haga upload directo a:
 *   https://video.bunnycdn.com/tusupload
 *
 * Headers que deberá usar el cliente (tus-js-client):
 *   - AuthorizationSignature: SHA256(libraryId + apiKey + expiration + videoId)
 *   - AuthorizationExpire:   expiration (UNIX seconds)
 *   - VideoId:               video GUID
 *   - LibraryId:             libraryId
 */
export async function POST(request: NextRequest) {
  const apiKey = getBunnyApiKey()
  const libraryId = getBunnyLibraryId()

  if (!apiKey || !libraryId) {
    return NextResponse.json(
      { error: 'Bunny no configurado: faltan BUNNY_API_KEY o BUNNY_LIBRARY_ID' },
      { status: 503 }
    )
  }

  let body: CreateUploadBody
  try {
    body = (await request.json()) as CreateUploadBody
  } catch {
    body = {}
  }

  const rawTitle = (body.title ?? '').trim()
  const title = rawTitle || 'Sin título'

  const headers: HeadersInit = {
    AccessKey: apiKey,
    Accept: 'application/json',
  }

  // 1) Crear video en Bunny (POST)
  const createUrl = `${BUNNY_VIDEO_BASE}/library/${libraryId}/videos`
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ Title: title }),
  })

  const createData = await createRes.json().catch(() => ({}))
  if (!createRes.ok) {
    return NextResponse.json(
      { error: createData.Message || createData.message || createRes.statusText },
      { status: createRes.status }
    )
  }

  const videoId = createData.guid ?? createData.id
  if (!videoId) {
    return NextResponse.json(
      { error: 'Bunny no devolvió ID del video creado' },
      { status: 502 }
    )
  }

  // 2) Generar firma para subida directa via TUS
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 // 1 hora
  // Fórmula oficial Bunny Stream pre-signed upload:
  // SHA256(libraryId + apiKey + expiration + videoId)
  const raw = `${libraryId}${apiKey}${expires}${videoId}`
  const signature = createHash('sha256').update(raw).digest('hex')

  const uploadUrl = `${BUNNY_VIDEO_BASE}/tusupload`

  return NextResponse.json({
    success: true,
    title,
    videoId,
    libraryId,
    uploadUrl,
    expires,
    signature,
  })
}
