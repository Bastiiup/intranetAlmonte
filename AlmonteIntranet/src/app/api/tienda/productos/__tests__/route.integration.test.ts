/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/tienda/productos
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import strapiClient from '@/lib/strapi/client'

// Mock del cliente de Strapi
jest.mock('@/lib/strapi/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

// Mock de configuración de Strapi
jest.mock('@/lib/strapi/config', () => ({
  STRAPI_API_TOKEN: 'test-token',
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>

describe('/api/tienda/productos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener productos desde Strapi', async () => {
      const mockProductos = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_libro: 'Libro Test',
            isbn_libro: '1234567890',
            estado_publicacion: 'Publicado',
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockProductos,
        meta: {
          pagination: {
            page: 1,
            pageSize: 1000,
            total: 1,
          },
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/libros?')
      )
    })

    it('debe usar paginación por defecto', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 1000, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('pagination[pageSize]=1000')
      )
    })

    it('debe manejar error cuando no hay token', async () => {
      // Mock sin token
      process.env.STRAPI_API_TOKEN = undefined

      const request = new NextRequest('http://localhost:3000/api/tienda/productos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('STRAPI_API_TOKEN')
    })

    it('debe manejar error 502 Bad Gateway', async () => {
      const error: any = new Error('Bad Gateway')
      error.status = 502

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.success).toBe(false)
      expect(data.error).toContain('502')
    })

    it('debe retornar endpoint usado en la respuesta', async () => {
      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { pagination: { page: 1, pageSize: 1000, total: 0 } },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.endpoint).toBe('/api/libros')
    })
  })

  describe('POST', () => {
    it('debe crear un nuevo producto', async () => {
      const mockProducto = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_libro: 'Libro Test',
            isbn_libro: 'AUTO-1234567890-ABC123',
            estado_publicacion: 'Pendiente',
          },
        },
      }

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [
          { id: 1, attributes: { key: 'moraleja' } },
          { id: 2, attributes: { key: 'escolar' } },
        ],
      } as any)
      mockStrapiClient.post.mockResolvedValueOnce(mockProducto as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre_libro: 'Libro Test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creado')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/libros',
        expect.objectContaining({
          data: expect.objectContaining({
            nombre_libro: 'Libro Test',
            estado_publicacion: 'Pendiente',
          }),
        })
      )
    })

    it('debe validar que nombre_libro es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/tienda/productos', {
        method: 'POST',
        body: JSON.stringify({
          isbn_libro: '1234567890',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('nombre del libro es obligatorio')
    })

    it('debe generar ISBN automáticamente si no se proporciona', async () => {
      const mockProducto = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_libro: 'Libro Test',
            isbn_libro: 'AUTO-1234567890-ABC123',
          },
        },
      }

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
      } as any)
      mockStrapiClient.post.mockResolvedValueOnce(mockProducto as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre_libro: 'Libro Test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/libros',
        expect.objectContaining({
          data: expect.objectContaining({
            isbn_libro: expect.stringMatching(/^AUTO-/),
          }),
        })
      )
    })

    it('debe crear producto con descripción formateada', async () => {
      const mockProducto = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_libro: 'Libro Test',
            descripcion: [{ type: 'paragraph', children: [{ type: 'text', text: 'Descripción' }] }],
          },
        },
      }

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
      } as any)
      mockStrapiClient.post.mockResolvedValueOnce(mockProducto as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre_libro: 'Libro Test',
          descripcion: '<p>Descripción</p>',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/libros',
        expect.objectContaining({
          data: expect.objectContaining({
            descripcion: expect.arrayContaining([
              expect.objectContaining({
                type: 'paragraph',
              }),
            ]),
          }),
        })
      )
    })

    it('debe manejar errores al crear producto', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
      } as any)
      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre_libro: 'Libro Test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('debe manejar timeout al crear producto', async () => {
      // Mock que nunca resuelve (simula timeout)
      jest.useFakeTimers()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 20000)
      })

      mockStrapiClient.get.mockResolvedValueOnce({
        data: [],
      } as any)
      mockStrapiClient.post.mockImplementationOnce(() => timeoutPromise as any)

      const request = new NextRequest('http://localhost:3000/api/tienda/productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre_libro: 'Libro Test',
        }),
      })

      // Avanzar el tiempo para simular timeout
      jest.advanceTimersByTime(20001)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)

      jest.useRealTimers()
    })
  })
})

