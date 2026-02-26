import { NextRequest, NextResponse } from 'next/server'
import { listRedirectsBana, createRedirectBana } from '@/lib/trampolin-bana-client'

export const dynamic = 'force-dynamic'

function hasAuth(request: NextRequest): boolean {
  const authToken = request.cookies.get('auth_token')?.value
  const authColaborador = request.cookies.get('auth_colaborador')?.value
  const colaboradorData = request.cookies.get('colaboradorData')?.value
  const colaborador = request.cookies.get('colaborador')?.value
  return !!(authToken || authColaborador || colaboradorData || colaborador)
}

export async function GET(request: NextRequest) {
  if (!hasAuth(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const data = await listRedirectsBana()
    return NextResponse.json({ success: true, data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al listar'
    if (msg.includes('TRAMPOLIN_QR_API_URL')) {
      return NextResponse.json({ success: false, error: 'Configura TRAMPOLIN_QR_API_URL en Railway (URL de Trampolín QR)' }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasAuth(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const campaña = typeof body.campaña === 'string' ? body.campaña.trim().replace(/\D/g, '').slice(0, 2) : ''
    const slug = typeof body.slug === 'string' ? body.slug.trim().replace(/[^a-zA-Z0-9_-]/g, '') : ''
    const destino = typeof body.destino === 'string' ? body.destino.trim() : typeof body.urlDestino === 'string' ? body.urlDestino.trim() : ''
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : ''

    if (!campaña || !slug) {
      return NextResponse.json({ success: false, error: 'Faltan campaña (año) y slug' }, { status: 400 })
    }
    if (!destino) {
      return NextResponse.json({ success: false, error: 'Falta URL de destino' }, { status: 400 })
    }

    const entry = await createRedirectBana({ campaña, slug, destino, descripcion })
    return NextResponse.json({ success: true, data: entry })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al crear'
    if (msg.includes('TRAMPOLIN_QR_API_URL')) {
      return NextResponse.json({ success: false, error: 'Configura TRAMPOLIN_QR_API_URL en Railway' }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
