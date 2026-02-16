/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/auth/login
 */

import { NextRequest } from 'next/server'
import { POST } from '../route'
import strapiClient from '@/lib/strapi/client'
import { getStrapiUrl } from '@/lib/strapi/config'

// Mock del cliente de Strapi
jest.mock('@/lib/strapi/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

// Mock de configuración de Strapi
jest.mock('@/lib/strapi/config', () => ({
  getStrapiUrl: jest.fn((path: string) => `http://localhost:1337${path}`),
}))

// Mock de logging
jest.mock('@/lib/logging', () => ({
  logActivity: jest.fn(() => Promise.resolve()),
  createLogDescription: jest.fn((action, entity, id, description) => description),
}))

// Mock de helpers
jest.mock('@/lib/strapi/helpers', () => ({
  extractStrapiData: jest.fn((data) => data.data || data),
  getStrapiId: jest.fn((data) => data?.id || data?.documentId || null),
  normalizeColaborador: jest.fn((data) => data),
  normalizePersona: jest.fn((data) => data),
}))

// Mock global fetch
global.fetch = jest.fn()

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('debe validar que email y password son requeridos', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('requeridos')
    })

    it('debe validar que email es requerido', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password: 'password123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('requeridos')
    })

    it('debe validar que password es requerido', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('requeridos')
    })

    it('debe realizar login exitoso', async () => {
      const mockLoginResponse = {
        jwt: 'test-jwt-token',
        usuario: { id: 1, email: 'test@example.com' },
        colaborador: {
          id: 1,
          documentId: 'doc1',
          email_login: 'test@example.com',
          rol: 'soporte',
          activo: true,
        },
      }

      const mockColaboradorResponse = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            email_login: 'test@example.com',
            persona: {
              data: {
                id: 1,
                attributes: {
                  rut: '12345678-9',
                  nombres: 'Juan',
                  nombre_completo: 'Juan Pérez',
                },
              },
            },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      } as Response)

      mockStrapiClient.get.mockResolvedValueOnce(mockColaboradorResponse as any)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('exitoso')
      expect(data.jwt).toBe('test-jwt-token')
      expect(data.colaborador).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/colaboradores/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email_login: 'test@example.com',
            password: 'password123',
          }),
        })
      )
    })

    it('debe manejar error de credenciales incorrectas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid credentials' },
        }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBeDefined()
      expect(data.originalError).toBeDefined()
    })

    it('debe manejar error cuando colaborador no tiene contraseña configurada', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'No se ha configurado una contraseña para este colaborador' },
        }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('contraseña configurada')
    })

    it('debe manejar error cuando colaborador no existe', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: { message: 'Colaborador not found' },
        }),
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('encontró')
    })

    it('debe establecer cookies después de login exitoso', async () => {
      const mockLoginResponse = {
        jwt: 'test-jwt-token',
        usuario: { id: 1, email: 'test@example.com' },
        colaborador: {
          id: 1,
          documentId: 'doc1',
          email_login: 'test@example.com',
          rol: 'soporte',
          activo: true,
        },
      }

      const mockColaboradorResponse = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            email_login: 'test@example.com',
            persona: {
              data: {
                id: 1,
                attributes: {
                  rut: '12345678-9',
                  nombres: 'Juan',
                  nombre_completo: 'Juan Pérez',
                },
              },
            },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      } as Response)

      mockStrapiClient.get.mockResolvedValueOnce(mockColaboradorResponse as any)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      // Verificar que las cookies se establecieron
      const cookies = response.headers.get('set-cookie')
      expect(cookies).toBeDefined()
    })

    it('debe manejar errores al obtener datos del colaborador', async () => {
      const mockLoginResponse = {
        jwt: 'test-jwt-token',
        usuario: { id: 1, email: 'test@example.com' },
        colaborador: {
          id: 1,
          email_login: 'test@example.com',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      } as Response)

      mockStrapiClient.get.mockRejectedValueOnce(new Error('Error al obtener colaborador'))

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Debe continuar aunque falle la obtención de persona
      expect(response.status).toBe(200)
      expect(data.colaborador).toBeDefined()
    })
  })
})

