/**
 * Pruebas de integración para /api/tienda/etiquetas/[id]
 */

import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
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

describe('/api/tienda/etiquetas/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PUT', () => {
    it('debe actualizar etiqueta buscando por woocommerce_id en Strapi', async () => {
      const mockEtiquetaStrapi = {
        id: 1,
        documentId: 'doc456',
        attributes: {
          woocommerce_id: '200',
          name: 'Etiqueta Original',
        },
      }

      const mockWooCommerceTag = {
        id: 200,
        name: 'Etiqueta Actualizada',
        slug: 'doc456',
      }

      // Mock: obtener etiqueta de Strapi
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [mockEtiquetaStrapi],
      } as any)

      // Mock: actualizar en WooCommerce
      mockWooCommerceClient.put.mockResolvedValueOnce(mockWooCommerceTag as any)

      // Mock: actualizar en Strapi
      mockStrapiClient.put.mockResolvedValueOnce({
        data: { ...mockEtiquetaStrapi, attributes: { ...mockEtiquetaStrapi.attributes, name: 'Etiqueta Actualizada' } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas/1', {
        method: 'PUT',
        body: JSON.stringify({
          data: {
            name: 'Etiqueta Actualizada',
          },
        }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'products/tags/200',
        expect.objectContaining({
          name: 'Etiqueta Actualizada',
        })
      )
    })

    it('debe buscar por slug (documentId) si no hay woocommerce_id', async () => {
      const mockEtiquetaStrapi = {
        id: 1,
        documentId: 'doc456',
        attributes: {
          name: 'Etiqueta Original',
        },
      }

      const mockWooCommerceTags = [
        {
          id: 200,
          name: 'Etiqueta Original',
          slug: 'doc456',
        },
      ]

      const mockWooCommerceTag = {
        id: 200,
        name: 'Etiqueta Actualizada',
        slug: 'doc456',
      }

      // Mock: obtener etiqueta de Strapi
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [mockEtiquetaStrapi],
      } as any)

      // Mock: buscar por slug en WooCommerce
      mockWooCommerceClient.get.mockResolvedValueOnce(mockWooCommerceTags as any)

      // Mock: actualizar en WooCommerce
      mockWooCommerceClient.put.mockResolvedValueOnce(mockWooCommerceTag as any)

      // Mock: actualizar en Strapi
      mockStrapiClient.put.mockResolvedValueOnce({
        data: { ...mockEtiquetaStrapi, attributes: { ...mockEtiquetaStrapi.attributes, name: 'Etiqueta Actualizada' } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas/1', {
        method: 'PUT',
        body: JSON.stringify({
          data: {
            name: 'Etiqueta Actualizada',
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
        'products/tags',
        expect.objectContaining({
          slug: 'doc456',
        })
      )
      // Verificar que se actualizó con el ID encontrado
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'products/tags/200',
        expect.anything()
      )
    })
  })

  describe('DELETE', () => {
    it('debe eliminar etiqueta buscando por woocommerce_id', async () => {
      const mockEtiquetaStrapi = {
        id: 1,
        documentId: 'doc456',
        attributes: {
          woocommerce_id: '200',
          name: 'Etiqueta a Eliminar',
        },
      }

      // Mock: obtener etiqueta de Strapi
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [mockEtiquetaStrapi],
      } as any)

      // Mock: eliminar en WooCommerce
      mockWooCommerceClient.delete.mockResolvedValueOnce({} as any)

      // Mock: eliminar en Strapi
      mockStrapiClient.delete.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas/1', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: '1' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockWooCommerceClient.delete).toHaveBeenCalledWith('products/tags/200', true)
      expect(mockStrapiClient.delete).toHaveBeenCalledWith('/api/etiquetas/1')
    })

    it('debe buscar por slug (documentId) si no hay woocommerce_id', async () => {
      const mockEtiquetaStrapi = {
        id: 1,
        documentId: 'doc456',
        attributes: {
          name: 'Etiqueta a Eliminar',
        },
      }

      const mockWooCommerceTags = [
        {
          id: 200,
          name: 'Etiqueta a Eliminar',
          slug: 'doc456',
        },
      ]

      // Mock: obtener etiqueta de Strapi
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [mockEtiquetaStrapi],
      } as any)

      // Mock: buscar por slug en WooCommerce
      mockWooCommerceClient.get.mockResolvedValueOnce(mockWooCommerceTags as any)

      // Mock: eliminar en WooCommerce
      mockWooCommerceClient.delete.mockResolvedValueOnce({} as any)

      // Mock: eliminar en Strapi
      mockStrapiClient.delete.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/etiquetas/1', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: '1' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Verificar que se buscó por slug
      expect(mockWooCommerceClient.get).toHaveBeenCalledWith(
        'products/tags',
        expect.objectContaining({
          slug: 'doc456',
        })
      )
      // Verificar que se eliminó con el ID encontrado
      expect(mockWooCommerceClient.delete).toHaveBeenCalledWith('products/tags/200', true)
    })
  })
})
