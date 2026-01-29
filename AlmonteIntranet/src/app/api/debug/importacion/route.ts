import { NextResponse } from 'next/server'

// Store de logs de importación en memoria
const importacionLogs: Array<{
  timestamp: string
  tipo: 'inicio' | 'parseando' | 'grupo' | 'colegio' | 'curso' | 'lista' | 'error' | 'fin'
  mensaje: string
  datos?: any
}> = []

// Limitar a los últimos 500 logs
const MAX_LOGS = 500

/**
 * POST: Agregar log de importación
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tipo, mensaje, datos } = body

    const log = {
      timestamp: new Date().toISOString(),
      tipo,
      mensaje,
      ...(datos && { datos }),
    }

    importacionLogs.unshift(log)

    // Mantener solo los últimos MAX_LOGS
    if (importacionLogs.length > MAX_LOGS) {
      importacionLogs.splice(MAX_LOGS)
    }

    return NextResponse.json({ success: true, totalLogs: importacionLogs.length })
  } catch (error: any) {
    console.error('[API /debug/importacion POST] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET: Obtener logs de importación
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const tipo = searchParams.get('tipo') // filtrar por tipo

  let logs = importacionLogs

  // Filtrar por tipo si se especifica
  if (tipo) {
    logs = logs.filter(log => log.tipo === tipo)
  }

  // Limitar cantidad
  const logsLimitados = logs.slice(0, limit)

  // Estadísticas
  const stats = {
    total: importacionLogs.length,
    porTipo: {
      inicio: importacionLogs.filter(l => l.tipo === 'inicio').length,
      parseando: importacionLogs.filter(l => l.tipo === 'parseando').length,
      grupo: importacionLogs.filter(l => l.tipo === 'grupo').length,
      colegio: importacionLogs.filter(l => l.tipo === 'colegio').length,
      curso: importacionLogs.filter(l => l.tipo === 'curso').length,
      lista: importacionLogs.filter(l => l.tipo === 'lista').length,
      error: importacionLogs.filter(l => l.tipo === 'error').length,
      fin: importacionLogs.filter(l => l.tipo === 'fin').length,
    },
    ultimaImportacion: importacionLogs.find(l => l.tipo === 'inicio')?.timestamp || 'N/A',
  }

  return NextResponse.json({
    success: true,
    stats,
    logs: logsLimitados,
  })
}

/**
 * DELETE: Limpiar logs
 */
export async function DELETE() {
  const count = importacionLogs.length
  importacionLogs.splice(0, importacionLogs.length)
  
  return NextResponse.json({ 
    success: true, 
    mensaje: `${count} logs eliminados`,
  })
}
