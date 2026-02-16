/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/woocommerce/orders/[id]
 */

import { NextRequest } from 'next/server'
import { PUT, GET } from '../route'
import wooCommerceClient from '@/lib/woocommerce/client'

// Mock del cliente de WooCommerce
jest.mock('@/lib/woocommerce/client', () => ({
  __esModule: true,
  default: {
    put: jest.fn(),
    get: jest.fn(),
  },
}))

const mockWooCommerceClient = wooCommerceClient as jest.Mocked<typeof wooCommerceClient>

describe('/api/woocommerce/orders/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PUT', () => {
    it('debe actualizar un pedido existente', async () => {
      const mockOrder = {
        id: 1,
        status: 'completed',
        billing: {
          first_name: 'Juan',
          last_name: 'Pérez',
          address_1: 'Av. Providencia 123',
        },
      }

      mockWooCommerceClient.get.mockResolvedValueOnce({
        id: 1,
        meta_data: [],
      } as any)

      mockWooCommerceClient.put.mockResolvedValueOnce(mockOrder as any)

      const request = new NextRequest('http://localhost:3000/api/woocommerce/orders/1', {
        method: 'PUT',
        body: JSON.stringify({
          billing: {
            first_name: 'Juan',
            last_name: 'Pérez',
            address_1: 'Av. Providencia 123',
            country: 'CL',
          },
        }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOrder)
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'orders/1',
        expect.objectContaining({
          billing: expect.objectContaining({
            first_name: 'Juan',
            last_name: 'Pérez',
            address_1: 'Av. Providencia 123',
            country: 'CL',
          }),
        })
      )
    })

    it('debe preservar meta_data existente al actualizar', async () => {
      const existingMetaData = [
        { key: '_existing_key', value: 'existing_value' },
      ]

      // Limpiar mocks anteriores
      mockWooCommerceClient.get.mockReset()
      
      // Configurar mock para obtener pedido actual (para preservar meta_data)
      mockWooCommerceClient.get.mockResolvedValue({
        id: 1,
        status: 'completed',
        total: '10000',
        meta_data: existingMetaData,
      } as any)

      // Resultado después de actualizar
      mockWooCommerceClient.put.mockResolvedValueOnce({
        id: 1,
        status: 'completed',
        total: '10000',
        meta_data: [
          ...existingMetaData,
          { key: '_openfactura_folio', value: '123' },
        ],
      } as any)

      const request = new NextRequest('http://localhost:3000/api/woocommerce/orders/1', {
        method: 'PUT',
        body: JSON.stringify({
          meta_data: [{ key: '_openfactura_folio', value: '123' }],
        }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(mockWooCommerceClient.get).toHaveBeenCalledWith('orders/1')
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'orders/1',
        expect.objectContaining({
          meta_data: expect.arrayContaining([
            ...existingMetaData,
            { key: '_openfactura_folio', value: '123' },
          ]),
        })
      )
    })

    it('debe actualizar customer_note', async () => {
      mockWooCommerceClient.get.mockResolvedValueOnce({
        id: 1,
        meta_data: [],
      } as any)

      mockWooCommerceClient.put.mockResolvedValueOnce({
        id: 1,
        customer_note: 'Nota del cliente',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/woocommerce/orders/1', {
        method: 'PUT',
        body: JSON.stringify({
          customer_note: 'Nota del cliente',
        }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'orders/1',
        expect.objectContaining({
          customer_note: 'Nota del cliente',
        })
      )
    })

    it('debe retornar error si el ID es inválido', async () => {
      const request = new NextRequest('http://localhost:3000/api/woocommerce/orders/invalid', {
        method: 'PUT',
        body: JSON.stringify({}),
      })

      const params = Promise.resolve({ id: 'invalid' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('inválido')
    })
  })

  describe('GET', () => {
    it('debe obtener un pedido por ID', async () => {
      const mockOrder = {
        id: 1,
        status: 'completed',
        total: '10000',
        meta_data: [],
      }

      // Limpiar mocks anteriores y configurar nuevo mock
      mockWooCommerceClient.get.mockReset()
      mockWooCommerceClient.get.mockResolvedValue(mockOrder as any)

      const request = new NextRequest('http://localhost:3000/api/woocommerce/orders/1')
      const params = Promise.resolve({ id: '1' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockOrder)
      expect(mockWooCommerceClient.get).toHaveBeenCalledWith('orders/1')
    })

    it('debe retornar error si el ID es inválido', async () => {
      const request = new NextRequest('http://localhost:3000/api/woocommerce/orders/invalid')
      const params = Promise.resolve({ id: 'invalid' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('inválido')
    })
  })
})

