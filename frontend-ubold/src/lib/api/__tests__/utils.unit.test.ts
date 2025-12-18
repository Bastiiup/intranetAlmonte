/**
 * Pruebas unitarias para utilidades comunes de API
 */

import { createSuccessResponse, createErrorResponse, extractStrapiData } from '../utils'

describe('API Utils', () => {
  describe('createSuccessResponse', () => {
    it('debe crear una respuesta de éxito con datos', async () => {
      const data = { id: 1, name: 'Test' }
      const response = createSuccessResponse(data)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data).toEqual(data)
    })

    it('debe incluir meta cuando se proporciona', async () => {
      const data = { id: 1 }
      const meta = { total: 10 }
      const response = createSuccessResponse(data, meta)

      const body = await response.json()
      expect(body.meta).toEqual(meta)
    })

    it('debe permitir cambiar el status code', () => {
      const response = createSuccessResponse({}, undefined, 201)
      expect(response.status).toBe(201)
    })
  })

  describe('createErrorResponse', () => {
    it('debe crear una respuesta de error', async () => {
      const response = createErrorResponse('Error de prueba', 400)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Error de prueba')
    })

    it('debe incluir details cuando se proporciona', async () => {
      const details = { field: 'email' }
      const response = createErrorResponse('Error', 400, details)

      const body = await response.json()
      expect(body.details).toEqual(details)
    })

    it('debe usar status 500 por defecto', () => {
      const response = createErrorResponse('Error')
      expect(response.status).toBe(500)
    })
  })

  describe('extractStrapiData', () => {
    it('debe extraer datos de un array', () => {
      const data = [{ id: 1 }, { id: 2 }]
      const result = extractStrapiData(data)
      expect(result).toEqual(data)
    })

    it('debe extraer datos de response.data array', () => {
      const response = { data: [{ id: 1 }, { id: 2 }] }
      const result = extractStrapiData(response)
      expect(result).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('debe extraer datos de response.data objeto único', () => {
      const response = { data: { id: 1 } }
      const result = extractStrapiData(response)
      expect(result).toEqual([{ id: 1 }])
    })

    it('debe extraer datos de objeto único', () => {
      const response = { id: 1 }
      const result = extractStrapiData(response)
      expect(result).toEqual([{ id: 1 }])
    })

    it('debe retornar array vacío cuando no hay datos', () => {
      expect(extractStrapiData(null)).toEqual([])
      expect(extractStrapiData(undefined)).toEqual([])
    })
  })
})

