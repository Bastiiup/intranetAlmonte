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
  const [isChannelReady, setIsChannelReady] = useState(false) // Estado explícito para controlar cuando el canal está listo
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

        // Suscribirse a eventos globales del cliente
        client.on('connection.changed', (event: any) => {
          console.log('[Chat] 🔌 Estado de conexión cambiado:', {
            online: event.online,
            type: event.type,
          })
        })

        client.on('error', (event: any) => {
          console.error('[Chat] ❌ Error en Stream Chat:', event)
        })

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

        console.log('[Chat] ✅ Usuario conectado:', userId)

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

  // Verificar que el canal esté completamente listo antes de permitir renderizado
  useEffect(() => {
    if (!channel || !isChannelReady) {
      return
    }

    // Verificación adicional: asegurar que el canal tenga todas las propiedades necesarias
    const verifyChannelReady = () => {
      if (!channel.state || !channel.id || !channel.cid) {
        console.warn('[Chat] ⚠️ Canal no está completamente listo, reseteando isChannelReady')
        setIsChannelReady(false)
        return false
      }
      return true
    }

    // Verificar inmediatamente
    if (!verifyChannelReady()) {
      return
    }

    // Verificar después de un breve delay para asegurar que el SDK terminó de inicializar
    const timeoutId = setTimeout(() => {
      if (!verifyChannelReady()) {
        return
      }
      console.log('[Chat] ✅ Verificación final: Canal completamente listo para renderizar')
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [channel, isChannelReady])

  // Monitorear cambios en el canal para debugging
  useEffect(() => {
    if (!channel || !isChannelReady) return

    const logChannelState = () => {
      const messages = channel.state?.messages || []
      const members = channel.state?.members || {}
      console.log('[Chat] 📊 Estado actual del canal:', {
        channelId: channel.id,
        messageCount: messages.length,
        memberCount: Object.keys(members).length,
        messages: messages.map((m: any) => ({
          id: m.id,
          text: m.text?.substring(0, 30),
          user: m.user?.id,
          userName: m.user?.name,
        })),
      })
    }

    // Log inicial
    logChannelState()

    // Log cuando cambian los mensajes
    const handleMessageNew = () => {
      console.log('[Chat] 📨 Nuevo mensaje detectado en el canal')
      logChannelState()
    }

    const handleMessageUpdated = () => {
      console.log('[Chat] ✏️ Mensaje actualizado en el canal')
      logChannelState()
    }

    channel.on('message.new', handleMessageNew)
    channel.on('message.updated', handleMessageUpdated)

    return () => {
      channel.off('message.new', handleMessageNew)
      channel.off('message.updated', handleMessageUpdated)
    }
  }, [channel, isChannelReady])

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

    // Resetear estado anterior si hay un canal previo
    if (channel) {
      setChannel(null)
      setIsChannelReady(false)
    }

    try {
      // 1. Asegurar que los IDs sean strings
      const currentId = String(currentUserIdRef.current)
      const otherId = String(colaboradorId)

      // Verificar que no sea el mismo usuario
      if (currentId === otherId) {
        console.error('[Chat] Error: Intento de chatear consigo mismo:', currentId)
        setError('No puedes chatear contigo mismo')
        return
      }

      console.log('[Chat] Seleccionando colaborador:', {
        currentId,
        otherId,
        colaboradorId,
      })

      setSelectedColaboradorId(otherId)
      setError(null) // Limpiar errores previos
      setIsChannelReady(false) // Resetear estado de canal listo
      
      // Primero asegurar que el usuario objetivo existe en Stream Chat
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

      // 2. Ordenar IDs alfabéticamente para garantizar consistencia
      // Esto asegura que direct-98-150 siempre sea direct-98-150, nunca direct-150-98
      const memberIds = [currentId, otherId].sort()

      // 3. Generar el ID único del canal
      const channelId = `direct-${memberIds.join('-')}`

      console.log('[Chat] Creando canal:', {
        channelId,
        memberIds,
        currentId,
        otherId,
      })

      // 4. Crear o recuperar el canal con el ID consistente
      const channel = chatClient.channel('messaging', channelId, {
        members: [currentId, otherId],
      })

      // 5. Suscribirse inmediatamente y asegurar que el canal esté completamente inicializado
      console.log('[Chat] Iniciando watch() del canal...')
      await channel.watch()
      
      // Cargar mensajes explícitamente para asegurar que estén disponibles
      console.log('[Chat] Cargando mensajes históricos...')
      try {
        await channel.query({
          messages: { limit: 100 },
          members: { limit: 10 },
        })
      } catch (queryErr: any) {
        console.warn('[Chat] Error en query:', queryErr)
      }
      
      // Verificar que el canal esté completamente inicializado
      // El canal debe tener state y estar listo antes de renderizar
      if (!channel.state) {
        throw new Error('El canal no tiene estado inicializado')
      }
      
      // Verificar mensajes cargados
      const loadedMessages = channel.state.messages || []
      console.log('[Chat] ✅ Mensajes cargados en el canal:', {
        count: loadedMessages.length,
        messages: loadedMessages.map((m: any) => ({
          id: m.id,
          text: m.text?.substring(0, 30),
          user: m.user?.id,
          userName: m.user?.name,
        })),
      })
      
      // Verificar miembros
      const members = Object.keys(channel.state.members || {})
      console.log('[Chat] Miembros del canal:', members)
      
      if (!members.includes(currentId) || !members.includes(otherId)) {
        console.warn('[Chat] ⚠️ Faltan miembros, agregando...')
        try {
          await channel.addMembers([currentId, otherId])
        } catch (addErr) {
          console.error('[Chat] Error al agregar miembros:', addErr)
        }
      }
      
      // Suscribirse a eventos para debugging y actualización
      channel.on('message.new', (event: any) => {
        console.log('[Chat] 📨 Nuevo mensaje recibido:', {
          id: event.message?.id,
          text: event.message?.text?.substring(0, 50),
          user: event.message?.user?.id,
        })
        // Forzar actualización del componente cuando llega un nuevo mensaje
        setTimeout(() => {
          if (channel && channel.state) {
            setChannel({ ...channel } as any)
          }
        }, 100)
      })
      
      channel.on('message.updated', (event: any) => {
        console.log('[Chat] ✏️ Mensaje actualizado:', event.message?.id)
        setTimeout(() => {
          if (channel && channel.state) {
            setChannel({ ...channel } as any)
          }
        }, 100)
      })
      
      // Solo establecer el canal después de que esté completamente inicializado
      // Verificar que el canal tenga state (indica que watch() completó exitosamente)
      if (!channel.state) {
        throw new Error('El canal no tiene estado inicializado después de watch()')
      }
      
      // Verificar que el canal tenga las propiedades críticas del SDK
      // El error getConfig sugiere que el canal no está completamente inicializado
      if (!channel.id || !channel.type || !channel.cid) {
        throw new Error('El canal no tiene propiedades críticas inicializadas')
      }
      
      // Verificar que el canal tenga el cliente asociado (necesario para getConfig)
      // El canal tiene _client internamente, pero verificamos que el canal esté asociado al cliente correcto
      if (!(channel as any)._client || (channel as any)._client !== chatClient) {
        console.warn('[Chat] ⚠️ Canal no tiene cliente asociado correctamente')
      }
      
      // Esperar un momento adicional para asegurar que el SDK termine de inicializar completamente
      // Esto previene race conditions donde el componente se renderiza antes de tiempo
      // Delay más largo para asegurar que el SDK de Stream Chat termine toda su inicialización interna
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Verificar nuevamente después del delay que el canal sigue siendo válido
      if (!channel.state || !channel.id || !channel.cid) {
        throw new Error('El canal perdió su estado después del delay')
      }
      
      // Verificar que el canal tenga al menos la estructura básica lista
      console.log('[Chat] ✅ Canal completamente inicializado:', {
        channelId: channel.id,
        cid: channel.cid,
        type: channel.type,
        hasState: !!channel.state,
        hasClient: !!(channel as any)._client,
        membersCount: Object.keys(channel.state.members || {}).length,
        messagesCount: channel.state.messages?.length || 0,
      })
      
      // Establecer el canal en el estado
      // IMPORTANTE: No marcar como ready todavía, esperar un momento más
      setChannel(channel)
      
      // Esperar tiempo adicional antes de marcar como listo para renderizar
      // Esto da tiempo a React para procesar el cambio de estado y al SDK para terminar
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verificación final antes de marcar como listo
      if (!channel.state || !channel.id) {
        console.error('[Chat] ❌ Canal perdió estado antes de marcar como listo')
        setIsChannelReady(false)
        return
      }
      
      setIsChannelReady(true) // Marcar canal como listo SOLO después de todas las verificaciones
    } catch (err: any) {
      console.error('[Chat] Error al seleccionar colaborador:', err)
      setError(err.message || 'Error al abrir conversación')
      setSelectedColaboradorId(null)
      setChannel(null)
      setIsChannelReady(false) // Resetear estado de canal listo en caso de error
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

  // Función helper para verificar que el canal esté completamente listo
  const isChannelFullyReady = (): boolean => {
    if (!chatClient || !channel) return false
    if (!channel.state || !channel.id || !channel.cid) return false
    if (channel.type !== 'messaging') return false
    if (!isChannelReady) return false
    return true
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
          ) : !isChannelFullyReady() ? (
            // Guard clause ULTRA estricto: No renderizar Chat/Channel hasta que estén 100% inicializados
            // Usa función helper que verifica todas las condiciones necesarias
            // Esto previene el error "getConfig is not a function"
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#6c757d' }}>
              <Spinner animation="border" variant="primary" style={{ marginBottom: '1rem' }} />
              <h5>Cargando conversación...</h5>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Por favor espera mientras se inicializa el chat</p>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Chat client={chatClient}>
                <Channel 
                  channel={channel}
                  key={channel.id}
                >
                  <Window>
                    <ChannelHeader />
                    <MessageList 
                      // Cargar más mensajes cuando se hace scroll hacia arriba
                      loadMore={async (limit?: number) => {
                        console.log('[Chat] loadMore llamado, limit:', limit)
                        try {
                          const messages = await channel.loadMoreMessages(limit || 50)
                          console.log('[Chat] loadMore completado, mensajes cargados:', messages.length)
                          // Forzar actualización del estado
                          setChannel({ ...channel } as any)
                          return messages.length
                        } catch (err) {
                          console.error('[Chat] Error en loadMore:', err)
                          return 0
                        }
                      }}
                    />
                    <div>
                      <MessageInput />
                      {/* Botón de prueba para debugging - ELIMINAR EN PRODUCCIÓN */}
                      <div style={{ padding: '0.5rem', borderTop: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                        <button
                          onClick={async () => {
                            const testMessage = `Mensaje de prueba ${new Date().toLocaleTimeString()}`
                            console.log('[Chat] 🧪 Enviando mensaje de prueba:', testMessage)
                            try {
                              const result = await channel.sendMessage({
                                text: testMessage,
                              })
                              console.log('[Chat] ✅ Mensaje de prueba enviado:', {
                                messageId: result.message?.id,
                                text: result.message?.text,
                              })
                              alert('✅ Mensaje enviado exitosamente! Revisa la consola.')
                            } catch (error: any) {
                              console.error('[Chat] ❌ Error al enviar mensaje de prueba:', {
                                error: error.message,
                                code: error.code,
                                status: error.status,
                                response: error.response,
                                fullError: error,
                              })
                              alert(`❌ Error: ${error.message}\n\nRevisa la consola para más detalles.`)
                            }
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                          }}
                        >
                          🧪 Enviar Mensaje de Prueba
                        </button>
                      </div>
                    </div>
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
