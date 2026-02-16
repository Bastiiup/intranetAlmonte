/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/tienda/clientes
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import strapiClient from '@/lib/strapi/client'
import { createOrUpdateClienteEnWooCommerce } from '@/lib/clientes/utils'

// Mock del cliente de Strapi
jest.mock('@/lib/strapi/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}))

// Mock de clientes/utils
jest.mock('@/lib/clientes/utils', () => ({
  parseNombreCompleto: jest.fn((nombre) => ({
    nombres: nombre.split(' ')[0],
    apellidos: nombre.split(' ').slice(1).join(' '),
  })),
  createOrUpdateClienteEnWooCommerce: jest.fn(() => Promise.resolve({ success: true, data: { id: 1 } })),
}))

// Mock de configuración de Strapi
jest.mock('@/lib/strapi/config', () => ({
  STRAPI_API_TOKEN: 'test-token',
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>
const mockCreateOrUpdateCliente = createOrUpdateClienteEnWooCommerce as jest.MockedFunction<typeof createOrUpdateClienteEnWooCommerce>

describe('/api/tienda/clientes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Restaurar variables de entorno
    process.env.STRAPI_API_TOKEN = 'test-token'
  })

  describe('GET', () => {
    it('debe obtener clientes desde Strapi', async () => {
      const mockClientes = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Cliente Test',
            correo_electronico: 'cliente@example.com',
            persona: {
              data: {
                attributes: {
                  nombre_completo: 'Cliente Test',
                  rut: '12345678-9',
                },
              },
            },
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockClientes,
        meta: {
          pagination: {
            page: 1,
            pageSize: 1000,
            total: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/clientes')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/wo-clientes?')
      )
    })

    it('debe manejar error cuando no hay token', async () => {
      process.env.STRAPI_API_TOKEN = undefined

      const request = new NextRequest('http://localhost:3000/api/tienda/clientes')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('STRAPI_API_TOKEN')
    })

    it('debe manejar error 502 Bad Gateway', async () => {
      const error: any = new Error('Bad Gateway')
      error.status = 502

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/tienda/clientes')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.success).toBe(false)
      expect(data.error).toContain('502')
    })
  })

  describe('POST', () => {
    it('debe crear un nuevo cliente', async () => {
      const mockPersona = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Cliente Test',
            rut: '12345678-9',
          },
        },
      }

      const mockWOCliente = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Cliente Test',
            correo_electronico: 'cliente@example.com',
          },
        },
      }

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
      } as any)
      mockStrapiClient.post
        .mockResolvedValueOnce(mockPersona as any)
        .mockResolvedValueOnce(mockWOCliente as any)
      mockCreateOrUpdateCliente.mockResolvedValueOnce({
        success: true,
        data: { id: 1 },
      })

      const request = new NextRequest('http://localhost:3000/api/tienda/clientes', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: {
              nombre_completo: 'Cliente Test',
              rut: '12345678-9',
              emails: [{ email: 'cliente@example.com', tipo: 'Personal' }],
            },
            canales: ['woo_escolar'],
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creado exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledTimes(2) // Persona y WO-Cliente
    })

    it('debe validar que nombre_completo es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/tienda/clientes', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: {
              rut: '12345678-9',
              emails: [{ email: 'cliente@example.com' }],
            },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('nombre completo')
    })

    it('debe validar que RUT es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/tienda/clientes', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: {
              nombre_completo: 'Cliente Test',
              emails: [{ email: 'cliente@example.com' }],
            },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('RUT es obligatorio')
    })

    it('debe validar que email es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/tienda/clientes', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: {
              nombre_completo: 'Cliente Test',
              rut: '12345678-9',
            },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('correo electrónico')
    })

    it('debe validar que RUT no exista ya', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            attributes: {
              rut: '12345678-9',
            },
          },
        ],
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/clientes', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: {
              nombre_completo: 'Cliente Test',
              rut: '12345678-9',
              emails: [{ email: 'cliente@example.com', tipo: 'Personal' }],
            },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('ya está registrado')
    })

    it('debe crear cliente y enviar a WordPress', async () => {
      const mockPersona = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Cliente Test',
            rut: '12345678-9',
          },
        },
      }

      const mockWOCliente = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Cliente Test',
            correo_electronico: 'cliente@example.com',
          },
        },
      }

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
      } as any)
      mockStrapiClient.post
        .mockResolvedValueOnce(mockPersona as any)
        .mockResolvedValueOnce(mockWOCliente as any)
      mockCreateOrUpdateCliente.mockResolvedValueOnce({
        success: true,
        data: { id: 1 },
      })

      const request = new NextRequest('http://localhost:3000/api/tienda/clientes', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: {
              nombre_completo: 'Cliente Test',
              rut: '12345678-9',
              emails: [{ email: 'cliente@example.com', tipo: 'Personal' }],
            },
            canales: ['woo_escolar'],
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.wordpress).toBeDefined()
      expect(mockCreateOrUpdateCliente).toHaveBeenCalled()
    })

    it('debe crear WO-Clientes para múltiples plataformas', async () => {
      const mockPersona = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Cliente Test',
            rut: '12345678-9',
          },
        },
      }

      const mockWOClienteEscolar = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Cliente Test',
            originPlatform: 'woo_escolar',
          },
        },
      }

      const mockWOClienteMoraleja = {
        data: {
          id: 2,
          documentId: 'doc2',
          attributes: {
            nombre: 'Cliente Test',
            originPlatform: 'woo_moraleja',
          },
        },
      }

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
      } as any)
      mockStrapiClient.post
        .mockResolvedValueOnce(mockPersona as any)
        .mockResolvedValueOnce(mockWOClienteEscolar as any)
        .mockResolvedValueOnce(mockWOClienteMoraleja as any)
      mockCreateOrUpdateCliente
        .mockResolvedValueOnce({ success: true, data: { id: 1 } })
        .mockResolvedValueOnce({ success: true, data: { id: 2 } })

      const request = new NextRequest('http://localhost:3000/api/tienda/clientes', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: {
              nombre_completo: 'Cliente Test',
              rut: '12345678-9',
              emails: [{ email: 'cliente@example.com', tipo: 'Personal' }],
            },
            canales: ['woo_escolar', 'woo_moraleja'],
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledTimes(3) // Persona + 2 WO-Clientes
      expect(data.message).toContain('Entradas WO-Clientes creadas: 2')
    })

    it('debe manejar errores al crear cliente', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
      } as any)
      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/tienda/clientes', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            persona: {
              nombre_completo: 'Cliente Test',
              rut: '12345678-9',
              emails: [{ email: 'cliente@example.com', tipo: 'Personal' }],
            },
          },
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

