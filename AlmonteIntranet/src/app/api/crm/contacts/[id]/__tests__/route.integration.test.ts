/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para /api/crm/contacts/[id]
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

describe('/api/crm/contacts/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('debe obtener un contacto por ID', async () => {
      const mockContacto = {
        id: 1,
        documentId: 'doc1',
        attributes: {
          nombre_completo: 'Juan Pérez',
          nombres: 'Juan',
          primer_apellido: 'Pérez',
          rut: '12345678-9',
          emails: [],
          telefonos: [],
          imagen: null,
          tags: [],
          trayectorias: { data: [] },
          empresa_contactos: { data: [] },
        },
      }

      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: mockContacto,
        } as any)
        .mockResolvedValueOnce({
          data: [],
        } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts/1')
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.nombre_completo).toBe('Juan Pérez')
      expect(mockStrapiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/personas/1')
      )
    })

    it('debe obtener contacto con trayectorias y colegios', async () => {
      const mockContacto = {
        id: 1,
        documentId: 'doc1',
        attributes: {
          nombre_completo: 'Juan Pérez',
          nombres: 'Juan',
          trayectorias: {
            data: [
              {
                id: 1,
                attributes: {
                  cargo: 'Profesor',
                  is_current: true,
                  colegio: {
                    data: {
                      id: 1,
                      attributes: {
                        colegio_nombre: 'Colegio Test',
                        rbd: '12345',
                        dependencia: 'Particular',
                        comuna: {
                          data: {
                            attributes: {
                              comuna_nombre: 'Santiago',
                              region_nombre: 'Región Metropolitana',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
          empresa_contactos: { data: [] },
          emails: [],
          telefonos: [],
          imagen: null,
          tags: [],
        },
      }

      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: mockContacto,
        } as any)
        .mockResolvedValueOnce({
          data: [],
        } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts/1')
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.trayectorias).toBeDefined()
      expect(data.data.trayectorias.length).toBeGreaterThan(0)
      expect(data.data.colegios).toBeDefined()
    })

    it('debe obtener contacto con actividades', async () => {
      const mockContacto = {
        id: 1,
        documentId: 'doc1',
        attributes: {
          nombre_completo: 'Juan Pérez',
          nombres: 'Juan',
          trayectorias: { data: [] },
          empresa_contactos: { data: [] },
          emails: [],
          telefonos: [],
          imagen: null,
          tags: [],
        },
      }

      const mockActividades = [
        {
          id: 1,
          documentId: 'act1',
          attributes: {
            tipo: 'llamada',
            titulo: 'Llamada de seguimiento',
            descripcion: 'Llamada realizada',
            fecha: '2024-01-15',
            estado: 'completada',
            creado_por: {
              data: {
                id: 1,
                attributes: {
                  nombre_completo: 'Admin',
                  email: 'admin@example.com',
                },
              },
            },
          },
        },
      ]

      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: mockContacto,
        } as any)
        .mockResolvedValueOnce({
          data: mockActividades,
        } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts/1')
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.actividades).toBeDefined()
      expect(data.data.actividades.length).toBeGreaterThan(0)
      expect(data.data.actividades[0].tipo).toBe('llamada')
    })

    it('debe obtener contacto con empresa_contactos', async () => {
      const mockContacto = {
        id: 1,
        documentId: 'doc1',
        attributes: {
          nombre_completo: 'Juan Pérez',
          nombres: 'Juan',
          empresa_contactos: {
            data: [
              {
                id: 1,
                attributes: {
                  cargo: 'Gerente',
                  empresa: {
                    data: {
                      id: 1,
                      attributes: {
                        empresa_nombre: 'Empresa Test',
                      },
                    },
                  },
                },
              },
            ],
          },
          trayectorias: { data: [] },
          emails: [],
          telefonos: [],
          imagen: null,
          tags: [],
        },
      }

      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: mockContacto,
        } as any)
        .mockResolvedValueOnce({
          data: [],
        } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts/1')
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.empresa_contactos).toBeDefined()
      expect(data.data.empresa_contactos.length).toBeGreaterThan(0)
    })

    it('debe retornar 404 si el contacto no existe', async () => {
      const error: any = new Error('Not found')
      error.status = 404

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts/999')
      const response = await GET(request, { params: Promise.resolve({ id: '999' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('no encontrado')
    })

    it('debe manejar errores de autenticación', async () => {
      const error: any = new Error('Unauthorized')
      error.status = 401

      mockStrapiClient.get.mockRejectedValueOnce(error)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts/1')
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('debe intentar buscar por ID numérico si falla con documentId', async () => {
      const error: any = new Error('Not found')
      error.status = 404

      const mockContacto = {
        id: 1,
        documentId: 'doc1',
        attributes: {
          nombre_completo: 'Juan Pérez',
          nombres: 'Juan',
          trayectorias: { data: [] },
          empresa_contactos: { data: [] },
          emails: [],
          telefonos: [],
          imagen: null,
          tags: [],
        },
      }

      mockStrapiClient.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          data: [mockContacto],
        } as any)
        .mockResolvedValueOnce({
          data: [],
        } as any)

      const request = new NextRequest('http://localhost:3000/api/crm/contacts/1')
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockStrapiClient.get).toHaveBeenCalledTimes(3) // Primera falla, luego búsqueda por ID, luego actividades
    })

    it('debe manejar errores al obtener actividades', async () => {
      const mockContacto = {
        id: 1,
        documentId: 'doc1',
        attributes: {
          nombre_completo: 'Juan Pérez',
          nombres: 'Juan',
          trayectorias: { data: [] },
          empresa_contactos: { data: [] },
          emails: [],
          telefonos: [],
          imagen: null,
          tags: [],
        },
      }

      mockStrapiClient.get
        .mockResolvedValueOnce({
          data: mockContacto,
        } as any)
        .mockRejectedValueOnce(new Error('Error al obtener actividades'))

      const request = new NextRequest('http://localhost:3000/api/crm/contacts/1')
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      // Debe continuar sin actividades si hay error
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.actividades).toEqual([])
    })
  })
})

