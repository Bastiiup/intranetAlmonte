'use client'

import { useEffect, useState, useRef } from 'react'
import { Container, Alert, Spinner } from 'react-bootstrap'
import { StreamChat } from 'stream-chat'
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
} from 'stream-chat-react'
import 'stream-chat-react/dist/css/v2/index.css'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { useAuth } from '@/hooks/useAuth'

const Page = () => {
  const { colaborador, persona } = useAuth()
  const [chatClient, setChatClient] = useState<StreamChat | null>(null)
  const [channel, setChannel] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const clientRef = useRef<StreamChat | null>(null)

  useEffect(() => {
    // Prevenir múltiples inicializaciones
    if (initializedRef.current || !colaborador?.id) {
          return
        }

    const initStreamChat = async () => {
      try {
        initializedRef.current = true
        setIsLoading(true)
        setError(null)

        // 1. Obtener token del backend
        const tokenResponse = await fetch('/api/chat/stream-token', {
          method: 'POST',
          credentials: 'include',
        })

        if (!tokenResponse.ok) {
          throw new Error('Error al obtener token de Stream Chat')
        }

        const { token, userId } = await tokenResponse.json()

        // 2. Obtener API Key (acepta ambos nombres para compatibilidad)
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
        console.log('[Chat] API Key disponible:', apiKey ? 'Sí (oculta)' : 'NO')
        if (!apiKey) {
          console.error('[Chat] ❌ NEXT_PUBLIC_STREAM_API_KEY (o NEXT_PUBLIC_STREAM_CHAT_API_KEY) no está configurada. Verifica:')
          console.error('[Chat] 1. Que la variable esté en Railway')
          console.error('[Chat] 2. Que Railway haya hecho un rebuild después de agregar la variable')
          throw new Error('NEXT_PUBLIC_STREAM_API_KEY no está configurada. La variable se inyecta en tiempo de build, necesitas hacer un rebuild en Railway.')
        }

        // 3. Crear cliente de Stream Chat
        const client = StreamChat.getInstance(apiKey)
        clientRef.current = client

        // 4. Conectar usuario
        await client.connectUser(
          {
            id: userId,
            name:
              persona?.nombre_completo ||
              `${persona?.nombres || ''} ${persona?.primer_apellido || ''}`.trim() ||
              colaborador?.email_login ||
              'Usuario',
            image: persona?.imagen?.url
              ? `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.url}`
              : undefined,
          },
          token
        )

        setChatClient(client)

        // 5. Crear canal de prueba
        // IMPORTANTE: El channelId NO debe incluir el tipo 'messaging:'
        // Solo debe ser el ID del canal (ej: 'general-98', no 'messaging:98')
        // El tipo se pasa como primer parámetro a client.channel()
        const channelId = `general-${userId}` // ID único sin el tipo
        const channel = client.channel('messaging', channelId, {
          members: [userId],
        })

        await channel.watch()
        setChannel(channel)

        setIsLoading(false)
    } catch (err: any) {
        console.error('[Chat] Error al inicializar Stream Chat:', err)
        setError(err.message || 'Error al conectar con Stream Chat')
        setIsLoading(false)
        initializedRef.current = false // Permitir reintento en caso de error
        clientRef.current = null
      }
    }

    initStreamChat()

    // Cleanup
    return () => {
      initializedRef.current = false
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(console.error)
        clientRef.current = null
      }
    }
  }, [colaborador?.id, persona?.nombre_completo, persona?.nombres, persona?.primer_apellido, persona?.imagen?.url, colaborador?.email_login])

  if (isLoading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" />
          <span className="ms-2">Conectando con Stream Chat...</span>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
          <br />
          <small>Verifica que NEXT_PUBLIC_STREAM_API_KEY esté configurada correctamente.</small>
        </Alert>
      </Container>
    )
  }

  if (!chatClient || !channel) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <Alert variant="warning">No se pudo inicializar el chat. Por favor, recarga la página.</Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Chat" subtitle="Apps" />
      <div style={{ height: 'calc(100vh - 200px)', position: 'relative' }}>
        <Chat client={chatClient}>
          <Channel channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput />
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>
    </Container>
  )
}

export default Page
