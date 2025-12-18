/**
 * Validadores para el módulo de chat
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Valida los parámetros para obtener mensajes
 */
export function validateGetMessagesParams(
  colaboradorId: string | null,
  remitenteId: string | null
): ValidationResult {
  if (!colaboradorId || !remitenteId) {
    return {
      valid: false,
      error: 'colaborador_id y remitente_id son requeridos',
    }
  }

  const colaboradorIdNum = parseInt(colaboradorId, 10)
  const remitenteIdNum = parseInt(remitenteId, 10)

  if (isNaN(colaboradorIdNum) || isNaN(remitenteIdNum)) {
    return {
      valid: false,
      error: 'colaborador_id y remitente_id deben ser números válidos',
    }
  }

  return { valid: true }
}

/**
 * Valida los parámetros para enviar un mensaje
 */
export function validateSendMessageParams(
  texto: string | undefined,
  colaboradorId: number | string | undefined,
  remitenteId: number | string | undefined
): ValidationResult {
  if (!texto || !colaboradorId || !remitenteId) {
    return {
      valid: false,
      error: 'texto, colaborador_id y remitente_id son requeridos',
    }
  }

  const colaboradorIdNum = parseInt(String(colaboradorId), 10)
  const remitenteIdNum = parseInt(String(remitenteId), 10)

  if (isNaN(colaboradorIdNum) || isNaN(remitenteIdNum)) {
    return {
      valid: false,
      error: 'colaborador_id y remitente_id deben ser números válidos',
    }
  }

  return { valid: true }
}
