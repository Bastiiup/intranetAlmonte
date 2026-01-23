/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/crm/empresas
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

describe('/api/crm/empresas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener empresas desde Strapi con paginación', async () => {
      const mockEmpresas = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            empresa_nombre: 'Empresa Test',
            razon_social: 'Empresa Test S.A.',
            rut: '12345678-9',
            estado: 'activa',
            comuna: { data: null },
            telefonos: [],
            emails: [],
            direcciones: [],
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockEmpresas,
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            total: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas?page=1&pageSize=25')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/empresas?')
      )
    })

    it('debe filtrar empresas por búsqueda', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas?search=Test')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[$or][0][empresa_nombre][$containsi]=Test')
    })

    it('debe filtrar empresas por estado', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas?estado=activa')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[estado][$eq]=activa')
    })

    it('debe filtrar empresas por región', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas?region=Metropolitana')
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
      const request = new NextRequest('http://localhost:3000/api/crm/empresas')
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

      const request = new NextRequest('http://localhost:3000/api/crm/empresas')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('autenticación')
    })
  })

  describe('POST', () => {
    it('debe crear una nueva empresa', async () => {
      const mockEmpresa = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            empresa_nombre: 'Empresa Test',
            razon_social: 'Empresa Test S.A.',
            rut: '12345678-9',
            slug: 'empresa-test',
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockEmpresa as any)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas', {
        method: 'POST',
        body: JSON.stringify({
          empresa_nombre: 'Empresa Test',
          razon_social: 'Empresa Test S.A.',
          rut: '12345678-9',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creada exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/empresas',
        expect.objectContaining({
          data: expect.objectContaining({
            empresa_nombre: 'Empresa Test',
            razon_social: 'Empresa Test S.A.',
          }),
        })
      )
    })

    it('debe validar que el nombre de empresa es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/crm/empresas', {
        method: 'POST',
        body: JSON.stringify({
          razon_social: 'Empresa Test S.A.',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('nombre de la empresa es obligatorio')
    })

    it('debe generar slug automáticamente desde el nombre', async () => {
      const mockEmpresa = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            empresa_nombre: 'Mi Empresa',
            slug: 'mi-empresa',
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockEmpresa as any)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas', {
        method: 'POST',
        body: JSON.stringify({
          empresa_nombre: 'Mi Empresa',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/empresas',
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.any(String),
          }),
        })
      )
    })

    it('debe crear empresa con telefonos y emails', async () => {
      const mockEmpresa = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            empresa_nombre: 'Empresa Test',
            telefonos: [{ telefono_raw: '+56912345678', principal: true }],
            emails: [{ email: 'contacto@empresa.com', principal: true }],
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockEmpresa as any)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas', {
        method: 'POST',
        body: JSON.stringify({
          empresa_nombre: 'Empresa Test',
          telefonos: [{ telefono_raw: '+56912345678', principal: true }],
          emails: [{ email: 'contacto@empresa.com', principal: true }],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/empresas',
        expect.objectContaining({
          data: expect.objectContaining({
            telefonos: expect.arrayContaining([
              expect.objectContaining({
                telefono_raw: '+56912345678',
              }),
            ]),
            emails: expect.arrayContaining([
              expect.objectContaining({
                email: 'contacto@empresa.com',
              }),
            ]),
          }),
        })
      )
    })

    it('debe crear empresa con datos de facturación', async () => {
      const mockEmpresa = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            empresa_nombre: 'Empresa Test',
            datos_facturacion: {
              first_name: 'Juan',
              last_name: 'Pérez',
              email: 'facturacion@empresa.com',
              country: 'CL',
            },
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockEmpresa as any)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas', {
        method: 'POST',
        body: JSON.stringify({
          empresa_nombre: 'Empresa Test',
          datos_facturacion: {
            first_name: 'Juan',
            last_name: 'Pérez',
            email: 'facturacion@empresa.com',
            country: 'CL',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/empresas',
        expect.objectContaining({
          data: expect.objectContaining({
            datos_facturacion: expect.objectContaining({
              first_name: 'Juan',
              last_name: 'Pérez',
            }),
          }),
        })
      )
    })

    it('debe manejar errores al crear empresa', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500
      error.details = { errors: [{ message: 'Error interno', path: ['empresa_nombre'] }] }

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/empresas', {
        method: 'POST',
        body: JSON.stringify({
          empresa_nombre: 'Empresa Test',
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

