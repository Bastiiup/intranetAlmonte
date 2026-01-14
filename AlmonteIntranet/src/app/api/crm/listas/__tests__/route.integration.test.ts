/**
 * Pruebas de integración para /api/crm/listas
 */

import { NextRequest } from 'next/server'
import { GET } from '../route'
import strapiClient from '@/lib/strapi/client'

// Mock del cliente de Strapi
jest.mock('@/lib/strapi/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>

describe('/api/crm/listas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener listas (cursos con PDFs)', async () => {
      const mockCursos = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_curso: '2° Media',
            nivel: 'Media',
            grado: 2,
            paralelo: 'A',
            año: 2026,
            activo: true,
            versiones_materiales: [
              {
                pdf_id: 1,
                nombre_archivo: 'lista.pdf',
                fecha_subida: '2026-01-01',
              },
            ],
            colegio: {
              data: {
                id: 1,
                attributes: {
                  colegio_nombre: 'Colegio Test',
                  rbd: '12345',
                },
              },
            },
          },
        },
        {
          id: 2,
          documentId: 'doc2',
          attributes: {
            nombre_curso: '3° Básica',
            nivel: 'Basica',
            grado: 3,
            año: 2026,
            activo: true,
            versiones_materiales: [], // Sin PDFs, debe ser filtrado
            colegio: {
              data: {
                id: 1,
                attributes: {
                  colegio_nombre: 'Colegio Test',
                  rbd: '12345',
                },
              },
            },
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockCursos,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/listas')
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
      // Solo debe retornar cursos con PDFs
      expect(body.data.length).toBe(1)
      expect(body.data[0].nombre).toBe('2° Media A')
      expect(body.data[0].pdf_id).toBe(1)
      expect(body.data[0].pdf_nombre).toBe('lista.pdf')
    })

    it('debe filtrar por colegio si se proporciona colegioId', async () => {
      const mockCursos = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_curso: '2° Media',
            nivel: 'Media',
            grado: 2,
            año: 2026,
            activo: true,
            versiones_materiales: [
              {
                pdf_id: 1,
                nombre_archivo: 'lista.pdf',
              },
            ],
            colegio: {
              data: {
                id: 1,
                attributes: {
                  colegio_nombre: 'Colegio Test',
                },
              },
            },
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockCursos,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/listas?colegioId=1')
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      
      // Verificar que se llamó con el filtro de colegio
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('filters[colegio][id][$eq]=1')
      )
    })

    it('debe filtrar por nivel si se proporciona', async () => {
      const mockCursos = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_curso: '2° Media',
            nivel: 'Media',
            grado: 2,
            año: 2026,
            activo: true,
            versiones_materiales: [
              {
                pdf_id: 1,
                nombre_archivo: 'lista.pdf',
              },
            ],
            colegio: {
              data: {
                id: 1,
                attributes: {
                  colegio_nombre: 'Colegio Test',
                },
              },
            },
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockCursos,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/listas?nivel=Media')
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      
      // Verificar que se llamó con el filtro de nivel
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('filters[nivel][$eq]=Media')
      )
    })

    it('debe retornar array vacío si no hay cursos con PDFs', async () => {
      const mockCursos = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_curso: '2° Media',
            nivel: 'Media',
            grado: 2,
            año: 2026,
            activo: true,
            versiones_materiales: [], // Sin PDFs
            colegio: {
              data: {
                id: 1,
                attributes: {
                  colegio_nombre: 'Colegio Test',
                },
              },
            },
          },
        },
      ]

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockCursos,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/listas')
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
      expect(body.count).toBe(0)
    })

    it('debe manejar errores correctamente', async () => {
      mockStrapiClient.get.mockRejectedValueOnce(new Error('Error de conexión'))

      const request = new NextRequest('http://localhost:3000/api/crm/listas')
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBeDefined()
    })

    it('debe incluir publicationState=preview en la query', async () => {
      const mockCursos: any[] = []

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockCursos,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/listas')
      await GET(request)

      // Verificar que se incluye publicationState=preview
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('publicationState=preview')
      )
    })

    it('debe incluir campos paralelo y versiones_materiales en la query', async () => {
      const mockCursos: any[] = []

      mockStrapiClient.get.mockResolvedValueOnce({
        data: mockCursos,
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/listas')
      await GET(request)

      const callUrl = mockStrapiClient.get.mock.calls[0][0] as string
      expect(callUrl).toContain('fields[4]=paralelo')
      expect(callUrl).toContain('fields[5]=versiones_materiales')
    })
  })
})

