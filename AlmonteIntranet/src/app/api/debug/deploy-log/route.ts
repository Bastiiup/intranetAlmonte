import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/deploy-log
 * Para comprobar en Railway que el deploy tiene el código correcto.
 * Si populateStyle === 'named' y no hay "populate[2]" en populateHint, el fix de trayectorias está activo.
 */
export async function GET() {
  const populateHint = 'populate[trayectorias][populate][colegio]=true (sin índices 0,1,2)'
  return NextResponse.json({
    ok: true,
    service: 'intranet',
    route: 'mira/profesores',
    populateStyle: 'named',
    populateHint,
    message: 'Fix Invalid key 2 at trayectorias aplicado: se usa solo colegio, curso, asignatura con =true',
    timestamp: new Date().toISOString(),
  })
}
