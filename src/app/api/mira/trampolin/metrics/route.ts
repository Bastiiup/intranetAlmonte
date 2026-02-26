import { NextRequest, NextResponse } from 'next/server'
import { getMetricsBana } from '@/lib/trampolin-bana-client'

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
    const metrics = await getMetricsBana()
    return NextResponse.json({ success: true, data: metrics })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al obtener métricas'
    if (msg.includes('TRAMPOLIN_QR_API_URL')) {
      return NextResponse.json({ success: false, error: 'Configura TRAMPOLIN_QR_API_URL en Railway' }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
