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
    it('debe crear etiqueta en Strapi primero, luego en WooCommerce con slug=documentId', async () => {
      const mockStrapiTag = {
        data: {
          id: 1,
          documentId: 'doc456',
          name: 'Nueva Etiqueta',
        },
      }

      const mockWooCommerceTag = {
        id: 200,
        name: 'Nueva Etiqueta',
        slug: 'doc456',
      }

      // Mock: crear en Strapi primero
      mockStrapiClient.post.mockResolvedValueOnce(mockStrapiTag as any)

      // Mock: crear en WooCommerce con slug=documentId
      mockWooCommerceClient.post.mockResolvedValueOnce(mockWooCommerceTag as any)

      // Mock: actualizar Strapi con woocommerce_id
      mockStrapiClient.put.mockResolvedValueOnce({ data: { ...mockStrapiTag.data, woocommerce_id: '200' } } as any)

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
      expect(data.message).toContain('Strapi y WooCommerce')

      // Verificar que se creó en Strapi primero
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/etiquetas',
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Nueva Etiqueta',
          }),
        })
      )

      // Verificar que se creó en WooCommerce con slug=documentId
      expect(mockWooCommerceClient.post).toHaveBeenCalledWith(
        'products/tags',
        expect.objectContaining({
          name: 'Nueva Etiqueta',
          slug: 'doc456', // documentId como slug
        })
      )

      // Verificar que se actualizó Strapi con woocommerce_id
      expect(mockStrapiClient.put).toHaveBeenCalledWith(
        '/api/etiquetas/doc456',
        expect.objectContaining({
          data: expect.objectContaining({
            woocommerce_id: '200',
          }),
        })
      )
    })

    it('debe eliminar de Strapi si falla WooCommerce', async () => {
      const mockStrapiTag = {
        data: {
          id: 1,
          documentId: 'doc456',
          name: 'Nueva Etiqueta',
        },
      }

      // Mock: crear en Strapi primero
      mockStrapiClient.post.mockResolvedValueOnce(mockStrapiTag as any)

      // Mock: falla WooCommerce
      mockWooCommerceClient.post.mockRejectedValueOnce(new Error('Error en WooCommerce'))

      // Mock: eliminar de Strapi
      mockStrapiClient.delete.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            name: 'Nueva Etiqueta',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Verificar que se intentó eliminar de Strapi
      expect(mockStrapiClient.delete).toHaveBeenCalledWith('/api/etiquetas/doc456')
      
      // Verificar que se retornó un error
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Error en WooCommerce')
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
