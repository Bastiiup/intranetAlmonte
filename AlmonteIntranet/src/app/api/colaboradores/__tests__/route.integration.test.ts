/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/colaboradores
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import strapiClient from '@/lib/strapi/client'
import { PersonaService } from '@/lib/services/personaService'

// Mock del cliente de Strapi
jest.mock('@/lib/strapi/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}))

// Mock de PersonaService
jest.mock('@/lib/services/personaService', () => ({
  PersonaService: {
    createOrUpdate: jest.fn(),
  },
}))

// Mock de helpers
jest.mock('@/lib/strapi/helpers', () => ({
  extractStrapiData: jest.fn((data) => data.data || data),
  getStrapiId: jest.fn((data) => data?.id || data?.documentId || null),
  normalizeColaborador: jest.fn((data) => data),
  normalizePersona: jest.fn((data) => data),
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>
const mockPersonaService = PersonaService as jest.Mocked<typeof PersonaService>

describe('/api/colaboradores', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener colaboradores con paginación', async () => {
      const mockColaboradores = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            email_login: 'test@example.com',
            rol: 'soporte',
            activo: true,
            persona: {
              data: {
                attributes: {
                  nombre_completo: 'Juan Pérez',
                },
              },
            },
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockColaboradores,
        meta: {
          pagination: {
            page: 1,
            pageSize: 50,
            total: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/colaboradores?page=1&pageSize=50')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/colaboradores?')
      )
    })

    it('debe filtrar colaboradores por email', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/colaboradores?email=test@example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[email_login][$contains]=test@example.com')
    })

    it('debe filtrar colaboradores por estado activo', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/colaboradores?activo=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[activo][$eq]=true')
    })

    it('debe filtrar colaboradores por rol', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/colaboradores?rol=soporte')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[rol][$eq]=soporte')
    })

    it('debe manejar errores al obtener colaboradores', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/colaboradores')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('POST', () => {
    it('debe crear un nuevo colaborador', async () => {
      const mockColaborador = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            email_login: 'test@example.com',
            rol: 'soporte',
            activo: false,
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockColaborador as any)

      const request = new NextRequest('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        body: JSON.stringify({
          email_login: 'test@example.com',
          password: 'password123',
          rol: 'soporte',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creado exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/colaboradores',
        expect.objectContaining({
          data: expect.objectContaining({
            email_login: 'test@example.com',
            activo: false,
          }),
        })
      )
    })

    it('debe validar que email_login es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('email_login es obligatorio')
    })

    it('debe validar formato de email', async () => {
      const request = new NextRequest('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        body: JSON.stringify({
          email_login: 'invalid-email',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('formato válido')
    })

    it('debe validar longitud mínima de contraseña', async () => {
      const request = new NextRequest('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        body: JSON.stringify({
          email_login: 'test@example.com',
          password: '12345', // Menos de 6 caracteres
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('6 caracteres')
    })

    it('debe crear colaborador con persona usando PersonaService', async () => {
      const mockColaborador = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            email_login: 'test@example.com',
            persona: { id: 1 },
          },
        },
      }

      mockPersonaService.createOrUpdate.mockResolvedValueOnce(1)
      mockStrapiClient.post.mockResolvedValueOnce(mockColaborador as any)

      const request = new NextRequest('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        body: JSON.stringify({
          email_login: 'test@example.com',
          password: 'password123',
          persona: {
            rut: '12345678-9',
            nombres: 'Juan',
            primer_apellido: 'Pérez',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockPersonaService.createOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          rut: '12345678-9',
          nombres: 'Juan',
        })
      )
    })

    it('debe usar personaId si se proporciona', async () => {
      const mockColaborador = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            email_login: 'test@example.com',
            persona: { id: 1 },
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockColaborador as any)

      const request = new NextRequest('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        body: JSON.stringify({
          email_login: 'test@example.com',
          password: 'password123',
          persona: {
            personaId: 1,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockPersonaService.createOrUpdate).not.toHaveBeenCalled()
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/colaboradores',
        expect.objectContaining({
          data: expect.objectContaining({
            persona: 1,
          }),
        })
      )
    })

    it('debe manejar errores al crear colaborador', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        body: JSON.stringify({
          email_login: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('debe manejar errores al procesar persona', async () => {
      const error = new Error('Error al procesar persona')
      mockPersonaService.createOrUpdate.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/colaboradores', {
        method: 'POST',
        body: JSON.stringify({
          email_login: 'test@example.com',
          password: 'password123',
          persona: {
            rut: '12345678-9',
            nombres: 'Juan',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('persona')
    })
  })
})

