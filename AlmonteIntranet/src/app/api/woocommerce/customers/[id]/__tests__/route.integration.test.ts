/**
 * Pruebas de integración para /api/woocommerce/customers/[id]
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

describe('/api/woocommerce/customers/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PUT', () => {
    it('debe actualizar un cliente existente', async () => {
      const mockCustomer = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Juan',
        last_name: 'Pérez',
        billing: {
          first_name: 'Juan',
          last_name: 'Pérez',
          address_1: 'Av. Providencia 123',
          city: 'Santiago',
          country: 'CL',
        },
      }

      mockWooCommerceClient.get.mockResolvedValueOnce({
        id: 1,
        meta_data: [],
      } as any)

      mockWooCommerceClient.put.mockResolvedValueOnce(mockCustomer as any)

      const request = new NextRequest('http://localhost:3000/api/woocommerce/customers/1', {
        method: 'PUT',
        body: JSON.stringify({
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'test@example.com',
          billing: {
            first_name: 'Juan',
            last_name: 'Pérez',
            address_1: 'Av. Providencia 123',
            city: 'Santiago',
            country: 'CL',
          },
        }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCustomer)
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'customers/1',
        expect.objectContaining({
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'test@example.com',
        })
      )
    })

    it('debe preservar meta_data existente al actualizar', async () => {
      const existingMetaData = [
        { key: '_existing_key', value: 'existing_value' },
      ]

      // Limpiar mocks anteriores
      mockWooCommerceClient.get.mockReset()
      
      // Configurar mock para obtener cliente actual (para preservar meta_data)
      mockWooCommerceClient.get.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        first_name: 'Juan',
        last_name: 'Pérez',
        meta_data: existingMetaData,
      } as any)

      // Resultado después de actualizar
      mockWooCommerceClient.put.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        first_name: 'Juan',
        last_name: 'Pérez',
        meta_data: [
          ...existingMetaData,
          { key: '_billing_calle', value: 'Av. Providencia' },
        ],
      } as any)

      const request = new NextRequest('http://localhost:3000/api/woocommerce/customers/1', {
        method: 'PUT',
        body: JSON.stringify({
          meta_data: [{ key: '_billing_calle', value: 'Av. Providencia' }],
        }),
      })

      const params = Promise.resolve({ id: '1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(mockWooCommerceClient.get).toHaveBeenCalledWith('customers/1')
      expect(mockWooCommerceClient.put).toHaveBeenCalledWith(
        'customers/1',
        expect.objectContaining({
          meta_data: expect.arrayContaining([
            ...existingMetaData,
            { key: '_billing_calle', value: 'Av. Providencia' },
          ]),
        })
      )
    })

    it('debe retornar error si el ID es inválido', async () => {
      const request = new NextRequest('http://localhost:3000/api/woocommerce/customers/invalid', {
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
    it('debe obtener un cliente por ID', async () => {
      const mockCustomer = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Juan',
        last_name: 'Pérez',
        meta_data: [],
      }

      // Limpiar mocks anteriores y configurar nuevo mock
      mockWooCommerceClient.get.mockReset()
      mockWooCommerceClient.get.mockResolvedValue(mockCustomer as any)

      const request = new NextRequest('http://localhost:3000/api/woocommerce/customers/1')
      const params = Promise.resolve({ id: '1' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCustomer)
      expect(mockWooCommerceClient.get).toHaveBeenCalledWith('customers/1')
    })

    it('debe retornar error si el ID es inválido', async () => {
      const request = new NextRequest('http://localhost:3000/api/woocommerce/customers/invalid')
      const params = Promise.resolve({ id: 'invalid' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('inválido')
    })
  })
})

