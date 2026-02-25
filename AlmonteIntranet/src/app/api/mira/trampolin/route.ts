import { NextRequest, NextResponse } from 'next/server'
import { listTrampolines, createTrampolin } from '@/lib/mira-trampolin-store'

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
    const trampolines = await listTrampolines()
    return NextResponse.json({ success: true, data: trampolines })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error al listar' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasAuth(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const urlDestino = typeof body.urlDestino === 'string' ? body.urlDestino.trim() : ''
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : ''
    const entry = await createTrampolin({ urlDestino, nombre, descripcion })
    return NextResponse.json({ success: true, data: entry })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error al crear' }, { status: 500 })
  }
}
