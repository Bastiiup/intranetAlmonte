'use client'

import { useEffect, useState, useRef } from 'react'
import { Container, Alert, Spinner, ListGroup, Badge } from 'react-bootstrap'
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

interface Colaborador {
  id: number
  attributes?: {
    email_login: string
    persona?: {
      id: number
      nombre_completo?: string
      nombres?: string
      primer_apellido?: string
      imagen?: {
        url?: string
      }
    }
  }
  // También puede venir sin attributes (ya procesado)
  email_login?: string
  persona?: {
    id: number
    nombre_completo?: string
    nombres?: string
    primer_apellido?: string
    imagen?: {
      url?: string
    }
  }
}

const Page = () => {
  const { colaborador, persona } = useAuth()
  const [chatClient, setChatClient] = useState<StreamChat | null>(null)
  const [channel, setChannel] = useState<any>(null)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const clientRef = useRef<StreamChat | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

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
        currentUserIdRef.current = userId

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

        // 5. Cargar lista de colaboradores
        await loadColaboradores()

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

  // Cargar lista de colaboradores
  const loadColaboradores = async () => {
    try {
      setIsLoadingContacts(true)
      const response = await fetch('/api/chat/colaboradores', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al cargar colaboradores')
      }

      const data = await response.json()
      const colaboradoresData = Array.isArray(data.data) ? data.data : []
      
      // Normalizar los datos (pueden venir con o sin attributes)
      const normalized = colaboradoresData.map((col: any) => {
        // Si tiene attributes, extraer los datos
        if (col.attributes) {
          return {
            id: col.id,
            email_login: col.attributes.email_login,
            persona: col.attributes.persona,
          }
        }
        // Si no tiene attributes, usar directamente
        return {
          id: col.id,
          email_login: col.email_login,
          persona: col.persona,
        }
      })
      
      // Filtrar el usuario actual de la lista
      const currentUserId = String(colaborador?.id)
      const filtered = normalized.filter((col: Colaborador) => String(col.id) !== currentUserId)
      
      setColaboradores(filtered)
    } catch (err: any) {
      console.error('[Chat] Error al cargar colaboradores:', err)
    } finally {
      setIsLoadingContacts(false)
    }
  }

  // Crear o seleccionar canal con un colaborador
  const selectColaborador = async (colaboradorId: string) => {
    if (!chatClient || !currentUserIdRef.current) {
      console.error('[Chat] No hay chatClient o currentUserId:', { chatClient: !!chatClient, currentUserId: currentUserIdRef.current })
      return
    }

    try {
      // Normalizar IDs a strings para asegurar consistencia
      const currentUserId = String(currentUserIdRef.current)
      const otherUserId = String(colaboradorId)

      // Verificar que no sea el mismo usuario
      if (currentUserId === otherUserId) {
        console.error('[Chat] Error: Intento de chatear consigo mismo:', currentUserId)
        setError('No puedes chatear contigo mismo')
        return
      }

      console.log('[Chat] Seleccionando colaborador:', {
        currentUserId,
        otherUserId,
        colaboradorId,
      })

      setSelectedColaboradorId(otherUserId)
      setError(null) // Limpiar errores previos
      
      // Primero asegurar que el usuario objetivo existe en Stream Chat
      const ensureUserResponse = await fetch('/api/chat/stream-ensure-user', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ colaboradorId: otherUserId }),
      })

      if (!ensureUserResponse.ok) {
        const errorData = await ensureUserResponse.json()
        throw new Error(errorData.error || 'Error al asegurar usuario en Stream')
      }

      // Crear ID de canal único para conversación 1-a-1
      // Ordenamos los IDs para que siempre sea el mismo canal independiente del orden
      const userIds = [currentUserId, otherUserId].sort()
      const channelId = `direct-${userIds.join('-')}`

      console.log('[Chat] Creando canal:', {
        channelId,
        userIds,
        members: [currentUserId, otherUserId],
      })

      // Obtener o crear canal
      // IMPORTANTE: Pasar los miembros en la configuración inicial
      // Stream Chat usará esto tanto si el canal existe como si es nuevo
      const channel = chatClient.channel('messaging', channelId, {
        members: [currentUserId, otherUserId],
      })

      // watch() crea el canal si no existe, o se suscribe si ya existe
      // Esto es necesario para recibir mensajes en tiempo real
      // IMPORTANTE: watch() también carga los mensajes históricos
      await channel.watch()
      
      // Cargar mensajes históricos explícitamente
      // Esto asegura que todos los mensajes del canal se carguen
      await channel.query({
        messages: { limit: 50 },
        members: { limit: 10 },
      })
      
      // Verificar que el canal tiene los miembros correctos
      const members = channel.state.members || {}
      const memberIds = Object.keys(members)
      const messages = channel.state.messages || []
      
      console.log('[Chat] Canal listo:', {
        channelId,
        memberIds,
        membersCount: memberIds.length,
        messageCount: messages.length,
        messages: messages.map((m: any) => ({
          id: m.id,
          text: m.text,
          user: m.user?.id,
        })),
      })
      
      // Verificar que ambos usuarios están en el canal
      if (!memberIds.includes(currentUserId) || !memberIds.includes(otherUserId)) {
        console.warn('[Chat] Advertencia: El canal no tiene los miembros esperados', {
          expected: [currentUserId, otherUserId],
          actual: memberIds,
        })
      }
      
      setChannel(channel)
    } catch (err: any) {
      console.error('[Chat] Error al seleccionar colaborador:', err)
      setError(err.message || 'Error al abrir conversación')
      setSelectedColaboradorId(null)
      setChannel(null)
    }
  }

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

  if (!chatClient) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <Alert variant="warning">No se pudo inicializar el chat. Por favor, recarga la página.</Alert>
      </Container>
    )
  }

  const getColaboradorName = (col: Colaborador) => {
    // Manejar ambos formatos: con attributes o sin attributes
    const persona = col.attributes?.persona || col.persona
    const email = col.attributes?.email_login || col.email_login
    
    return persona?.nombre_completo ||
           `${persona?.nombres || ''} ${persona?.primer_apellido || ''}`.trim() ||
           email ||
           'Usuario'
  }

  const getColaboradorAvatar = (col: Colaborador) => {
    // Manejar ambos formatos: con attributes o sin attributes
    const persona = col.attributes?.persona || col.persona
    
    if (persona?.imagen?.url) {
      return `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.url}`
    }
    return undefined
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Chat" subtitle="Apps" />
      <div style={{ height: 'calc(100vh - 200px)', display: 'flex', gap: '1rem' }}>
        {/* Lista de contactos */}
        <div style={{ width: '300px', border: '1px solid #dee2e6', borderRadius: '0.375rem', backgroundColor: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
            <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Contactos</h5>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoadingContacts ? (
              <div className="d-flex justify-content-center p-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : colaboradores.length === 0 ? (
              <div className="p-3 text-center text-muted">
                <small>No hay contactos disponibles</small>
              </div>
            ) : (
              <ListGroup variant="flush">
                {colaboradores.map((col) => {
                  const isSelected = selectedColaboradorId === String(col.id)
                  return (
                    <ListGroup.Item
                      key={col.id}
                      action
                      active={isSelected}
                      onClick={() => selectColaborador(String(col.id))}
                      style={{ 
                        cursor: 'pointer',
                        border: 'none',
                        borderBottom: '1px solid #dee2e6',
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <div className="d-flex align-items-center">
                        {getColaboradorAvatar(col) ? (
                          <img
                            src={getColaboradorAvatar(col)}
                            alt={getColaboradorName(col)}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              marginRight: '0.75rem',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: isSelected ? '#fff' : '#6c757d',
                              color: isSelected ? '#0d6efd' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '0.75rem',
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                            }}
                          >
                            {getColaboradorName(col).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getColaboradorName(col)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.8)' : '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {col.attributes?.email_login || col.email_login || ''}
                          </div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  )
                })}
              </ListGroup>
            )}
          </div>
        </div>

        {/* Área de chat */}
        <div style={{ flex: 1, border: '1px solid #dee2e6', borderRadius: '0.375rem', backgroundColor: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!channel ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#6c757d' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <h5>Selecciona un contacto para comenzar a chatear</h5>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Elige a alguien de la lista de la izquierda</p>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Chat client={chatClient}>
                <Channel channel={channel}>
                  <Window>
                    <ChannelHeader />
                    <MessageList 
                      // Cargar mensajes históricos
                      loadMore={async () => {
                        await channel.loadMoreMessages(50)
                      }}
                    />
                    <MessageInput />
                  </Window>
                  <Thread />
                </Channel>
              </Chat>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

export default Page
