/**
 * @jest-environment node
 */

/**
 * Pruebas de integración para la ruta de mensajes de chat
 */

import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

// Mock de los servicios
jest.mock('@/lib/api/chat/services', () => ({
  getChatMessages: jest.fn(),
  sendChatMessage: jest.fn(),
}))

// Mock de los validadores
jest.mock('@/lib/api/chat/validators', () => ({
  validateGetMessagesParams: jest.fn(),
  validateSendMessageParams: jest.fn(),
}))

import { getChatMessages, sendChatMessage } from '@/lib/api/chat/services'
import { validateGetMessagesParams, validateSendMessageParams } from '@/lib/api/chat/validators'

const mockGetChatMessages = getChatMessages as jest.MockedFunction<typeof getChatMessages>
const mockSendChatMessage = sendChatMessage as jest.MockedFunction<typeof sendChatMessage>
const mockValidateGetMessagesParams = validateGetMessagesParams as jest.MockedFunction<typeof validateGetMessagesParams>
const mockValidateSendMessageParams = validateSendMessageParams as jest.MockedFunction<typeof validateSendMessageParams>

describe('Chat Messages API Route - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/chat/mensajes', () => {
    it('debe retornar mensajes cuando los parámetros son válidos', async () => {
      const mockMessages = [
        {
          id: 1,
          texto: 'Hola',
          remitente_id: 1,
          cliente_id: 2,
          fecha: '2024-01-01T00:00:00Z',
          leido: false,
        },
      ]

      mockValidateGetMessagesParams.mockReturnValue({ valid: true })
      mockGetChatMessages.mockResolvedValue(mockMessages)

      const url = new URL('http://localhost/api/chat/mensajes')
      url.searchParams.set('colaborador_id', '2')
      url.searchParams.set('remitente_id', '1')

      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual(mockMessages)
      expect(mockGetChatMessages).toHaveBeenCalledWith(1, 2, null)
    })

    it('debe retornar error 400 cuando la validación falla', async () => {
      mockValidateGetMessagesParams.mockReturnValue({
        valid: false,
        error: 'Parámetros inválidos',
      })

      const url = new URL('http://localhost/api/chat/mensajes')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Parámetros inválidos')
      expect(mockGetChatMessages).not.toHaveBeenCalled()
    })

    it('debe manejar errores correctamente', async () => {
      mockValidateGetMessagesParams.mockReturnValue({ valid: true })
      mockGetChatMessages.mockRejectedValue({
        status: 500,
        message: 'Error del servidor',
      })

      const url = new URL('http://localhost/api/chat/mensajes')
      url.searchParams.set('colaborador_id', '2')
      url.searchParams.set('remitente_id', '1')

      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Error del servidor')
    })

    it('debe retornar array vacío cuando el error es 404', async () => {
      mockValidateGetMessagesParams.mockReturnValue({ valid: true })
      mockGetChatMessages.mockRejectedValue({ status: 404 })

      const url = new URL('http://localhost/api/chat/mensajes')
      url.searchParams.set('colaborador_id', '2')
      url.searchParams.set('remitente_id', '1')

      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual([])
    })
  })

  describe('POST /api/chat/mensajes', () => {
    it('debe enviar un mensaje cuando los parámetros son válidos', async () => {
      const mockResponse = {
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

      mockValidateSendMessageParams.mockReturnValue({ valid: true })
      mockSendChatMessage.mockResolvedValue(mockResponse as any)

      const request = new NextRequest('http://localhost/api/chat/mensajes', {
        method: 'POST',
        body: JSON.stringify({
          texto: 'Hola',
          colaborador_id: 2,
          remitente_id: 1,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body).toEqual(mockResponse)
      expect(mockSendChatMessage).toHaveBeenCalledWith('Hola', 1, 2)
    })

    it('debe retornar error 400 cuando la validación falla', async () => {
      mockValidateSendMessageParams.mockReturnValue({
        valid: false,
        error: 'Parámetros inválidos',
      })

      const request = new NextRequest('http://localhost/api/chat/mensajes', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Parámetros inválidos')
      expect(mockSendChatMessage).not.toHaveBeenCalled()
    })

    it('debe manejar errores correctamente', async () => {
      mockValidateSendMessageParams.mockReturnValue({ valid: true })
      mockSendChatMessage.mockRejectedValue({
        status: 500,
        message: 'Error del servidor',
      })

      const request = new NextRequest('http://localhost/api/chat/mensajes', {
        method: 'POST',
        body: JSON.stringify({
          texto: 'Hola',
          colaborador_id: 2,
          remitente_id: 1,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Error del servidor')
    })
  })
})




