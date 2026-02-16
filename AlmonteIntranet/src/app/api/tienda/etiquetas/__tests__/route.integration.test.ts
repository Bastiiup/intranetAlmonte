/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/tienda/etiquetas
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
import strapiClient from '@/lib/strapi/client'
import wooCommerceClient from '@/lib/woocommerce/client'

// Mock de los clientes
jest.mock('@/lib/strapi/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('@/lib/woocommerce/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>
const mockWooCommerceClient = wooCommerceClient as jest.Mocked<typeof wooCommerceClient>

describe('/api/tienda/etiquetas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener todas las etiquetas', async () => {
      const mockEtiquetas = [
        { id: 1, documentId: 'doc1', name: 'Etiqueta 1' },
        { id: 2, documentId: 'doc2', name: 'Etiqueta 2' },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockEtiquetas,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockEtiquetas)
    })

    it('debe retornar array vacío si hay error', async () => {
      mockStrapiClient.get.mockRejectedValueOnce(new Error('Error de conexión'))

      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(data.warning).toBeDefined()
    })
  })

  describe('POST', () => {
    it('debe crear etiqueta solo en Strapi con estado pendiente', async () => {
      const mockStrapiTag = {
        data: {
          id: 1,
          documentId: 'doc456',
          name: 'Nueva Etiqueta',
        },
      }

      // Mock: crear en Strapi
      mockStrapiClient.post.mockResolvedValueOnce(mockStrapiTag as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            name: 'Nueva Etiqueta',
            descripcion: 'Descripción de la etiqueta',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('pendiente')
      expect(data.message).toContain('Solicitudes')

      // Verificar que se creó en Strapi
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/etiquetas',
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Nueva Etiqueta',
            estado_publicacion: 'pendiente',
          }),
        })
      )

      // Verificar que NO se creó en WooCommerce (se hace después desde Solicitudes)
      expect(mockWooCommerceClient.post).not.toHaveBeenCalled()
    })

    it('debe retornar error si falta el nombre', async () => {
      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas', {
        method: 'POST',
        body: JSON.stringify({
          data: {},
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('obligatorio')
    })
  })
})
