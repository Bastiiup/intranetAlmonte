/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/crm/activities
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
  },
}))

// Mock de next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>

describe('/api/crm/activities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener actividades con paginación', async () => {
      const mockActividades = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            tipo: 'llamada',
            titulo: 'Llamada de seguimiento',
            descripcion: 'Llamada realizada',
            fecha: '2024-01-15',
            estado: 'completada',
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockActividades,
        meta: {
          pagination: {
            page: 1,
            pageSize: 50,
            total: 1,
            pageCount: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/activities?page=1&pageSize=50')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/actividades?')
      )
    })

    it('debe filtrar actividades por tipo', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/activities?tipo=llamada')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[tipo][$eq]=llamada')
    })

    it('debe filtrar actividades por estado', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/activities?estado=completada')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[estado][$eq]=completada')
    })

    it('debe filtrar actividades por relación con contacto', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/activities?relacionado_con=contacto&relacionado_id=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[relacionado_con_contacto][id][$eq]=1')
    })

    it('debe buscar actividades por título o descripción', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/activities?search=seguimiento')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[$or][0][titulo][$containsi]=seguimiento')
    })

    it('debe manejar error cuando Strapi está caído', async () => {
      const error: any = new Error('Bad Gateway')
      error.status = 502

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/activities')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Strapi no responde')
    })

    it('debe manejar error cuando content-type no existe', async () => {
      const error: any = new Error('Not Found')
      error.status = 404

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/activities')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toContain('Content-type')
    })

    it('debe manejar error de permisos', async () => {
      const error: any = new Error('Forbidden')
      error.status = 403

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/activities')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toContain('permisos')
    })
  })

  describe('POST', () => {
    it('debe crear una nueva actividad', async () => {
      const mockActividad = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            titulo: 'Nueva actividad',
            tipo: 'nota',
            estado: 'pendiente',
            fecha: new Date().toISOString(),
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockActividad as any)

      const request = new NextRequest('http://localhost:3000/api/crm/activities', {
        method: 'POST',
        body: JSON.stringify({
          titulo: 'Nueva actividad',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creada exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/actividades',
        expect.objectContaining({
          data: expect.objectContaining({
            titulo: 'Nueva actividad',
          }),
        })
      )
    })

    it('debe validar que el título es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/crm/activities', {
        method: 'POST',
        body: JSON.stringify({
          descripcion: 'Descripción sin título',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('título')
    })

    it('debe crear actividad con relación a contacto', async () => {
      const mockActividad = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            titulo: 'Llamada a contacto',
            relacionado_con_contacto: { id: 1 },
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockActividad as any)

      const request = new NextRequest('http://localhost:3000/api/crm/activities', {
        method: 'POST',
        body: JSON.stringify({
          titulo: 'Llamada a contacto',
          relacionado_con_contacto: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/actividades',
        expect.objectContaining({
          data: expect.objectContaining({
            relacionado_con_contacto: 1,
          }),
        })
      )
    })

    it('debe manejar errores al crear actividad', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/activities', {
        method: 'POST',
        body: JSON.stringify({
          titulo: 'Nueva actividad',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('debe manejar error de validación', async () => {
      const error: any = new Error('ValidationError')
      error.status = 400
      error.details = {
        errors: [{ message: 'Campo requerido' }],
      }

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/activities', {
        method: 'POST',
        body: JSON.stringify({
          titulo: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})

