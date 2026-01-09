/**
 * Pruebas unitarias para openfactura/client.ts
 */

// Mock de fetch
global.fetch = jest.fn()

describe('openFacturaClient', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  let openFacturaClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    // Resetear variables de entorno
    process.env.HAULMER_API_KEY = 'test-api-key'
    process.env.HAULMER_API_URL = 'https://api.openfactura.cl'
    process.env.OPENFACTURA_API_KEY = 'test-api-key'
    process.env.OPENFACTURA_API_URL = 'https://api.openfactura.cl'
    
    // Re-importar el módulo para que tome las nuevas variables de entorno
    jest.resetModules()
    openFacturaClient = require('../client').default
  })

  afterEach(() => {
    delete process.env.HAULMER_API_KEY
    delete process.env.HAULMER_API_URL
    delete process.env.OPENFACTURA_API_KEY
    delete process.env.OPENFACTURA_API_URL
  })

  describe('post', () => {
    it('debe hacer POST request con datos correctos', async () => {
      const mockResponse = {
        success: true,
        data: { folio: 123, documento_id: 'doc-123' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response)

      const result = await openFacturaClient.post('/v1/dte/emitir', {
        tipo: 'boleta',
        fecha: '2024-01-01',
        receptor: { rut: '12345678-9' },
        items: [],
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openfactura.cl/v1/dte/emitir',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
            'X-API-Key': 'test-api-key',
          }),
          body: expect.stringContaining('"tipo":"boleta"'),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('debe lanzar error si la respuesta no es ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid data' }),
      } as Response)

      await expect(
        openFacturaClient.post('/v1/dte/emitir', {})
      ).rejects.toThrow()
    })

    it('debe lanzar error si no hay API key', async () => {
      // Limpiar variables de entorno y re-importar
      delete process.env.OPENFACTURA_API_KEY
      delete process.env.HAULMER_API_KEY
      jest.resetModules()
      const clientWithoutKey = require('../client').default

      await expect(
        clientWithoutKey.post('/v1/dte/emitir', {})
      ).rejects.toThrow('Haulmer API Key no configurada')
    })
  })

  describe('get', () => {
    it('debe hacer GET request con parámetros de query', async () => {
      const mockResponse = {
        success: true,
        data: { folio: 123, estado: 'emitido' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response)

      const result = await openFacturaClient.get('/v1/dte/consultar', {
        folio: '123',
        tipo: 'boleta',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callUrl = (mockFetch.mock.calls[0][0] as string)
      expect(callUrl).toContain('https://api.openfactura.cl/v1/dte/consultar')
      expect(callUrl).toContain('folio=123')
      expect(callUrl).toContain('tipo=boleta')
      expect(result).toEqual(mockResponse)
    })

    it('debe hacer GET request sin parámetros', async () => {
      const mockResponse = { success: true, data: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response)

      const result = await openFacturaClient.get('/v1/dte/listar')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callUrl = (mockFetch.mock.calls[0][0] as string)
      expect(callUrl).toBe('https://api.openfactura.cl/v1/dte/listar')
      expect(result).toEqual(mockResponse)
    })
  })
})
