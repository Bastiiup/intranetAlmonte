/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/crm/leads
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

describe('/api/crm/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener leads con paginación', async () => {
      const mockLeads = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Lead Test',
            email: 'lead@example.com',
            empresa: 'Empresa Test',
            etiqueta: 'alta',
            estado: 'in-progress',
            activo: true,
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockLeads,
        meta: {
          pagination: {
            page: 1,
            pageSize: 50,
            total: 1,
            pageCount: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/leads?page=1&pageSize=50')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/leads?')
      )
    })

    it('debe filtrar leads por búsqueda', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/leads?search=Test')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[$or][0][nombre][$containsi]=Test')
    })

    it('debe filtrar leads por etiqueta', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/leads?etiqueta=alta')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[etiqueta][$eq]=alta')
    })

    it('debe filtrar leads por estado', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 50, total: 0, pageCount: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/leads?estado=in-progress')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      const callArgs = (mockStrapiClient.get as jest.Mock).mock.calls[0][0]
      expect(decodeURIComponent(callArgs)).toContain('filters[estado][$eq]=in-progress')
    })

    it('debe manejar error cuando Strapi está caído', async () => {
      const error: any = new Error('Bad Gateway')
      error.status = 502

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/leads')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.success).toBe(false)
      expect(data.message).toContain('Strapi está caído')
    })

    it('debe manejar error cuando content-type no existe', async () => {
      const error: any = new Error('Not Found')
      error.status = 404

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/leads')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toContain('Lead')
    })
  })

  describe('POST', () => {
    it('debe crear un nuevo lead', async () => {
      const mockLead = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Lead Test',
            email: 'lead@example.com',
            empresa: 'Empresa Test',
            monto_estimado: 10000,
            etiqueta: 'alta',
            estado: 'in-progress',
            activo: true,
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockLead as any)
      mockGetColaboradorId.mockResolvedValueOnce(1)

      const request = new NextRequest('http://localhost:3000/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Lead Test',
          email: 'lead@example.com',
          empresa: 'Empresa Test',
          monto_estimado: 10000,
          etiqueta: 'alta',
          estado: 'in-progress',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creado exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/leads',
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: 'Lead Test',
            email: 'lead@example.com',
          }),
        })
      )
    })

    it('debe validar que el nombre es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify({
          email: 'lead@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('nombre del lead es obligatorio')
    })

    it('debe crear lead con relaciones', async () => {
      const mockLead = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Lead Test',
            asignado_a: { id: 1 },
            relacionado_con_persona: { id: 1 },
            relacionado_con_colegio: { id: 1 },
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockLead as any)
      mockGetColaboradorId.mockResolvedValueOnce(1)

      const request = new NextRequest('http://localhost:3000/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Lead Test',
          asignado_a: 1,
          relacionado_con_persona: 1,
          relacionado_con_colegio: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/leads',
        expect.objectContaining({
          data: expect.objectContaining({
            asignado_a: expect.any(Number),
            relacionado_con_persona: expect.any(Number),
            relacionado_con_colegio: expect.any(Number),
          }),
        })
      )
    })

    it('debe crear actividad automáticamente al crear lead', async () => {
      const mockLead = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre: 'Lead Test',
            empresa: 'Empresa Test',
            monto_estimado: 10000,
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockLead as any)
      mockGetColaboradorId.mockResolvedValueOnce(1)

      const request = new NextRequest('http://localhost:3000/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Lead Test',
          empresa: 'Empresa Test',
          monto_estimado: 10000,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      // Verificar que se intentó crear la actividad
      expect(mockCreateActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'nota',
          titulo: expect.stringContaining('Lead creado'),
          relacionado_con_lead: expect.any(Number),
        })
      )
    })

    it('debe manejar errores al crear lead', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Lead Test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('debe manejar error cuando Strapi está caído', async () => {
      const error: any = new Error('Bad Gateway')
      error.status = 502

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Lead Test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Strapi está caído')
    })
  })
})

