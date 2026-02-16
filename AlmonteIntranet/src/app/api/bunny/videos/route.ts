import { NextRequest, NextResponse } from 'next/server'
import { getBunnyApiKey, getBunnyLibraryId, getBunnyVideosUrl } from '@/lib/bunny/config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bunny/videos
 * Proxy a Bunny Stream API: lista de videos de la biblioteca (paginada).
 * Query: page (default 1), perPage (default 100).
 * Requiere BUNNY_API_KEY y BUNNY_LIBRARY_ID en .env
 */
export async function GET(request: NextRequest) {
  const apiKey = getBunnyApiKey()
  const libraryId = getBunnyLibraryId()

  if (!apiKey || !libraryId) {
    return NextResponse.json(
      { error: 'Bunny no configurado: faltan BUNNY_API_KEY o BUNNY_LIBRARY_ID' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') || '1'
  const perPage = searchParams.get('perPage') || '100'
  const search = searchParams.get('search') || ''

  const params = new URLSearchParams()
  params.set('page', page)
  params.set('perPage', perPage)
  if (search) params.set('search', search)

  const url = getBunnyVideosUrl('', params)
  const headers: HeadersInit = {
    AccessKey: apiKey,
    Accept: 'application/json',
  }

  try {
    const res = await fetch(url, { method: 'GET', headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.Message || data.message || res.statusText },
        { status: res.status }
      )
    }
    return NextResponse.json(data)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al listar videos Bunny'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
