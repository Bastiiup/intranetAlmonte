import { NextRequest, NextResponse } from 'next/server'
import { getRedirectBana, updateRedirectBana, deleteRedirectBana } from '@/lib/trampolin-bana-client'

export const dynamic = 'force-dynamic'

function hasAuth(request: NextRequest): boolean {
  const authToken = request.cookies.get('auth_token')?.value
  const authColaborador = request.cookies.get('auth_colaborador')?.value
  const colaboradorData = request.cookies.get('colaboradorData')?.value
  const colaborador = request.cookies.get('colaborador')?.value
  return !!(authToken || authColaborador || colaboradorData || colaborador)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasAuth(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { id } = await params
    const entry = await getRedirectBana(id)
    if (!entry) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        campaña: entry.campaña,
        slug: entry.slug,
        urlDestino: entry.destino,
        nombre: entry.slug,
        descripcion: entry.descripcion ?? '',
        visitas: 0,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasAuth(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const destino = typeof body.urlDestino === 'string' ? body.urlDestino.trim() : typeof body.destino === 'string' ? body.destino.trim() : ''
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : undefined
    const entry = await updateRedirectBana(id, { destino, descripcion })
    return NextResponse.json({ success: true, data: entry })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar'
    if (msg === 'No encontrado') {
      return NextResponse.json({ success: false, error: msg }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasAuth(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { id } = await params
    await deleteRedirectBana(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al eliminar'
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
