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
    activo?: boolean
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
  activo?: boolean
  persona?: {
    id: number
    nombre_completo?: string
    nombres?: string
    primer_apellido?: string
    segundo_apellido?: string
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
  const [isCreatingChannel, setIsCreatingChannel] = useState(false) // Estado para prevenir renderizado prematuro
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const currentUserIdRef = useRef<string | null>(null)

  // Inicializar Stream Chat Client
  useEffect(() => {
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

        // 2. Obtener API Key
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
        if (!apiKey) {
          throw new Error('NEXT_PUBLIC_STREAM_API_KEY no está configurada')
        }

        // 3. Crear cliente de Stream Chat
        const client = StreamChat.getInstance(apiKey)

        // 4. Conectar usuario
        await client.connectUser(
          {
            id: userId,
            name: persona?.nombre_completo || colaborador?.attributes?.email_login || 'Usuario',
          },
          token
        )

        setChatClient(client)
        console.log('[Chat] ✅ Cliente de Stream Chat inicializado')

        // 5. Cargar lista de colaboradores
        await loadColaboradores()
      } catch (err: any) {
        console.error('[Chat] Error al inicializar Stream Chat:', err)
        setError(err.message || 'Error al inicializar el chat')
      } finally {
        setIsLoading(false)
      }
    }

    initStreamChat()

    // Cleanup al desmontar
    return () => {
      if (chatClient) {
        chatClient.disconnectUser().catch(console.error)
      }
    }
  }, [colaborador?.id])

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
      
      // Normalizar datos de Strapi (pueden venir con o sin attributes)
      const colaboradoresData = Array.isArray(data.data) ? data.data : []
      
      const normalized = colaboradoresData
        .map((col: any) => {
          // Extraer datos del colaborador
          const colaboradorAttrs = col.attributes || col
          const personaData = colaboradorAttrs.persona || null
          
          // Normalizar estructura
          return {
            id: col.id,
            email_login: colaboradorAttrs.email_login,
            activo: colaboradorAttrs.activo !== false, // Default true
            persona: personaData ? {
              id: personaData.id || personaData.documentId,
              nombres: personaData.nombres,
              primer_apellido: personaData.primer_apellido,
              segundo_apellido: personaData.segundo_apellido,
              nombre_completo: personaData.nombre_completo,
              imagen: personaData.imagen ? {
                url: personaData.imagen.url || (personaData.imagen.data?.attributes?.url),
              } : undefined,
            } : undefined,
          }
        })
        // Filtrar solo activos
        .filter((col: Colaborador) => col.activo !== false)
        // Filtrar el usuario actual
        .filter((col: Colaborador) => String(col.id) !== String(colaborador?.id))
      
      console.log('[Chat] Colaboradores cargados:', {
        total: normalized.length,
        sample: normalized[0] ? {
          id: normalized[0].id,
          email: normalized[0].email_login,
          nombre: normalized[0].persona?.nombre_completo,
        } : null,
      })
      
      setColaboradores(normalized)
    } catch (err: any) {
      console.error('[Chat] Error al cargar colaboradores:', err)
      setError(err.message || 'Error al cargar contactos')
    } finally {
      setIsLoadingContacts(false)
    }
  }

  // Seleccionar colaborador y crear/abrir canal
  const selectColaborador = async (colaboradorId: string) => {
    if (!chatClient || !currentUserIdRef.current) {
      console.error('[Chat] No hay chatClient o currentUserId')
      return
    }

    // Limpieza inmediata: resetear canal anterior
    setChannel(null)
    setSelectedColaboradorId(colaboradorId)
    setError(null)
    setIsCreatingChannel(true)

    try {
      // 1. Asegurar que ambos IDs sean strings para evitar errores de ordenamiento
      const myId = String(currentUserIdRef.current)
      const otherId = String(colaboradorId)

      // Verificar que no sea el mismo usuario
      if (myId === otherId) {
        setError('No puedes chatear contigo mismo')
        setIsCreatingChannel(false)
        return
      }

      // 2. DEBUG OBLIGATORIO: Imprimir en consola con console.error para que destaque
      console.error('🕵️ DEBUG CHAT:')
      console.error('YO SOY:', myId, 'tipo:', typeof myId)
      console.error('EL OTRO ES:', otherId, 'tipo:', typeof otherId)
      const sortedIds = [myId, otherId].sort()
      console.error('IDS ORDENADOS:', sortedIds)
      const channelId = `messaging-${sortedIds.join('-')}`
      console.error('ID FINAL DEL CANAL:', channelId)

      // Asegurar que el usuario objetivo existe en Stream Chat
      const ensureUserResponse = await fetch('/api/chat/stream-ensure-user', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ colaboradorId: otherId }),
      })

      if (!ensureUserResponse.ok) {
        const errorData = await ensureUserResponse.json()
        throw new Error(errorData.error || 'Error al asegurar usuario en Stream')
      }

      // Crear o recuperar canal
      // IMPORTANTE: Usar los IDs convertidos a String y ordenados
      const channel = chatClient.channel('messaging', channelId, {
        members: [myId, otherId],
      })

      // CRÍTICO: Esperar a que watch() complete antes de establecer el canal
      // Esto previene el error getConfig is not a function
      await channel.watch()

      // Cargar mensajes históricos
      await channel.query({
        messages: { limit: 100 },
        members: { limit: 10 },
      })

      // Verificar que el canal tenga estado antes de establecerlo
      if (!channel.state) {
        throw new Error('El canal no tiene estado inicializado')
      }

      console.log('[Chat] ✅ Canal listo:', {
        channelId: channel.id,
        messagesCount: channel.state.messages?.length || 0,
        membersCount: Object.keys(channel.state.members || {}).length,
      })

      // Solo establecer el canal después de que watch() haya completado
      setChannel(channel)
      setIsCreatingChannel(false)
    } catch (err: any) {
      console.error('[Chat] Error al seleccionar colaborador:', err)
      setError(err.message || 'Error al abrir conversación')
      setSelectedColaboradorId(null)
      setChannel(null)
      setIsCreatingChannel(false)
    }
  }

  // Obtener nombre del colaborador
  const getColaboradorName = (col: Colaborador) => {
    const persona = col.attributes?.persona || col.persona
    if (persona?.nombre_completo) {
      return persona.nombre_completo
    }
    if (persona?.nombres && persona?.primer_apellido) {
      return `${persona.nombres} ${persona.primer_apellido}`
    }
    return col.attributes?.email_login || col.email_login || 'Sin nombre'
  }

  // Obtener avatar del colaborador
  const getColaboradorAvatar = (col: Colaborador) => {
    const persona = col.attributes?.persona || col.persona
    if (persona?.imagen?.url) {
      return `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.url}`
    }
    return undefined
  }

  // Renderizar loading inicial
  if (isLoading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </Container>
    )
  }

  // Renderizar error si no hay cliente
  if (!chatClient) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" />
        <Alert variant="danger">
          {error || 'Error al inicializar el chat. Por favor recarga la página.'}
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Chat" />
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 200px)', gap: '1rem' }}>
        {/* Lista de contactos */}
        <div style={{ width: '300px', border: '1px solid #dee2e6', borderRadius: '0.375rem', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>
            Contactos
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoadingContacts ? (
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <Spinner animation="border" size="sm" />
              </div>
            ) : colaboradores.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#6c757d' }}>
                No hay contactos disponibles
              </div>
            ) : (
              <ListGroup variant="flush">
                {colaboradores.map((col) => {
                  const colId = String(col.id)
                  const isSelected = selectedColaboradorId === colId
                  return (
                    <ListGroup.Item
                      key={col.id}
                      action
                      active={isSelected}
                      onClick={() => selectColaborador(colId)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: isSelected ? '#0d6efd' : 'transparent',
                        color: isSelected ? 'white' : 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#e9ecef',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            color: isSelected ? 'white' : '#6c757d',
                            flexShrink: 0,
                          }}
                        >
                          {getColaboradorName(col).charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: isSelected ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          {!selectedColaboradorId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#6c757d' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <h5>Selecciona un contacto para comenzar a chatear</h5>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Elige a alguien de la lista de la izquierda</p>
            </div>
          ) : isCreatingChannel || !channel ? (
            // NO renderizar Channel hasta que watch() haya completado
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#6c757d' }}>
              <Spinner animation="border" variant="primary" style={{ marginBottom: '1rem' }} />
              <h5>Cargando conversación...</h5>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Por favor espera mientras se inicializa el chat</p>
            </div>
          ) : (
            // Renderizar Channel solo cuando esté completamente listo
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Chat client={chatClient}>
                <Channel 
                  channel={channel}
                  key={channel.id}
                >
                  <Window>
                    <ChannelHeader />
                    <MessageList />
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
