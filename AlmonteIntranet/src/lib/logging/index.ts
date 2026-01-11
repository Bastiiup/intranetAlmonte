/**
 * Módulo de logging
 * Exporta todas las funciones necesarias para registrar actividades y logging general
 */

// Sistema de logging de actividades (Strapi)
export {
  logActivity,
  getUserFromRequest,
  getClientIP,
  getUserAgent,
  createLogDescription,
  type AccionType,
  type LogActivityParams,
} from './service'

// Sistema de logging general con niveles configurables
export { logger, type LogLevel, type LogContext } from './logger'

