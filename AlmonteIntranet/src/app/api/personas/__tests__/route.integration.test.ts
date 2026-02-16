/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/personas
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

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>

describe('/api/personas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener personas con paginación', async () => {
      const mockPersonas = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            rut: '12345678-9',
            nombres: 'Juan',
            primer_apellido: 'Pérez',
            nombre_completo: 'Juan Pérez',
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockPersonas,
        meta: {
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/personas?page=1&pageSize=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/personas?')
      )
    })

    it('debe filtrar personas por RUT', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 10, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/personas?filters[rut][$eq]=12345678-9')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[rut][$eq]=12345678-9')
    })

    it('debe manejar errores al obtener personas', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/personas')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('POST', () => {
    it('debe crear una nueva persona', async () => {
      const mockPersona = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            rut: '12345678-9',
            nombres: 'Juan',
            primer_apellido: 'Pérez',
            nombre_completo: 'Juan Pérez',
            origen: 'manual',
            activo: true,
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockPersona as any)

      const request = new NextRequest('http://localhost:3000/api/personas', {
        method: 'POST',
        body: JSON.stringify({
          rut: '12345678-9',
          nombres: 'Juan',
          primer_apellido: 'Pérez',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creada exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/personas',
        expect.objectContaining({
          data: expect.objectContaining({
            nombres: 'Juan',
            primer_apellido: 'Pérez',
            origen: 'manual',
            activo: true,
          }),
        })
      )
    })

    it('debe crear persona con todos los campos opcionales', async () => {
      const mockPersona = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            rut: '12345678-9',
            nombres: 'Juan',
            primer_apellido: 'Pérez',
            segundo_apellido: 'González',
            nombre_completo: 'Juan Pérez González',
            genero: 'M',
            cumpleagno: '1990-01-01',
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockPersona as any)

      const request = new NextRequest('http://localhost:3000/api/personas', {
        method: 'POST',
        body: JSON.stringify({
          rut: '12345678-9',
          nombres: 'Juan',
          primer_apellido: 'Pérez',
          segundo_apellido: 'González',
          nombre_completo: 'Juan Pérez González',
          genero: 'M',
          cumpleagno: '1990-01-01',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/personas',
        expect.objectContaining({
          data: expect.objectContaining({
            segundo_apellido: 'González',
            genero: 'M',
            cumpleagno: '1990-01-01',
          }),
        })
      )
    })

    it('debe manejar errores al crear persona', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500
      error.details = { errors: [{ message: 'Error interno' }] }

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/personas', {
        method: 'POST',
        body: JSON.stringify({
          nombres: 'Juan',
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

