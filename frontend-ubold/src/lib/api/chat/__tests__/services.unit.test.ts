/**
 * Pruebas unitarias para los servicios del módulo de chat
 */

import {
  buildChatQueries,
  extractChatMessages,
  combineAndSortMessages,
} from '../services'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import type { ChatMensajeAttributes, ChatMensaje } from '../services'

// Mock del cliente de Strapi
jest.mock('@/lib/strapi/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

describe('Chat Services', () => {
  describe('buildChatQueries', () => {
    it('debe construir queries correctamente sin fecha', () => {
      const { query1, query2 } = buildChatQueries(1, 2)

      expect(query1).toContain('remitente_id][$eq]=1')
      expect(query1).toContain('cliente_id][$eq]=2')
      expect(query2).toContain('remitente_id][$eq]=2')
      expect(query2).toContain('cliente_id][$eq]=1')
      // Las queries siempre contienen sort=fecha:asc, pero no filtro de fecha
      expect(query1).not.toContain('filters[fecha]')
      expect(query2).not.toContain('filters[fecha]')
    })

    it('debe agregar filtro de fecha solo a query1', () => {
      const fecha = new Date().toISOString()
      const { query1, query2 } = buildChatQueries(1, 2, fecha)

      expect(query1).toContain('filters[fecha]')
      expect(query2).not.toContain('filters[fecha]')
    })

    it('debe manejar fecha inválida sin error', () => {
      const { query1, query2 } = buildChatQueries(1, 2, 'fecha-invalida')

      expect(query1).not.toContain('filters[fecha]')
      expect(query2).not.toContain('filters[fecha]')
    })
  })

  describe('extractChatMessages', () => {
    it('debe extraer mensajes de un array de datos', () => {
      const response: StrapiResponse<StrapiEntity<ChatMensajeAttributes>> = {
        data: [
          {
            id: 1,
            attributes: {
              texto: 'Hola',
              remitente_id: 1,
              cliente_id: 2,
              fecha: '2024-01-01T00:00:00Z',
              leido: false,
            },
          },
        ],
      }

      const messages = extractChatMessages(response)

      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe(1)
      expect(messages[0].texto).toBe('Hola')
    })

    it('debe extraer mensaje único de datos', () => {
      const response: StrapiResponse<StrapiEntity<ChatMensajeAttributes>> = {
        data: {
          id: 1,
          attributes: {
            texto: 'Hola',
            remitente_id: 1,
            cliente_id: 2,
            fecha: '2024-01-01T00:00:00Z',
            leido: false,
          },
        },
      }

      const messages = extractChatMessages(response)

      expect(messages).toHaveLength(1)
      expect(messages[0].texto).toBe('Hola')
    })

    it('debe retornar array vacío cuando no hay datos', () => {
      const response: StrapiResponse<StrapiEntity<ChatMensajeAttributes>> = {
        data: null,
      }

      const messages = extractChatMessages(response)

      expect(messages).toHaveLength(0)
    })
  })

  describe('combineAndSortMessages', () => {
    it('debe combinar y ordenar mensajes por fecha', () => {
      const messages1: ChatMensaje[] = [
        {
          id: 1,
          texto: 'Primero',
          remitente_id: 1,
          cliente_id: 2,
          fecha: '2024-01-01T10:00:00Z',
          leido: false,
        },
      ]

      const messages2: ChatMensaje[] = [
        {
          id: 2,
          texto: 'Segundo',
          remitente_id: 2,
          cliente_id: 1,
          fecha: '2024-01-01T11:00:00Z',
          leido: false,
        },
      ]

      const combined = combineAndSortMessages(messages1, messages2)

      expect(combined).toHaveLength(2)
      expect(combined[0].texto).toBe('Primero')
      expect(combined[1].texto).toBe('Segundo')
    })

    it('debe ordenar correctamente cuando los mensajes están desordenados', () => {
      const messages1: ChatMensaje[] = [
        {
          id: 2,
          texto: 'Segundo',
          remitente_id: 1,
          cliente_id: 2,
          fecha: '2024-01-01T11:00:00Z',
          leido: false,
        },
      ]

      const messages2: ChatMensaje[] = [
        {
          id: 1,
          texto: 'Primero',
          remitente_id: 2,
          cliente_id: 1,
          fecha: '2024-01-01T10:00:00Z',
          leido: false,
        },
      ]

      const combined = combineAndSortMessages(messages1, messages2)

      expect(combined[0].texto).toBe('Primero')
      expect(combined[1].texto).toBe('Segundo')
    })
  })
})
