/**
 * @jest-environment node
 */

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
    it('debe crear categoría solo en Strapi con estado pendiente', async () => {
      const mockStrapiCategory = {
        data: {
          id: 1,
          documentId: 'doc123',
          name: 'Nueva Categoría',
        },
      }

      // Mock: crear en Strapi (findCategoriaEndpoint necesita un mock válido)
      mockStrapiClient.get.mockResolvedValueOnce({ data: [] } as any) // Para findCategoriaEndpoint
      mockStrapiClient.post.mockResolvedValueOnce(mockStrapiCategory as any)

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
      expect(data.message).toContain('pendiente')
      expect(data.message).toContain('Solicitudes')

      // Verificar que se creó en Strapi
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/categorias'),
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Nueva Categoría',
            estado_publicacion: 'pendiente',
          }),
        })
      )

      // Verificar que NO se creó en WooCommerce (se hace después desde Solicitudes)
      expect(mockWooCommerceClient.post).not.toHaveBeenCalled()
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
