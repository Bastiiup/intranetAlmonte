import { NextResponse } from 'next/server'

/**
 * Error personalizado para errores de Strapi
 */
export class StrapiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'StrapiError'
    // Mantener el stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StrapiError)
    }
  }

  /**
   * Crea un StrapiError desde una respuesta de error de Strapi
   */
  static fromResponse(error: any): StrapiError {
    const message = error.message || error.error?.message || 'Error desconocido'
    const status = error.status || error.error?.status || 500
    const details = error.details || error.error?.details

    return new StrapiError(message, status, details)
  }

  /**
   * Crea un StrapiError desde un error de fetch/HTTP
   */
  static fromHttpError(error: any, defaultMessage: string = 'Error al comunicarse con Strapi'): StrapiError {
    if (error instanceof StrapiError) {
      return error
    }

    const message = error.message || defaultMessage
    const status = error.status || 500
    const details = error.details || error.response?.data

    return new StrapiError(message, status, details)
  }
}


