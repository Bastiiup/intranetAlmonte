/**
 * Pruebas unitarias para los validadores del módulo de chat
 */

import {
  validateGetMessagesParams,
  validateSendMessageParams,
} from '../validators'

describe('Chat Validators', () => {
  describe('validateGetMessagesParams', () => {
    it('debe retornar válido cuando los parámetros son correctos', () => {
      const result = validateGetMessagesParams('1', '2')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('debe retornar error cuando falta colaborador_id', () => {
      const result = validateGetMessagesParams(null, '2')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('colaborador_id y remitente_id son requeridos')
    })

    it('debe retornar error cuando falta remitente_id', () => {
      const result = validateGetMessagesParams('1', null)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('colaborador_id y remitente_id son requeridos')
    })

    it('debe retornar error cuando colaborador_id no es un número válido', () => {
      const result = validateGetMessagesParams('abc', '2')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('deben ser números válidos')
    })

    it('debe retornar error cuando remitente_id no es un número válido', () => {
      const result = validateGetMessagesParams('1', 'xyz')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('deben ser números válidos')
    })
  })

  describe('validateSendMessageParams', () => {
    it('debe retornar válido cuando todos los parámetros son correctos', () => {
      const result = validateSendMessageParams('Hola', 1, 2)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('debe retornar válido cuando los IDs son strings numéricos', () => {
      const result = validateSendMessageParams('Hola', '1', '2')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('debe retornar error cuando falta texto', () => {
      const result = validateSendMessageParams(undefined, 1, 2)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('texto, colaborador_id y remitente_id son requeridos')
    })

    it('debe retornar error cuando falta colaborador_id', () => {
      const result = validateSendMessageParams('Hola', undefined, 2)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('texto, colaborador_id y remitente_id son requeridos')
    })

    it('debe retornar error cuando falta remitente_id', () => {
      const result = validateSendMessageParams('Hola', 1, undefined)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('texto, colaborador_id y remitente_id son requeridos')
    })

    it('debe retornar error cuando colaborador_id no es un número válido', () => {
      const result = validateSendMessageParams('Hola', 'abc', 2)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('deben ser números válidos')
    })

    it('debe retornar error cuando remitente_id no es un número válido', () => {
      const result = validateSendMessageParams('Hola', 1, 'xyz')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('deben ser números válidos')
    })
  })
})

