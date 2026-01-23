/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/crm/contacts
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
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

// Mock de next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Mock de configuración de Strapi
jest.mock('@/lib/strapi/config', () => ({
  STRAPI_API_TOKEN: 'test-token',
}))

const mockStrapiClient = strapiClient as jest.Mocked<typeof strapiClient>

describe('/api/crm/contacts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener contactos desde Strapi con paginación', async () => {
      const mockContactos = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Juan Pérez',
            nombres: 'Juan',
            primer_apellido: 'Pérez',
            rut: '12345678-9',
            emails: [],
            telefonos: [],
            trayectorias: { data: [] },
            empresa_contactos: { data: [] },
          },
        },
      ]

      const mockColaboradores = { data: [] }

      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: mockContactos,
          meta: {
            pagination: {
              page: 1,
              pageSize: 50,
              total: 1,
            },
          },
        } as any)
        .mockResolvedValueOnce({
          data: mockColaboradores,
        } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts?page=1&pageSize=50')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(mockStrapiClient.get).toHaveBeenCalledTimes(2) // Una para contactos, otra para colaboradores
    })

    it('debe filtrar contactos por búsqueda', async () => {
      const mockContactos = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Juan Pérez',
            nombres: 'Juan',
            rut: '12345678-9',
            emails: [],
            telefonos: [],
            trayectorias: { data: [] },
            empresa_contactos: { data: [] },
          },
        },
      ]

      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: mockContactos,
          meta: { pagination: { page: 1, pageSize: 50, total: 1 } },
        } as any)
        .mockResolvedValueOnce({ data: [] } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts?search=Juan')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Las URLs están codificadas, así que verificamos la versión codificada
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('filters[$or][0][nombre_completo][$containsi]=Juan'))
      )
    })

    it('debe filtrar contactos por origen', async () => {
      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: [],
          meta: { pagination: { page: 1, pageSize: 50, total: 0 } },
        } as any)
        .mockResolvedValueOnce({ data: [] } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts?origin=manual')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Las URLs están codificadas
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('filters[origen][$eq]=manual'))
      )
    })

    it('debe filtrar contactos por nivel de confianza', async () => {
      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: [],
          meta: { pagination: { page: 1, pageSize: 50, total: 0 } },
        } as any)
        .mockResolvedValueOnce({ data: [] } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts?confidence=alta')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Las URLs están codificadas
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('filters[nivel_confianza][$eq]=alta'))
      )
    })

    it('debe filtrar contactos por tipo (colegio)', async () => {
      const mockContactos = [
        {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Juan Pérez',
            trayectorias: {
              data: [
                {
                  id: 1,
                  attributes: {
                    colegio: { data: { id: 1, attributes: { colegio_nombre: 'Colegio Test' } } },
                    is_current: true,
                    cargo: 'Profesor',
                    activo: true,
                    fecha_inicio: '2020-01-01',
                    fecha_fin: null,
                  },
                },
              ],
            },
            empresa_contactos: { data: [] },
            emails: [],
            telefonos: [],
          },
        },
      ]

      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: mockContactos,
          meta: { pagination: { page: 1, pageSize: 50, total: 1 } },
        } as any)
        .mockResolvedValueOnce({ data: [] } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts?tipo=colegio')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('debe retornar error si no hay token de Strapi', async () => {
      // Mock sin token
      jest.resetModules()
      jest.doMock('@/lib/strapi/config', () => ({
        STRAPI_API_TOKEN: null,
      }))

      const { GET: GETWithoutToken } = await import('../route')
      const request = new NextRequest('http://localhost:3000/api/crm/contacts')
      const response = await GETWithoutToken(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Token de Strapi no configurado')
    })

    it('debe manejar errores de autenticación', async () => {
      const authError: any = new Error('Unauthorized')
      authError.status = 401

      mockStrapiClient.get.mockRejectedValueOnce(authError)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('autenticación')
    })
  })

  describe('POST', () => {
    it('debe crear un nuevo contacto', async () => {
      const mockContacto = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Juan Pérez',
            nombres: 'Juan',
            primer_apellido: 'Pérez',
            rut: '12345678-9',
            activo: true,
            nivel_confianza: 'media',
            origen: 'manual',
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockContacto as any)
      mockStrapiClient.get.mockResolvedValueOnce({
        data: { id: 1 },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts', {
        method: 'POST',
        body: JSON.stringify({
          nombres: 'Juan',
          primer_apellido: 'Pérez',
          rut: '12345678-9',
          activo: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toContain('creado exitosamente')
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/personas',
        expect.objectContaining({
          data: expect.objectContaining({
            nombres: 'Juan',
            primer_apellido: 'Pérez',
          }),
        })
      )
    })

    it('debe validar que el nombre es obligatorio', async () => {
      const request = new NextRequest('http://localhost:3000/api/crm/contacts', {
        method: 'POST',
        body: JSON.stringify({
          primer_apellido: 'Pérez',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('nombre es obligatorio')
    })

    it('debe crear contacto con emails', async () => {
      const mockContacto = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Juan Pérez',
            nombres: 'Juan',
            emails: [{ email: 'juan@example.com', principal: true }],
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockContacto as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts', {
        method: 'POST',
        body: JSON.stringify({
          nombres: 'Juan',
          emails: ['juan@example.com'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/personas',
        expect.objectContaining({
          data: expect.objectContaining({
            emails: expect.arrayContaining([
              expect.objectContaining({
                email: 'juan@example.com',
                principal: true,
              }),
            ]),
          }),
        })
      )
    })

    it('debe crear contacto con teléfonos', async () => {
      const mockContacto = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Juan Pérez',
            nombres: 'Juan',
            telefonos: [{ telefono_raw: '+56912345678', principal: true }],
          },
        },
      }

      mockStrapiClient.post.mockResolvedValueOnce(mockContacto as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts', {
        method: 'POST',
        body: JSON.stringify({
          nombres: 'Juan',
          telefonos: ['+56912345678'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledWith(
        '/api/personas',
        expect.objectContaining({
          data: expect.objectContaining({
            telefonos: expect.arrayContaining([
              expect.objectContaining({
                telefono_raw: '+56912345678',
                principal: true,
              }),
            ]),
          }),
        })
      )
    })

    it('debe crear contacto con trayectoria', async () => {
      const mockContacto = {
        data: {
          id: 1,
          documentId: 'doc1',
          attributes: {
            nombre_completo: 'Juan Pérez',
            nombres: 'Juan',
          },
        },
      }

      mockStrapiClient.post
        .mockResolvedValueOnce(mockContacto as any)
        .mockResolvedValueOnce({
          data: { id: 1, documentId: 'tray1' },
        } as any)
      mockStrapiClient.get.mockResolvedValueOnce({
        data: { id: 1 },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts', {
        method: 'POST',
        body: JSON.stringify({
          nombres: 'Juan',
          trayectoria: {
            colegio: 1,
            cargo: 'Profesor',
            is_current: true,
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.post).toHaveBeenCalledTimes(2) // Persona y trayectoria
    })

    it('debe manejar errores al crear contacto', async () => {
      const error: any = new Error('Error de Strapi')
      error.status = 500
      error.details = { errors: [{ message: 'Error interno' }] }

      mockStrapiClient.post.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts', {
        method: 'POST',
        body: JSON.stringify({
          nombres: 'Juan',
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

