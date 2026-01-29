/**
 * Almacenamiento en memoria para logs de [LOGGING]
 * Permite capturar y recuperar logs reales de logActivity
 */

interface LogEntry {
  timestamp: string
  level: 'log' | 'error' | 'warn'
  message: string
  data?: any
}

class LogStorage {
  private logs: LogEntry[] = []
  private maxLogs = 200 // Mantener solo los últimos 200 logs

  addLog(level: 'log' | 'error' | 'warn', message: string, data?: any) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    })
    
    // Mantener solo los últimos maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs] // Retornar copia para evitar mutaciones
  }

  getLogsByPrefix(prefix: string): LogEntry[] {
    return this.logs.filter(log => log.message.includes(prefix))
  }

  clearLogs() {
    this.logs = []
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count)
  }
}

// Instancia singleton
export const logStorage = new LogStorage()

// Interceptar console.log, console.error, console.warn para capturar logs de [LOGGING]
// CRÍTICO: Esto debe ejecutarse cuando el módulo se carga, no condicionalmente
if (typeof window === 'undefined') {
  // Solo en el servidor
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  console.log = (...args: any[]) => {
    originalLog(...args)
    try {
      const seen = new WeakSet()
      const message = args.map(arg => safeStringify(arg, seen)).join(' ')
      
      // Solo loggear si el mensaje no es solo un objeto vacío
      // Capturar logs de [LOGGING], [Strapi Client POST], y logs relacionados con listas
      const shouldLog = message && message.trim() !== '{}' && (
        message.includes('[LOGGING]') || 
        message.includes('[Strapi Client POST]') ||
        message.includes('[API /crm/listas') ||
        message.includes('[API /crm/listas/por-colegio') ||
        message.includes('[ListasListing]') ||
        message.includes('versiones_materiales') ||
        message.includes('por-colegio')
      )
      if (shouldLog) {
        logStorage.addLog('log', message, args.length > 1 ? args.slice(1) : undefined)
      }
    } catch (e) {
      // Si hay error al procesar, ignorar para evitar loops
    }
  }

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

  console.error = (...args: any[]) => {
    // Verificar primero si el mensaje es solo un objeto vacío antes de llamar a originalError
    try {
      const seen = new WeakSet()
      const message = args.map(arg => safeStringify(arg, seen)).join(' ')
      
      // Si el mensaje es solo un objeto vacío o está vacío, no hacer nada
      if (!message || message.trim() === '{}' || message.trim() === '') {
        return // No llamar a originalError ni loggear nada
      }
      
      // Si tiene contenido, llamar a originalError
      originalError(...args)
      
      // Solo loggear si el mensaje incluye los prefijos que nos interesan
      const shouldLog = message.includes('[LOGGING]') || 
                       message.includes('[Strapi Client POST]') ||
                       message.includes('[API /crm/listas') ||
                       message.includes('[API /crm/listas/por-colegio') ||
                       message.includes('[ListasListing]') ||
                       message.includes('versiones_materiales') ||
                       message.includes('por-colegio')
      if (shouldLog) {
        logStorage.addLog('error', message, args.length > 1 ? args.slice(1) : undefined)
      }
    } catch (e) {
      // Si hay error al procesar, llamar a originalError de todas formas para no perder el error
      originalError(...args)
    }
  }

  console.warn = (...args: any[]) => {
    originalWarn(...args)
    try {
      const seen = new WeakSet()
      const message = args.map(arg => safeStringify(arg, seen)).join(' ')
      
      // Solo loggear si el mensaje no es solo un objeto vacío
      const shouldLog = message && message.trim() !== '{}' && (
        message.includes('[LOGGING]') || 
        message.includes('[Strapi Client POST]') ||
        message.includes('[API /crm/listas') ||
        message.includes('[API /crm/listas/por-colegio') ||
        message.includes('[ListasListing]') ||
        message.includes('versiones_materiales') ||
        message.includes('por-colegio')
      )
      if (shouldLog) {
        logStorage.addLog('warn', message, args.length > 1 ? args.slice(1) : undefined)
      }
    } catch (e) {
      // Si hay error al procesar, ignorar para evitar loops
    }
  }
  
  // Log de confirmación
  originalLog('[LogStorage] ✅ Interceptores de console configurados para capturar logs de [LOGGING] y [Strapi Client POST]')
}

