/**
 * Pruebas de integración para /api/tienda/categorias
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

describe('/api/tienda/categorias', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener todas las categorías', async () => {
      const mockCategorias = [
        { id: 1, documentId: 'doc1', name: 'Categoría 1' },
        { id: 2, documentId: 'doc2', name: 'Categoría 2' },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockCategorias,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/categorias')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCategorias)
    })

    it('debe retornar array vacío si hay error', async () => {
      mockStrapiClient.get.mockRejectedValueOnce(new Error('Error de conexión'))

      const request = new NextRequest('http://localhost:3000/api/tienda/categorias')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(data.warning).toBeDefined()
    })
  })

  describe('POST', () => {
    it('debe crear categoría en Strapi primero, luego en WooCommerce con slug=documentId', async () => {
      const mockStrapiCategory = {
        data: {
          id: 1,
          documentId: 'doc123',
          name: 'Nueva Categoría',
        },
      }

      const mockWooCommerceCategory = {
        id: 100,
        name: 'Nueva Categoría',
        slug: 'doc123',
      }

      // Mock: crear en Strapi primero (findCategoriaEndpoint necesita un mock válido)
      mockStrapiClient.get.mockResolvedValueOnce({ data: [] } as any) // Para findCategoriaEndpoint
      mockStrapiClient.post.mockResolvedValueOnce(mockStrapiCategory as any)

      // Mock: crear en WooCommerce con slug=documentId
      mockWooCommerceClient.post.mockResolvedValueOnce(mockWooCommerceCategory as any)

      // Mock: actualizar Strapi con woocommerce_id
      mockStrapiClient.put.mockResolvedValueOnce({ data: { ...mockStrapiCategory.data, woocommerce_id: '100' } } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/categorias', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            name: 'Nueva Categoría',
            descripcion: 'Descripción de la categoría',
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
        expect.stringContaining('/api/categorias'),
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Nueva Categoría',
          }),
        })
      )

      // Verificar que se creó en WooCommerce con slug=documentId
      expect(mockWooCommerceClient.post).toHaveBeenCalledWith(
        'products/categories',
        expect.objectContaining({
          name: 'Nueva Categoría',
          slug: 'doc123', // documentId como slug
        })
      )

      // Verificar que se actualizó Strapi con woocommerce_id
      expect(mockStrapiClient.put).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/categorias[^/]*\/doc123/),
        expect.objectContaining({
          data: expect.objectContaining({
            woocommerce_id: '100',
          }),
        })
      )
    })

    it('debe eliminar de Strapi si falla WooCommerce', async () => {
      const mockStrapiCategory = {
        data: {
          id: 1,
          documentId: 'doc123',
          name: 'Nueva Categoría',
        },
      }

      // Mock: crear en Strapi primero (findCategoriaEndpoint necesita un mock válido)
      mockStrapiClient.get.mockResolvedValueOnce({ data: [] } as any) // Para findCategoriaEndpoint
      mockStrapiClient.post.mockResolvedValueOnce(mockStrapiCategory as any)

      // Mock: falla WooCommerce
      mockWooCommerceClient.post.mockRejectedValueOnce(new Error('Error en WooCommerce'))

      // Mock: eliminar de Strapi
      mockStrapiClient.delete.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/categorias', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            name: 'Nueva Categoría',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Verificar que se intentó eliminar de Strapi
      expect(mockStrapiClient.delete).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/categorias[^/]*\/doc123/)
      )
      
      // Verificar que se retornó un error
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Error en WooCommerce')
    })

    it('debe retornar error si falta el nombre', async () => {
      const request = new NextRequest('http://localhost:3000/api/tienda/categorias', {
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
