/**
 * Pruebas de integración para /api/persona-trayectorias
 */

import { NextRequest } from 'next/server'
import { POST } from '../route'
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

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>

describe('/api/persona-trayectorias', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('debe crear una trayectoria con datos válidos', async () => {
      const mockTrayectoria = {
        id: 1,
        documentId: 'doc123',
        attributes: {
          persona: { id: 1 },
          colegio: { id: 1 },
          cargo: 'Profesor',
          is_current: true,
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce({
        data: mockTrayectoria,
      } as any)

      const requestBody = {
        data: {
          persona: { connect: [1] },
          colegio: { connect: [1] },
          cargo: 'Profesor',
          is_current: true,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/persona-trayectorias', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/persona-trayectorias',
        expect.objectContaining({
          data: expect.objectContaining({
            persona: { connect: [1] },
            colegio: { connect: [1] },
            cargo: 'Profesor',
            is_current: true,
          }),
        })
      )
    })

    it('debe rechazar trayectoria sin persona', async () => {
      const requestBody = {
        data: {
          colegio: { connect: [1] },
          cargo: 'Profesor',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/persona-trayectorias', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toContain('persona')
    })

    it('debe rechazar trayectoria sin colegio', async () => {
      const requestBody = {
        data: {
          persona: { connect: [1] },
          cargo: 'Profesor',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/persona-trayectorias', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toContain('colegio')
    })

    it('debe eliminar el campo activo si viene en el body', async () => {
      const mockTrayectoria = {
        id: 1,
        documentId: 'doc123',
        attributes: {
          persona: { id: 1 },
          colegio: { id: 1 },
          cargo: 'Profesor',
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce({
        data: mockTrayectoria,
      } as any)

      const requestBody = {
        data: {
          persona: { connect: [1] },
          colegio: { connect: [1] },
          cargo: 'Profesor',
          activo: true, // ⚠️ Campo que NO debe enviarse a Strapi
        },
      }

      const request = new NextRequest('http://localhost:3000/api/persona-trayectorias', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      
      // Verificar que el campo activo NO se envió a Strapi
      const callArgs = mockStrapiClient.post.mock.calls[0]
      const payloadEnviado = callArgs[1] as any
      expect(payloadEnviado.data).not.toHaveProperty('activo')
    })

    it('debe eliminar campos prohibidos como region, comuna, dependencia', async () => {
      const mockTrayectoria = {
        id: 1,
        documentId: 'doc123',
        attributes: {
          persona: { id: 1 },
          colegio: { id: 1 },
          cargo: 'Profesor',
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce({
        data: mockTrayectoria,
      } as any)

      const requestBody = {
        data: {
          persona: { connect: [1] },
          colegio: { connect: [1] },
          cargo: 'Profesor',
          region: 'Metropolitana', // Campo prohibido
          comuna: 'Santiago', // Campo prohibido
          dependencia: 'Particular', // Campo prohibido
        },
      }

      const request = new NextRequest('http://localhost:3000/api/persona-trayectorias', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      
      // Verificar que los campos prohibidos NO se enviaron a Strapi
      const callArgs = mockStrapiClient.post.mock.calls[0]
      const payloadEnviado = callArgs[1] as any
      expect(payloadEnviado.data).not.toHaveProperty('region')
      expect(payloadEnviado.data).not.toHaveProperty('comuna')
      expect(payloadEnviado.data).not.toHaveProperty('dependencia')
    })

    it('debe rechazar request sin data', async () => {
      const requestBody = {}

      const request = new NextRequest('http://localhost:3000/api/persona-trayectorias', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toContain('requeridos')
    })
  })
})

