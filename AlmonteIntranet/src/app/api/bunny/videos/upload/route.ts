import { NextRequest, NextResponse } from 'next/server'
import { getBunnyApiKey, getBunnyLibraryId, BUNNY_VIDEO_BASE } from '@/lib/bunny/config'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bunny/videos/upload
 * Multipart: title (string), file (archivo de video).
 * Crea el video en Bunny (POST) y luego sube el archivo (PUT).
 * Proxy para no exponer BUNNY_API_KEY en el cliente.
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

  let title = ''
  let file: File | null = null

  try {
    const formData = await request.formData()
    title = (formData.get('title') as string)?.trim() || 'Sin título'
    file = formData.get('file') as File | null
  } catch {
    return NextResponse.json(
      { error: 'FormData inválido' },
      { status: 400 }
    )
  }

  if (!file || !file.size) {
    return NextResponse.json(
      { error: 'Falta el archivo de video' },
      { status: 400 }
    )
  }

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

  // 2) Subir archivo (PUT) — cuerpo binario
  const uploadUrl = `${BUNNY_VIDEO_BASE}/library/${libraryId}/videos/${videoId}`
  const arrayBuffer = await file.arrayBuffer()
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      AccessKey: apiKey,
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': String(arrayBuffer.byteLength),
    },
    body: arrayBuffer,
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    return NextResponse.json(
      { error: errText || uploadRes.statusText, videoId },
      { status: uploadRes.status }
    )
  }

  return NextResponse.json({
    success: true,
    videoId,
    title,
  })
}
