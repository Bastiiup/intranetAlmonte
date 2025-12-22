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

      // Mock: Primera llamada para verificar endpoint (pagination[pageSize]=1)
      // Segunda llamada para obtener los datos (pagination[pageSize]=100)
      mockStrapiClient.get
        .mockResolvedValueOnce({ data: [] } as any) // Para verificar que el endpoint existe
        .mockResolvedValueOnce({ // Para obtener los datos reales
          data: mockPedidos,
          meta: { pagination: { total: 2 } },
        } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPedidos)
      // Verificar que se llamó para verificar endpoint y luego para obtener datos
      expect(mockStrapiClient.get).toHaveBeenCalledTimes(2)
      expect(mockStrapiClient.get).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/pedidos?populate=*&pagination[pageSize]=100')
      )
    })

    it('debe retornar array vacío si hay error', async () => {
      mockStrapiClient.get.mockRejectedValueOnce(new Error('Error de conexión'))

      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.data).toEqual([])
    })
  })

  describe('POST', () => {
    it('debe crear pedido solo en WooCommerce (Strapi se sincroniza vía webhook)', async () => {
      const mockWooCommerceOrder = {
        id: 123,
        number: 'WC-123',
        status: 'completed',
        total: '15000',
        currency: 'CLP',
        date_created: '2025-01-01T10:00:00',
        customer_id: 5,
        payment_method: 'cash',
        payment_method_title: 'Efectivo',
        billing: {
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan@example.com',
        },
        shipping: {
          first_name: 'Juan',
          last_name: 'Pérez',
        },
        line_items: [
          {
            id: 1,
            product_id: 10,
            quantity: 2,
            name: 'Producto 1',
          },
        ],
      }

      // Mock: crear en WooCommerce
      mockWooCommerceClient.post.mockResolvedValueOnce(mockWooCommerceOrder as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          payment_method: 'cash',
          payment_method_title: 'Efectivo',
          status: 'completed',
          customer_id: 5,
          line_items: [
            {
              product_id: 10,
              quantity: 2,
            },
          ],
          billing: {
            first_name: 'Juan',
            last_name: 'Pérez',
            email: 'juan@example.com',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('WooCommerce')
      expect(data.message).toContain('automáticamente')

      // Verificar que se creó solo en WooCommerce
      expect(mockWooCommerceClient.post).toHaveBeenCalledWith(
        'orders',
        expect.objectContaining({
          payment_method: 'cash',
          status: 'completed',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              product_id: 10,
              quantity: 2,
            }),
          ]),
        })
      )

      // Verificar que NO se intentó crear en Strapi (se hace vía webhook)
      expect(mockStrapiClient.post).not.toHaveBeenCalled()
      expect(mockStrapiClient.get).not.toHaveBeenCalled()
    })

    it('debe retornar error si faltan line_items', async () => {
      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          payment_method: 'cash',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('al menos un producto')
      expect(mockWooCommerceClient.post).not.toHaveBeenCalled()
    })

    it('debe propagar error si WooCommerce falla', async () => {
      // Mock: WooCommerce falla
      mockWooCommerceClient.post.mockRejectedValueOnce(
        new Error('Error en WooCommerce') as any
      )

      const request = new NextRequest('http://localhost:3000/api/tienda/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          line_items: [
            {
              product_id: 10,
              quantity: 1,
            },
          ],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Error en WooCommerce')
      // No debe intentar crear en Strapi (nunca se hace directamente)
      expect(mockStrapiClient.post).not.toHaveBeenCalled()
    })
  })
})
