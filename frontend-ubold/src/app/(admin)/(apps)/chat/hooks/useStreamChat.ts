/**
 * Hook personalizado para manejar la conexión y canal de Stream Chat
 */

import { useEffect, useState, useCallback } from 'react'
import { StreamChat, Channel, Message } from 'stream-chat'
import { MessageType } from '../types'

interface UseStreamChatReturn {
  client: StreamChat | null
  channel: Channel | null
  isLoading: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  messages: MessageType[]
}

export function useStreamChat(
  userId: string | null,
  otherUserId: string | null
): UseStreamChatReturn {
  const [client, setClient] = useState<StreamChat | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageType[]>([])

  // Función helper para convertir mensajes de Stream a MessageType
  const transformStreamMessage = useCallback((streamMessage: any): MessageType => {
    const createdAt = streamMessage.created_at 
      ? new Date(streamMessage.created_at)
      : new Date()
    
    return {
      id: streamMessage.id || String(Date.now()),
      senderId: streamMessage.user?.id || streamMessage.user_id || '',
      text: streamMessage.text || '',
      time: createdAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    }
  }, [])

  // Conectar a Stream Chat
  useEffect(() => {
    if (!userId || !otherUserId) {
      setClient(null)
      setChannel(null)
      setIsLoading(false)
      return
    }

    let streamClient: StreamChat | null = null

    const initializeStream = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 1. Obtener token de autenticación del backend
        const tokenResponse = await fetch('/api/chat/stream-token', {
          method: 'POST',
          credentials: 'include',
        })

        if (!tokenResponse.ok) {
          throw new Error('Error al obtener token de Stream Chat')
        }

        const { token, userId: authenticatedUserId } = await tokenResponse.json()

        // 2. Obtener API Key pública
        const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
        if (!apiKey) {
          throw new Error('NEXT_PUBLIC_STREAM_CHAT_API_KEY no está configurada')
        }

        // 3. Inicializar cliente de Stream (frontend)
        streamClient = StreamChat.getInstance(apiKey)

        // 4. Conectar usuario
        await streamClient.connectUser(
          {
            id: authenticatedUserId,
            name: userId, // Se actualizará con el perfil real desde el servidor
          },
          token
        )

        setClient(streamClient)

        // 5. Crear o obtener canal 1-a-1
        // El ID del canal debe ser consistente entre ambos usuarios
        // Ordenamos los IDs para asegurar que ambos usuarios usen el mismo ID
        const memberIds = [authenticatedUserId, otherUserId].sort()
        const channelId = `chat-${memberIds[0]}-${memberIds[1]}`

        const streamChannel = streamClient.channel('messaging', channelId, {
          members: [authenticatedUserId, otherUserId],
        })

        // Watch el canal (esto crea el canal si no existe y obtiene mensajes)
        await streamChannel.watch()

        setChannel(streamChannel)

        // 6. Suscribirse a nuevos mensajes
        streamChannel.on('message.new', (event) => {
          if (!event.message) return
          setMessages((prev) => {
            // Evitar duplicados
            const messageExists = prev.some((m) => m.id === event.message?.id)
            if (messageExists) return prev
            const transformedMessage = transformStreamMessage(event.message)
            return [...prev, transformedMessage]
          })
        })

        // 7. Cargar mensajes iniciales
        const state = await streamChannel.state
        const streamMessages = state.messages || []
        // Los mensajes de Stream ya vienen ordenados, solo transformarlos
        const transformedMessages = streamMessages.map((msg: any) => transformStreamMessage(msg))
        setMessages(transformedMessages)

        setIsLoading(false)
      } catch (err: any) {
        console.error('[useStreamChat] Error:', err)
        setError(err.message || 'Error al conectar con Stream Chat')
        setIsLoading(false)
      }
    }

    initializeStream()

    // Cleanup: desconectar cuando el componente se desmonte
    return () => {
      if (streamClient) {
        streamClient.disconnectUser().catch(console.error)
      }
    }
  }, [userId, otherUserId])

  // Función para enviar mensajes
  const sendMessage = useCallback(
    async (text: string) => {
      if (!channel || !text.trim()) return

      try {
        await channel.sendMessage({
          text: text.trim(),
        })
      } catch (err: any) {
        console.error('[useStreamChat] Error al enviar mensaje:', err)
        throw err
      }
    },
    [channel]
  )

  return {
    client,
    channel,
    isLoading,
    error,
    sendMessage,
    messages,
  }
}

