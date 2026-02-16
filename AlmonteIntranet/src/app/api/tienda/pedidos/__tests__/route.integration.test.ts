/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/tienda/pedidos
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

describe('/api/tienda/pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener todas los pedidos desde Strapi', async () => {
      const mockPedidos = [
        { id: 1, documentId: 'doc1', numero_pedido: 'PED-001' },
        { id: 2, documentId: 'doc2', numero_pedido: 'PED-002' },
      ]

      // Mock: Una sola llamada para obtener los datos
      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockPedidos,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPedidos)
      // Verificar que se llamó para obtener datos
      expect(mockStrapiClient.get).toHaveBeenCalledTimes(1)
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/pedidos?populate=*&pagination[pageSize]=5000')
      )
    })

    it('debe retornar array vacío si hay error', async () => {
      mockStrapiClient.get.mockRejectedValueOnce(new Error('Error de conexión'))

      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(data.warning).toBeDefined()
    })
  })

  describe('POST', () => {
    it('debe crear pedido en Strapi (lifecycles sincronizan con WooCommerce)', async () => {
      const mockStrapiPedido = {
        data: {
          id: 1,
          documentId: 'doc123',
          numero_pedido: 'PED-001',
        },
      }

      // Mock: crear en Strapi
      mockStrapiClient.post.mockResolvedValueOnce(mockStrapiPedido as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            numero_pedido: 'PED-001',
            items: [
              {
                producto_id: 10,
                cantidad: 2,
                nombre: 'Producto 1',
                precio_unitario: 1000,
                total: 2000,
              },
            ],
            billing: {
              first_name: 'Juan',
              last_name: 'Pérez',
              email: 'juan@example.com',
            },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Strapi')
      expect(data.message).toContain('sincronizará')

      // Verificar que se creó en Strapi
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/pedidos',
        expect.objectContaining({
          data: expect.objectContaining({
            numero_pedido: 'PED-001',
          }),
        })
      )

      // Verificar que NO se intentó crear directamente en WooCommerce (lo hacen los lifecycles)
      expect(mockWooCommerceClient.post).not.toHaveBeenCalled()
    })

    it('debe retornar error si faltan items', async () => {
      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            numero_pedido: 'PED-001',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('items')
      expect(mockStrapiClient.post).not.toHaveBeenCalled()
    })

    it('debe propagar error si Strapi falla', async () => {
      // Mock: Strapi falla
      mockStrapiClient.post.mockRejectedValueOnce(
        new Error('Error en Strapi') as any
      )

      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            numero_pedido: 'PED-001',
            items: [
              {
                producto_id: 10,
                cantidad: 1,
                nombre: 'Producto 1',
                precio_unitario: 1000,
                total: 1000,
              },
            ],
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Error en Strapi')
      // Verificar que se intentó crear en Strapi
      expect(mockStrapiClient.post).toHaveBeenCalled()
    })
  })
})
