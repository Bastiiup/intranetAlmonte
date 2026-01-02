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
    it('debe actualizar etiqueta solo en Strapi (lifecycles sincronizan con WooCommerce)', async () => {
      const mockEtiquetaStrapi = {
        id: 1,
        documentId: 'doc456',
        attributes: {
          woocommerce_id: '200',
          name: 'Etiqueta Original',
        },
      }

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
      expect(data.message).toContain('Strapi')

      // Verificar que se actualizó en Strapi
      expect(mockStrapiClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/etiquetas'),
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Etiqueta Actualizada',
          }),
        })
      )

      // Verificar que NO se actualizó WooCommerce directamente (lo hacen los lifecycles)
      expect(mockWooCommerceClient.put).not.toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    it('debe eliminar etiqueta solo en Strapi (lifecycles sincronizan con WooCommerce)', async () => {
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
      expect(data.message).toContain('Strapi')
      
      // Verificar que se eliminó en Strapi
      expect(mockStrapiClient.delete).toHaveBeenCalledWith(expect.stringContaining('/api/etiquetas'))
      
      // Verificar que NO se eliminó WooCommerce directamente (lo hacen los lifecycles)
      expect(mockWooCommerceClient.delete).not.toHaveBeenCalled()
    })
  })
})
