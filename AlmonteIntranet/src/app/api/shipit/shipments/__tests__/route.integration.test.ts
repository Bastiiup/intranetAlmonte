/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/shipit/shipments
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import shipitClient from '@/lib/shipit/client'
import wooCommerceClient from '@/lib/woocommerce/client'
import { mapWooCommerceOrderToShipit, validateOrderForShipment, getShipitIdFromOrder } from '@/lib/shipit/utils'

// Mock del cliente de Shipit
jest.mock('@/lib/shipit/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

// Mock del cliente de WooCommerce
jest.mock('@/lib/woocommerce/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
  },
}))

// Mock de shipit/utils
jest.mock('@/lib/shipit/utils', () => ({
  mapWooCommerceOrderToShipit: jest.fn((order, options) => ({
    shipment: {
      reference: options.testMode ? `TEST-${order.id}` : String(order.id),
      commune_id: options.communeId || 1,
      courier: options.courier || 'shippify',
      kind: options.kind || 0,
    },
  })),
  validateOrderForShipment: jest.fn((order) => ({
    valid: true,
    errors: [],
  })),
  getShipitIdFromOrder: jest.fn((order) => null),
}))

const mockShipitClient = shipitClient as jest.Mocked<typeof shipitClient>
const mockWooCommerceClient = wooCommerceClient as jest.Mocked<typeof wooCommerceClient>
const mockMapWooCommerceOrderToShipit = mapWooCommerceOrderToShipit as jest.MockedFunction<typeof mapWooCommerceOrderToShipit>
const mockValidateOrderForShipment = validateOrderForShipment as jest.MockedFunction<typeof validateOrderForShipment>
const mockGetShipitIdFromOrder = getShipitIdFromOrder as jest.MockedFunction<typeof getShipitIdFromOrder>

describe('/api/shipit/shipments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener todos los envíos', async () => {
      const mockShipments = [
        {
          id: 1,
          reference: '123',
          tracking_number: 'TRACK123',
          status: 'pending',
        },
      ]

      mockShipitClient.get.mockResolvedValueOnce(mockShipments as any)

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockShipitClient.get).toHaveBeenCalledWith('shipments')
    })

    it('debe filtrar envíos por referencia', async () => {
      const mockShipments = [
        {
          id: 1,
          reference: '123',
          tracking_number: 'TRACK123',
        },
      ]

      mockShipitClient.get.mockResolvedValueOnce(mockShipments as any)

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments?reference=123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockShipitClient.get).toHaveBeenCalledWith('shipments', { reference: '123' })
    })

    it('debe manejar errores al obtener envíos', async () => {
      const error: any = new Error('Error de Shipit')
      error.status = 500

      mockShipitClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('POST', () => {
    it('debe crear un nuevo envío desde pedido WooCommerce', async () => {
      const mockOrder = {
        id: 123,
        shipping: {
          first_name: 'Juan',
          last_name: 'Pérez',
          address_1: 'Calle Test 123',
          city: 'Santiago',
          country: 'CL',
        },
        meta_data: [],
      }

      const mockShipment = {
        id: 1,
        reference: '123',
        tracking_number: 'TRACK123',
        status: 'pending',
      }

      mockWooCommerceClient.get.mockResolvedValueOnce(mockOrder as any)
      mockShipitClient.post.mockResolvedValueOnce(mockShipment as any)
      mockWooCommerceClient.put.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 123,
          communeId: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockWooCommerceClient.get).toHaveBeenCalledWith('orders/123')
      expect(mockShipitClient.post).toHaveBeenCalledWith(
        'shipments',
        expect.objectContaining({
          shipment: expect.objectContaining({
            reference: '123',
          }),
        })
      )
    })

    it('debe validar que orderId es requerido', async () => {
      const request = new NextRequest('http://localhost:3000/api/shipit/shipments', {
        method: 'POST',
        body: JSON.stringify({
          communeId: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('orderId es requerido')
    })

    it('debe validar que el pedido tenga información necesaria', async () => {
      const mockOrder = {
        id: 123,
        shipping: {},
        meta_data: [],
      }

      mockWooCommerceClient.get.mockResolvedValueOnce(mockOrder as any)
      mockValidateOrderForShipment.mockReturnValueOnce({
        valid: false,
        errors: ['Falta dirección de envío'],
      })

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 123,
          communeId: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('información necesaria')
    })

    it('debe validar que el pedido no tenga envío existente', async () => {
      const mockOrder = {
        id: 123,
        shipping: {
          first_name: 'Juan',
          last_name: 'Pérez',
          address_1: 'Calle Test 123',
          city: 'Santiago',
        },
        meta_data: [{ key: '_shipit_id', value: '1' }],
      }

      mockWooCommerceClient.get.mockResolvedValueOnce(mockOrder as any)
      mockGetShipitIdFromOrder.mockReturnValueOnce('1')

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 123,
          communeId: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('ya tiene un envío')
    })

    it('debe validar communeId si no está en el pedido', async () => {
      const mockOrder = {
        id: 123,
        shipping: {
          first_name: 'Juan',
          last_name: 'Pérez',
          address_1: 'Calle Test 123',
          // Sin city
        },
        meta_data: [],
      }

      mockWooCommerceClient.get.mockResolvedValueOnce(mockOrder as any)

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 123,
          // Sin communeId
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('communeId es requerido')
    })

    it('debe usar testMode para generar referencia con prefijo TEST-', async () => {
      const mockOrder = {
        id: 123,
        shipping: {
          first_name: 'Juan',
          last_name: 'Pérez',
          address_1: 'Calle Test 123',
          city: 'Santiago',
        },
        meta_data: [],
      }

      const mockShipment = {
        id: 1,
        reference: 'TEST-123',
        tracking_number: 'TRACK123',
      }

      mockWooCommerceClient.get.mockResolvedValueOnce(mockOrder as any)
      mockShipitClient.post.mockResolvedValueOnce(mockShipment as any)
      mockWooCommerceClient.put.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 123,
          communeId: 1,
          testMode: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockMapWooCommerceOrderToShipit).toHaveBeenCalledWith(
        mockOrder,
        expect.objectContaining({
          testMode: true,
        })
      )
    })

    it('debe guardar ID de Shipit en el pedido WooCommerce', async () => {
      const mockOrder = {
        id: 123,
        shipping: {
          first_name: 'Juan',
          last_name: 'Pérez',
          address_1: 'Calle Test 123',
          city: 'Santiago',
        },
        meta_data: [],
      }

      const mockShipment = {
        id: 1,
        reference: '123',
        tracking_number: 'TRACK123',
      }

      mockWooCommerceClient.get.mockResolvedValueOnce(mockOrder as any)
      mockShipitClient.post.mockResolvedValueOnce(mockShipment as any)
      mockWooCommerceClient.put.mockResolvedValueOnce({} as any)

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 123,
          communeId: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith('orders/123', {
        meta_data: expect.arrayContaining([
          expect.objectContaining({
            key: '_shipit_id',
            value: '1',
          }),
          expect.objectContaining({
            key: '_shipit_tracking',
            value: 'TRACK123',
          }),
        ]),
      })
    })

    it('debe manejar errores al crear envío', async () => {
      const mockOrder = {
        id: 123,
        shipping: {
          first_name: 'Juan',
          last_name: 'Pérez',
          address_1: 'Calle Test 123',
          city: 'Santiago',
        },
        meta_data: [],
      }

      const error: any = new Error('Error de Shipit')
      error.status = 500

      mockWooCommerceClient.get.mockResolvedValueOnce(mockOrder as any)
      mockShipitClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/shipit/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 123,
          communeId: 1,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
})

