/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/crm/colegios
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import strapiClient from '@/lib/strapi/client'

// Mock del cliente de Strapi
jest.mock('@/lib/strapi/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

// Mock de next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Mock de configuración de Strapi
jest.mock('@/lib/strapi/config', () => ({
  STRAPI_API_TOKEN: 'test-token',
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>

describe('/api/crm/colegios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener colegios desde Strapi con paginación', async () => {
      const mockColegios = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            colegio_nombre: 'Colegio Test',
            rbd: 12345,
            estado: 'Verificado',
            dependencia: 'Particular',
            comuna: { data: null },
            telefonos: [],
            emails: [],
            direcciones: [],
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockColegios,
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            total: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios?page=1&pageSize=25')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/colegios?')
      )
    })

    it('debe filtrar colegios por búsqueda de nombre', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios?search=Colegio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verificar que la URL contiene el filtro (puede estar codificado)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[colegio_nombre][$containsi]=Colegio')
    })

    it('debe filtrar colegios por búsqueda de RBD numérico', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios?search=12345')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[$or][1][rbd][$eq]=12345')
    })

    it('debe filtrar colegios por estado', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios?estado=Verificado')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[estado][$eq]=Verificado')
    })

    it('debe filtrar colegios por región', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios?region=Metropolitana')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[region][$eq]=Metropolitana')
    })

    it('debe retornar error si no hay token de Strapi', async () => {
      jest.resetModules()
      jest.doMock('@/lib/strapi/config', () => ({
        STRAPI_API_TOKEN: null,
      }))

      const { GET: GETWithoutToken } = await import('../route')
      const request = new NextRequest('http://localhost:3000/api/crm/colegios')
      const response = await GETWithoutToken(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Token de Strapi no configurado')
    })

    it('debe manejar errores de autenticación', async () => {
      const authError: any = new Error('Unauthorized')
      authError.status = 401

      mockStrapiClient.get.mockRejectedValueOnce(authError)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('autenticación')
    })
  })

  describe('POST', () => {
    it('debe crear un nuevo colegio', async () => {
      const mockColegio = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            colegio_nombre: 'Colegio Test',
            rbd: 12345,
            estado: 'Por Verificar',
            dependencia: 'Particular',
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockColegio as any)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios', {
        method: 'POST',
        body: JSON.stringify({
          colegio_nombre: 'Colegio Test',
          rbd: 12345,
          dependencia: 'Particular',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creado exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/colegios',
        expect.objectContaining({
          data: expect.objectContaining({
            colegio_nombre: 'Colegio Test',
            rbd: 12345,
          }),
        })
      )
    })

    it('debe validar que el nombre del colegio es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/crm/colegios', {
        method: 'POST',
        body: JSON.stringify({
          rbd: 12345,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('nombre del colegio es obligatorio')
    })

    it('debe validar que el RBD es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/crm/colegios', {
        method: 'POST',
        body: JSON.stringify({
          colegio_nombre: 'Colegio Test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('RBD es obligatorio')
    })

    it('debe validar que el RBD es un número válido', async () => {
      const request = new NextRequest('http://localhost:3000/api/crm/colegios', {
        method: 'POST',
        body: JSON.stringify({
          colegio_nombre: 'Colegio Test',
          rbd: 'no-es-numero',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('RBD debe ser un número válido')
    })

    it('debe crear colegio con telefonos y emails', async () => {
      const mockColegio = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            colegio_nombre: 'Colegio Test',
            rbd: 12345,
            telefonos: [{ telefono_raw: '+56912345678', principal: true }],
            emails: [{ email: 'contacto@colegio.com', principal: true }],
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockColegio as any)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios', {
        method: 'POST',
        body: JSON.stringify({
          colegio_nombre: 'Colegio Test',
          rbd: 12345,
          telefonos: [{ telefono_raw: '+56912345678', principal: true }],
          emails: [{ email: 'contacto@colegio.com', principal: true }],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/colegios',
        expect.objectContaining({
          data: expect.objectContaining({
            telefonos: expect.arrayContaining([
              expect.objectContaining({
                telefono_raw: '+56912345678',
              }),
            ]),
            emails: expect.arrayContaining([
              expect.objectContaining({
                email: 'contacto@colegio.com',
              }),
            ]),
          }),
        })
      )
    })

    it('debe manejar error de RBD duplicado', async () => {
      const error: any = new Error('RBD duplicado')
      error.status = 400
      error.details = {
        errors: [
          {
            message: 'unique',
            path: ['rbd'],
            value: 12345,
          },
        ],
      }

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios', {
        method: 'POST',
        body: JSON.stringify({
          colegio_nombre: 'Colegio Test',
          rbd: 12345,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('RBD')
      expect(data.error).toContain('ya existe')
    })

    it('debe manejar errores al crear colegio', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500
      error.details = { errors: [{ message: 'Error interno', path: ['colegio_nombre'] }] }

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/colegios', {
        method: 'POST',
        body: JSON.stringify({
          colegio_nombre: 'Colegio Test',
          rbd: 12345,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
})

