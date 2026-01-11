/**
 * Sistema de logging configurable con niveles
 * Permite controlar qué logs se muestran según el ambiente y configuración
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const

type LogLevel = keyof typeof LOG_LEVELS

interface LogContext {
  [key: string]: any
}

class Logger {
  private level: LogLevel

  constructor() {
    // Determinar nivel de log según ambiente y variable de entorno
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined
    const defaultLevel = process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG'
    this.level = envLevel && LOG_LEVELS[envLevel] !== undefined ? envLevel : defaultLevel
  }

  /**
   * Verifica si se debe loggear según el nivel actual
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level]
  }

  /**
   * Formatea el mensaje con contexto
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level}] ${message}${contextStr}`
  }

  /**
   * Log de error (siempre se muestra)
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, context))
    }
  }

  /**
   * Log de advertencia
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, context))
    }
  }

  /**
   * Log de información
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('INFO')) {
      console.log(this.formatMessage('INFO', message, context))
    }
  }

  /**
   * Log de debug (solo en desarrollo o si LOG_LEVEL=DEBUG)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('DEBUG')) {
      console.log(this.formatMessage('DEBUG', message, context))
    }
  }

  /**
   * Log específico para API routes (con formato consistente)
   */
  api(route: string, message: string, context?: LogContext): void {
    this.debug(`[API ${route}] ${message}`, context)
  }

  /**
   * Log de éxito (alias de info con emoji)
   */
  success(message: string, context?: LogContext): void {
    this.info(`✅ ${message}`, context)
  }

  /**
   * Log de error con formato específico para API
   */
  apiError(route: string, message: string, error?: any): void {
    this.error(`[API ${route}] ${message}`, {
      error: error?.message || error,
      stack: error?.stack,
      status: error?.status,
      details: error?.details,
    })
  }
}

// Exportar instancia singleton
export const logger = new Logger()

// Exportar tipos
export type { LogLevel, LogContext }


