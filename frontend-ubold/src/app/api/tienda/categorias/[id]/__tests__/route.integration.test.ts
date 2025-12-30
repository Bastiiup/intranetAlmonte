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
    it('debe actualizar categoría solo en Strapi (lifecycles sincronizan con WooCommerce)', async () => {
      const mockCategoriaStrapi = {
        id: 1,
        documentId: 'doc123',
        attributes: {
          woocommerce_id: '100',
          name: 'Categoría Original',
        },
      }

      // Mock: obtener categoría de Strapi (findCategoriaEndpoint primero)
      mockStrapiClient.get
        .mockResolvedValueOnce({ data: [] } as any) // Para findCategoriaEndpoint
        .mockResolvedValueOnce({
          data: [mockCategoriaStrapi],
        } as any) // Para obtener la categoría

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
      expect(data.message).toContain('Strapi')

      // Verificar que se actualizó en Strapi
      expect(mockStrapiClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/categorias'),
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Categoría Actualizada',
          }),
        })
      )

      // Verificar que NO se actualizó WooCommerce directamente (lo hacen los lifecycles)
      expect(mockWooCommerceClient.put).not.toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    it('debe eliminar categoría solo en Strapi (lifecycles sincronizan con WooCommerce)', async () => {
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
      expect(data.message).toContain('Strapi')
      
      // Verificar que se eliminó en Strapi
      expect(mockStrapiClient.delete).toHaveBeenCalledWith(expect.stringContaining('/api/categorias'))
      
      // Verificar que NO se eliminó WooCommerce directamente (lo hacen los lifecycles)
      expect(mockWooCommerceClient.delete).not.toHaveBeenCalled()
    })
  })
})
