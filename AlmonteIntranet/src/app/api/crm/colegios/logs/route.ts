import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Almacenamiento simple de logs en memoria (se perderá al reiniciar el servidor)
// En producción, deberías usar una base de datos o servicio de logging
const logsStorage: Array<{
  timestamp: string
  level: 'log' | 'error' | 'warn'
  message: string
  data?: any
}> = []

const MAX_LOGS = 1000 // Mantener solo los últimos 1000 logs

// Interceptar console.log, console.error, console.warn para capturar logs de importación
if (typeof window === 'undefined') {
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  // Función helper para serializar argumentos de forma segura
  const safeStringify = (arg: any, seen = new WeakSet()): string => {
    if (arg === null || arg === undefined) {
      return String(arg)
    }
    if (typeof arg !== 'object') {
      return String(arg)
    }
    
    // Verificar si el objeto está vacío
    try {
      const keys = Object.keys(arg)
      if (keys.length === 0) {
        return '{}'
      }
    } catch (e) {
      // Si no se pueden obtener las keys, intentar serializar de todas formas
    }
    
    // Verificar referencias circulares
    if (seen.has(arg)) {
      return '[Circular]'
    }
    
    try {
      seen.add(arg)
      return JSON.stringify(arg, (key, value) => {
        // Evitar referencias circulares en valores anidados
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]'
          }
          seen.add(value)
        }
        return value
      }, 2)
    } catch (e) {
      // Si falla la serialización, usar toString o un mensaje genérico
      try {
        return arg.toString ? arg.toString() : '[Object]'
      } catch (toStringError) {
        return '[Object - no serializable]'
      }
    }
  }

  const addLog = (level: 'log' | 'error' | 'warn', ...args: any[]) => {
    try {
      const seen = new WeakSet()
      const message = args.map(arg => safeStringify(arg, seen)).join(' ')

      // Ignorar mensajes que son solo objetos vacíos
      if (!message || message.trim() === '{}' || message.trim() === '') {
        return
      }

      // Solo capturar logs relacionados con importación de niveles/asignaturas y matriculados
      if (
        message.includes('[API /crm/colegios/import-niveles-asignaturas]') ||
        message.includes('[API /crm/colegios/import-matriculados]') ||
        message.includes('[ImportarNivelesAsignaturasModal]') ||
        message.includes('[ImportarMatriculadosModal]') ||
        message.includes('import-niveles-asignaturas') ||
        message.includes('import-matriculados') ||
        message.includes('[PROGRESO MATRICULADOS]') ||
        message.includes('[PROGRESO]')
      ) {
        logsStorage.push({
          timestamp: new Date().toISOString(),
          level,
          message,
          data: args.length > 1 ? args.slice(1) : undefined,
        })

        // Mantener solo los últimos MAX_LOGS
        if (logsStorage.length > MAX_LOGS) {
          logsStorage.shift()
        }
      }
    } catch (e) {
      // Si hay un error al procesar el log, ignorarlo para evitar loops infinitos
      // No hacer nada aquí para evitar recursión
    }
  }

  console.log = (...args: any[]) => {
    originalLog(...args)
    addLog('log', ...args)
  }

  console.error = (...args: any[]) => {
    originalError(...args)
    addLog('error', ...args)
  }

  console.warn = (...args: any[]) => {
    originalWarn(...args)
    addLog('warn', ...args)
  }
}

/**
 * GET /api/crm/colegios/logs
 * Obtiene los logs de importación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const level = searchParams.get('level') as 'log' | 'error' | 'warn' | null

    let filteredLogs = [...logsStorage]

    // Filtrar por nivel si se especifica
    if (level) {
      filteredLogs = filteredLogs.filter((log) => log.level === level)
    }

    // Ordenar por timestamp descendente (más reciente primero)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Limitar cantidad
    const limitedLogs = filteredLogs.slice(0, limit)

    return NextResponse.json(
      {
        success: true,
        data: {
          logs: limitedLogs,
          total: logsStorage.length,
          filtered: filteredLogs.length,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error: any) {
    console.error('[API /crm/colegios/logs GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener logs',
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

/**
 * DELETE /api/crm/colegios/logs
 * Limpia los logs
 */
export async function DELETE(request: NextRequest) {
  try {
    logsStorage.length = 0
    return NextResponse.json({
      success: true,
      message: 'Logs limpiados exitosamente',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al limpiar logs',
      },
      { status: 500 }
    )
  }
}
