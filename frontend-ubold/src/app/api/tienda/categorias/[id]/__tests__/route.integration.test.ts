/**
 * Pruebas de integración para /api/tienda/categorias/[id]
 */

import { NextRequest } from 'next/server'
import { PUT, DELETE, GET } from '../route'
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

describe('/api/tienda/categorias/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PUT', () => {
    it('debe actualizar categoría buscando por woocommerce_id en Strapi', async () => {
      const mockCategoriaStrapi = {
        id: 1,
        documentId: 'doc123',
        attributes: {
          woocommerce_id: '100',
          name: 'Categoría Original',
        },
      }

      const mockWooCommerceCategory = {
        id: 100,
        name: 'Categoría Actualizada',
        slug: 'doc123',
      }

      // Mock: obtener categoría de Strapi (findCategoriaEndpoint primero)
      mockStrapiClient.get
        .mockResolvedValueOnce({ data: [] } as any) // Para findCategoriaEndpoint
        .mockResolvedValueOnce({
          data: [mockCategoriaStrapi],
        } as any) // Para obtener la categoría

      // Mock: actualizar en WooCommerce
      mockWooCommerceClient.put.mockResolvedValueOnce(mockWooCommerceCategory as any)

      // Mock: actualizar en Strapi
      mockStrapiClient.put.mockResolvedValueOnce({
        data: { ...mockCategoriaStrapi, attributes: { ...mockCategoriaStrapi.attributes, name: 'Categoría Actualizada' } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/categorias/1', {
        method: 'PUT',
        body: JSON.stringify({
          data: {
            name: 'Categoría Actualizada',
          },
        }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'products/categories/100',
        expect.objectContaining({
          name: 'Categoría Actualizada',
        })
      )
    })

    it('debe buscar por slug (documentId) si no hay woocommerce_id', async () => {
      const mockCategoriaStrapi = {
        id: 1,
        documentId: 'doc123',
        attributes: {
          name: 'Categoría Original',
        },
      }

      const mockWooCommerceCategories = [
        {
          id: 100,
          name: 'Categoría Original',
          slug: 'doc123',
        },
      ]

      const mockWooCommerceCategory = {
        id: 100,
        name: 'Categoría Actualizada',
        slug: 'doc123',
      }

      // Mock: obtener categoría de Strapi (findCategoriaEndpoint primero)
      mockStrapiClient.get
        .mockResolvedValueOnce({ data: [] } as any) // Para findCategoriaEndpoint
        .mockResolvedValueOnce({
          data: [mockCategoriaStrapi],
        } as any) // Para obtener la categoría

      // Mock: buscar por slug en WooCommerce
      mockWooCommerceClient.get.mockResolvedValueOnce(mockWooCommerceCategories as any)

      // Mock: actualizar en WooCommerce
      mockWooCommerceClient.put.mockResolvedValueOnce(mockWooCommerceCategory as any)

      // Mock: actualizar en Strapi
      mockStrapiClient.put.mockResolvedValueOnce({
        data: { ...mockCategoriaStrapi, attributes: { ...mockCategoriaStrapi.attributes, name: 'Categoría Actualizada' } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/categorias/1', {
        method: 'PUT',
        body: JSON.stringify({
          data: {
            name: 'Categoría Actualizada',
          },
        }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verificar que se buscó por slug
      expect(mockWooCommerceClient.get).toHaveBeenCalledWith(
        'products/categories',
        expect.objectContaining({
          slug: 'doc123',
        })
      )
      // Verificar que se actualizó con el ID encontrado
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'products/categories/100',
        expect.anything()
      )
    })
  })

  describe('DELETE', () => {
    it('debe eliminar categoría buscando por woocommerce_id', async () => {
      const mockCategoriaStrapi = {
        id: 1,
        documentId: 'doc123',
        attributes: {
          woocommerce_id: '100',
          name: 'Categoría a Eliminar',
        },
      }

      // Mock: obtener categoría de Strapi (findCategoriaEndpoint primero)
      mockStrapiClient.get
        .mockResolvedValueOnce({ data: [] } as any) // Para findCategoriaEndpoint
        .mockResolvedValueOnce({
          data: [mockCategoriaStrapi],
        } as any) // Para obtener la categoría

      // Mock: eliminar en WooCommerce
      mockWooCommerceClient.delete.mockResolvedValueOnce({} as any)

      // Mock: eliminar en Strapi
      mockStrapiClient.delete.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/categorias/1', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: '1' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockWooCommerceClient.delete).toHaveBeenCalledWith('products/categories/100', true)
      expect(mockStrapiClient.delete).toHaveBeenCalledWith(expect.stringMatching(/\/api\/categorias[^/]*\/1/))
    })

    it('debe buscar por slug (documentId) si no hay woocommerce_id', async () => {
      const mockCategoriaStrapi = {
        id: 1,
        documentId: 'doc123',
        attributes: {
          name: 'Categoría a Eliminar',
        },
      }

      const mockWooCommerceCategories = [
        {
          id: 100,
          name: 'Categoría a Eliminar',
          slug: 'doc123',
        },
      ]

      // Mock: obtener categoría de Strapi (findCategoriaEndpoint primero)
      mockStrapiClient.get
        .mockResolvedValueOnce({ data: [] } as any) // Para findCategoriaEndpoint
        .mockResolvedValueOnce({
          data: [mockCategoriaStrapi],
        } as any) // Para obtener la categoría

      // Mock: buscar por slug en WooCommerce
      mockWooCommerceClient.get.mockResolvedValueOnce(mockWooCommerceCategories as any)

      // Mock: eliminar en WooCommerce
      mockWooCommerceClient.delete.mockResolvedValueOnce({} as any)

      // Mock: eliminar en Strapi
      mockStrapiClient.delete.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/categorias/1', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: '1' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verificar que se buscó por slug
      expect(mockWooCommerceClient.get).toHaveBeenCalledWith(
        'products/categories',
        expect.objectContaining({
          slug: 'doc123',
        })
      )
      // Verificar que se eliminó con el ID encontrado
      expect(mockWooCommerceClient.delete).toHaveBeenCalledWith('products/categories/100', true)
    })
  })
})
