/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/crm/oportunidades
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import strapiClient from '@/lib/strapi/client'
import { createActivity, getColaboradorIdFromRequest } from '@/lib/crm/activity-helper'

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

// Mock de activity-helper
jest.mock('@/lib/crm/activity-helper', () => ({
  createActivity: jest.fn(() => Promise.resolve()),
  getColaboradorIdFromRequest: jest.fn(() => Promise.resolve(1)),
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>
const mockCreateActivity = createActivity as jest.MockedFunction<typeof createActivity>
const mockGetColaboradorId = getColaboradorIdFromRequest as jest.MockedFunction<typeof getColaboradorIdFromRequest>

describe('/api/crm/oportunidades', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener oportunidades con paginación', async () => {
      const mockOportunidades = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Oportunidad Test',
            descripcion: 'Descripción',
            monto: 50000,
            etapa: 'Qualification',
            estado: 'open',
            prioridad: 'high',
            activo: true,
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockOportunidades,
        meta: {
          pagination: {
            page: 1,
            pageSize: 50,
            total: 1,
            pageCount: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades?page=1&pageSize=50')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/oportunidades?')
      )
    })

    it('debe filtrar oportunidades por búsqueda', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades?search=Test')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[$or][0][nombre][$containsi]=Test')
    })

    it('debe filtrar oportunidades por etapa', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades?stage=Qualification')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[etapa][$eq]=Qualification')
    })

    it('debe filtrar oportunidades por estado', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades?status=open')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[estado][$eq]=open')
    })

    it('debe filtrar oportunidades por prioridad', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades?priority=high')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[prioridad][$eq]=high')
    })

    it('debe manejar error cuando content-type no existe', async () => {
      const error: any = new Error('Not Found')
      error.status = 404

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Oportunidad')
    })
  })

  describe('POST', () => {
    it('debe crear una nueva oportunidad', async () => {
      const mockOportunidad = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Oportunidad Test',
            descripcion: 'Descripción',
            monto: 50000,
            moneda: 'CLP',
            etapa: 'Qualification',
            estado: 'open',
            prioridad: 'high',
            activo: true,
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockOportunidad as any)
      mockGetColaboradorId.mockResolvedValueOnce(1)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Oportunidad Test',
          descripcion: 'Descripción',
          monto: 50000,
          moneda: 'CLP',
          etapa: 'Qualification',
          estado: 'open',
          prioridad: 'high',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creada exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/oportunidades',
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: 'Oportunidad Test',
            monto: 50000,
          }),
        })
      )
    })

    it('debe validar que el nombre es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades', {
        method: 'POST',
        body: JSON.stringify({
          descripcion: 'Descripción',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('nombre de la oportunidad es obligatorio')
    })

    it('debe crear oportunidad con relaciones', async () => {
      const mockOportunidad = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Oportunidad Test',
            contacto: { id: 1 },
            propietario: { id: 1 },
            producto: { id: 1 },
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockOportunidad as any)
      mockGetColaboradorId.mockResolvedValueOnce(1)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Oportunidad Test',
          contacto: 1,
          propietario: 1,
          producto: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/oportunidades',
        expect.objectContaining({
          data: expect.objectContaining({
            contacto: expect.any(Number),
            propietario: expect.any(Number),
            producto: expect.any(Number),
          }),
        })
      )
    })

    it('debe crear actividad automáticamente al crear oportunidad', async () => {
      const mockOportunidad = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Oportunidad Test',
            monto: 50000,
            etapa: 'Qualification',
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockOportunidad as any)
      mockGetColaboradorId.mockResolvedValueOnce(1)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Oportunidad Test',
          monto: 50000,
          etapa: 'Qualification',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockCreateActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'nota',
          titulo: expect.stringContaining('Oportunidad creada'),
          relacionado_con_oportunidad: expect.any(Number),
        })
      )
    })

    it('debe manejar errores al crear oportunidad', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/oportunidades', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Oportunidad Test',
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

