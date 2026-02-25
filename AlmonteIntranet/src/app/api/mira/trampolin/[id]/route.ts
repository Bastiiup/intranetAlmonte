import { NextRequest, NextResponse } from 'next/server'
import { getTrampolin, updateTrampolin, deleteTrampolin } from '@/lib/mira-trampolin-store'

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
    const entry = await getTrampolin(id)
    if (!entry) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: entry })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
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
    const body = await request.json()
    const urlDestino = typeof body.urlDestino === 'string' ? body.urlDestino.trim() : ''
    const ok = await updateTrampolin(id, urlDestino)
    if (!ok) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: { id, urlDestino } })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error al guardar' }, { status: 500 })
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
    const ok = await deleteTrampolin(id)
    if (!ok) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error al eliminar' }, { status: 500 })
  }
}
