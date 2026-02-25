import { NextRequest, NextResponse } from 'next/server'
import { getTrampolin } from '@/lib/mira-trampolin-store'

export const dynamic = 'force-dynamic'

function hasAuth(request: NextRequest): boolean {
  const authToken = request.cookies.get('auth_token')?.value
  const authColaborador = request.cookies.get('auth_colaborador')?.value
  const colaboradorData = request.cookies.get('colaboradorData')?.value
  const colaborador = request.cookies.get('colaborador')?.value
  return !!(authToken || authColaborador || colaboradorData || colaborador)
}

export async function POST(request: NextRequest) {
  if (!hasAuth(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const baseUrl = process.env.TRAMPOLIN_QR_API_URL?.replace(/\/$/, '')
  if (!baseUrl) {
    return NextResponse.json(
      { success: false, error: 'No configurado: añade TRAMPOLIN_QR_API_URL en Railway (URL de la app Trampolín QR)' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const trampolinId = typeof body.trampolinId === 'string' ? body.trampolinId.trim() : ''
    const campaña = typeof body.campaña === 'string' ? body.campaña.trim() : String(new Date().getFullYear()).slice(-2)
    const slug = typeof body.slug === 'string' ? body.slug.trim().replace(/[^a-zA-Z0-9_-]/g, '') : ''

    if (!trampolinId) {
      return NextResponse.json({ success: false, error: 'Falta trampolinId' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Falta slug (solo letras, números, _ o -)' }, { status: 400 })
    }

    const entry = await getTrampolin(trampolinId)
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Trampolín no encontrado' }, { status: 404 })
    }

    const redirectId = `${campaña}-${slug}`
    const payload = {
      campaña,
      slug,
      destino: entry.urlDestino?.trim() || '',
      descripcion: entry.descripcion?.trim() || null,
    }

    const headers = { 'Content-Type': 'application/json' }

    let res = await fetch(`${baseUrl}/api/redirects/${redirectId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })

    if (res.status === 404) {
      res = await fetch(`${baseUrl}/api/redirects`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const detail = err.detail || err.error || res.statusText
      return NextResponse.json(
        { success: false, error: detail || `Trampolín API: ${res.status}` },
        { status: res.status >= 500 ? 502 : 400 }
      )
    }

    const publicUrl = `https://mor.cl/${campaña}/${slug}.html`
    return NextResponse.json({
      success: true,
      data: { redirectId, publicUrl, campaña, slug },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Error al conectar con Trampolín QR. Revisa TRAMPOLIN_QR_API_URL.' },
      { status: 502 }
    )
  }
}
