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
  rut?: string // RUT como identificador único para el chat
  attributes?: {
    email_login: string
    activo?: boolean
    persona?: {
      id: number
      rut?: string
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
    rut?: string
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
  const [myColaboradorRut, setMyColaboradorRut] = useState<string | null>(null) // RUT del colaborador del usuario logueado

  // RESOLVER IDENTIDAD: Obtener explícitamente el RUT de la persona del colaborador
  useEffect(() => {
    if (initializedRef.current || !colaborador) {
      return
    }

    const resolveMyColaboradorRut = async () => {
      try {
        initializedRef.current = true
        setIsLoading(true)
        setError(null)

        // DEBUG: Imprimir datos del colaborador y persona
        console.error('🕵️ OBJETO USER COMPLETO (colaborador):', JSON.stringify(colaborador, null, 2))
        console.error('🕵️ OBJETO PERSONA COMPLETO:', JSON.stringify(persona, null, 2))

        // CRÍTICO: Obtener el RUT de la persona
        // El RUT es único y estable, no cambia como los IDs numéricos
        const personaRut = persona?.rut || persona?.attributes?.rut || colaborador?.persona?.rut || colaborador?.attributes?.persona?.rut
        
        if (!personaRut) {
          throw new Error('No se pudo obtener el RUT de la persona. Tu perfil debe tener un RUT configurado.')
        }

        // Validar que el RUT sea un string no vacío
        const rutString = String(personaRut).trim()
        if (!rutString || rutString.length === 0) {
          throw new Error(`RUT de persona inválido: ${personaRut}`)
        }

        console.error('🕵️ RUT DEL COLABORADOR RESUELTO:', rutString)
        console.error('🕵️ Tipo de RUT:', typeof rutString, 'Valor:', rutString)

        // Guardar el RUT del colaborador en el estado
        setMyColaboradorRut(rutString)

        // Ahora que tenemos el RUT, inicializar Stream Chat
        await initStreamChat(rutString)
      } catch (err: any) {
        console.error('[Chat] Error al resolver RUT del colaborador:', err)
        setError(err.message || 'Error al obtener tu perfil de colaborador')
        setIsLoading(false)
      }
    }

    const initStreamChat = async (myColaboradorRut: string) => {
      try {
        // 1. Obtener token del backend
        const tokenResponse = await fetch('/api/chat/stream-token', {
          method: 'POST',
          credentials: 'include',
        })

        if (!tokenResponse.ok) {
          throw new Error('Error al obtener token de Stream Chat')
        }

        const { token } = await tokenResponse.json()

        // 2. Obtener API Key
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
        if (!apiKey) {
          throw new Error('NEXT_PUBLIC_STREAM_API_KEY no está configurada')
        }

        // 3. Crear cliente de Stream Chat
        const client = StreamChat.getInstance(apiKey)

        // 4. Conectar usuario usando el RUT del colaborador
        await client.connectUser(
          {
            id: myColaboradorRut, // Usar RUT como identificador único
            name: persona?.nombre_completo || colaborador?.attributes?.email_login || 'Usuario',
          },
          token
        )

        setChatClient(client)
        console.log('[Chat] ✅ Cliente de Stream Chat inicializado con RUT:', myColaboradorRut)

        // 5. Cargar lista de colaboradores
        await loadColaboradores()
      } catch (err: any) {
        console.error('[Chat] Error al inicializar Stream Chat:', err)
        setError(err.message || 'Error al inicializar el chat')
      } finally {
        setIsLoading(false)
      }
    }

    resolveMyColaboradorRut()

    // Cleanup al desmontar
    return () => {
      if (chatClient) {
        chatClient.disconnectUser().catch(console.error)
      }
    }
  }, [colaborador])

  // Cargar lista de colaboradores
  // IMPORTANTE: Esta función SOLO obtiene colaboradores de Intranet-colaboradores
  // NO usa ni referencia Intranet-Chats (content type obsoleto)
  // Stream Chat maneja su propio historial, no necesitamos cruzar datos con tablas antiguas
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
      // CRÍTICO: Solo usar datos de Intranet-colaboradores, sin cruzar con Intranet-Chats
      const colaboradoresData = Array.isArray(data.data) ? data.data : []
      
      const normalized = colaboradoresData
        .map((col: any) => {
          // Extraer datos del colaborador
          const colaboradorAttrs = col.attributes || col
          const personaData = colaboradorAttrs.persona || null
          
          // CRÍTICO: Usar SOLO el ID del content-type Intranet-colaboradores
          // NO usar documentId, NO usar persona.id, SOLO col.id
          // Este es el ID que viene del backend después de la desduplicación
          const colaboradorId = col.id
          
          // VALIDACIÓN: Asegurar que tenemos un ID válido del content-type
          if (!colaboradorId || typeof colaboradorId !== 'number') {
            console.error('[Chat] ⚠️ Colaborador sin ID válido del content-type:', {
              id: col.id,
              documentId: col.documentId,
              personaId: personaData?.id,
              email: colaboradorAttrs.email_login,
              tipoId: typeof col.id,
            })
            return null // Filtrar colaboradores sin ID válido
          }
          
          // DEBUG: Log para verificar que estamos usando el ID correcto
          // Log para TODOS los colaboradores para detectar problemas
          const nombreCompleto = personaData?.nombre_completo || ''
          const isMatias = nombreCompleto.toLowerCase().includes('matias') && nombreCompleto.toLowerCase().includes('riquelme')
          
          if (isMatias) {
            console.error('[Chat] 🚨 MATIAS RIQUELME MEDINA - NORMALIZANDO:')
            console.error('  📧 Email:', colaboradorAttrs.email_login)
            console.error('  🔑 col.id (ID del content-type):', col.id)
            console.error('  📄 col.documentId:', col.documentId)
            console.error('  👤 personaData?.id:', personaData?.id)
            console.error('  ✅ colaboradorId que se usará:', colaboradorId)
            console.error('  ⚠️ DEBE SER 93, NO 115, NO documentId, NO persona.id')
          }
          
          console.error('[Chat] 🔍 NORMALIZANDO COLABORADOR:', {
            email: colaboradorAttrs.email_login,
            nombre: nombreCompleto,
            id: col.id,
            documentId: col.documentId,
            personaId: personaData?.id,
            idUsado: colaboradorId,
            tienePersona: !!personaData,
          })
          
          // Obtener RUT de la persona (identificador único y estable)
          const personaRut = personaData?.rut || null
          
          if (!personaRut) {
            console.warn('[Chat] ⚠️ Colaborador sin RUT, será omitido:', {
              email: colaboradorAttrs.email_login,
              id: colaboradorId,
            })
            return null // Filtrar colaboradores sin RUT
          }

          // Normalizar estructura
          return {
            id: colaboradorId, // Mantener ID para referencia, pero usar RUT para channelId
            rut: personaRut, // RUT como identificador único para el chat
            email_login: colaboradorAttrs.email_login,
            activo: colaboradorAttrs.activo !== false, // Default true
            persona: personaData ? {
              id: personaData.id || personaData.documentId,
              rut: personaRut,
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
        // Filtrar colaboradores sin ID válido (null)
        .filter((col: Colaborador | null): col is Colaborador => col !== null)
        // Filtrar solo activos
        .filter((col: Colaborador) => col.activo !== false)
        // Filtrar el usuario actual (usar RUT para comparar)
        // CRÍTICO: Usar RUT como identificador único y estable
        .filter((col: Colaborador) => {
          const currentRut = persona?.rut || colaborador?.persona?.rut || colaborador?.attributes?.persona?.rut
          const colRut = col.rut || col.persona?.rut
          const isSame = colRut && currentRut && String(colRut) === String(currentRut)
          if (isSame) {
            console.error('[Chat] ⚠️ Usuario actual encontrado en lista (será filtrado):', {
              currentRut,
              colRut,
              email: col.email_login,
            })
          }
          return !isSame
        })
      
      // DEBUG CRÍTICO: Comparar IDs
      console.error('[Chat] 🔍 VERIFICACIÓN DE IDs:')
      console.error('Usuario actual (colaborador?.id):', colaborador?.id)
      console.error('Colaboradores en lista (primeros 3):', normalized.slice(0, 3).map((c: Colaborador) => ({
        id: c.id,
        email: c.email_login,
        nombre: c.persona?.nombre_completo,
      })))
      console.error('¿Usuario actual aparece en lista?', normalized.some((c: Colaborador) => String(c.id) === String(colaborador?.id)))
      
      // DEBUG ESPECÍFICO: Buscar usuario 157 en la lista normalizada
      const usuario157 = normalized.find((c: Colaborador) => String(c.id) === '157' || c.id === 157)
      console.error('[Chat] 🔍 BÚSQUEDA ESPECÍFICA USUARIO 157 EN LISTA NORMALIZADA:')
      if (usuario157) {
        console.error('✅ USUARIO 157 ENCONTRADO en lista normalizada:', {
          id: usuario157.id,
          email: usuario157.email_login,
          activo: usuario157.activo,
          nombre: usuario157.persona?.nombre_completo,
        })
      } else {
        console.error('❌ USUARIO 157 NO ENCONTRADO en lista normalizada')
        console.error('Total de colaboradores normalizados:', normalized.length)
        console.error('IDs en lista normalizada (primeros 10):', normalized.slice(0, 10).map((c: Colaborador) => ({
          id: c.id,
          email: c.email_login,
          activo: c.activo,
        })))
        
        // Verificar si fue filtrado
        const usuario157EnRaw = colaboradoresData.find((col: any) => {
          const id = col.id || col.documentId
          return String(id) === '157' || id === 157
        })
        if (usuario157EnRaw) {
          const attrs = usuario157EnRaw.attributes || usuario157EnRaw
          console.error('⚠️ USUARIO 157 EXISTE EN DATOS RAW pero fue filtrado:', {
            id: usuario157EnRaw.id,
            activo: attrs.activo,
            esUsuarioActual: String(usuario157EnRaw.id) === String(colaborador?.id),
          })
        }
      }
      
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
  const selectColaborador = async (colaboradorRut: string) => {
    // BLOQUEAR: No iniciar hasta tener myColaboradorRut
    if (!myColaboradorRut) {
      console.error('[Chat] ❌ No se ha resuelto el RUT del colaborador actual')
      setError('Error: No se pudo identificar tu perfil. Por favor recarga la página.')
      return
    }

    if (!chatClient) {
      console.error('[Chat] No hay chatClient')
      return
    }

    // Limpieza inmediata: resetear canal anterior
    setChannel(null)
    setSelectedColaboradorId(colaboradorRut)
    setError(null)
    setIsCreatingChannel(true)

    try {
      // GENERACIÓN DEL CANAL: Usar RUTs en lugar de IDs numéricos
      if (!myColaboradorRut || !colaboradorRut) {
        throw new Error('Faltan RUTs necesarios para crear el canal')
      }

      // Validar que ambos RUTs sean strings válidos
      const myRut = String(myColaboradorRut).trim()
      const otherRut = String(colaboradorRut).trim()

      if (!myRut || !otherRut) {
        throw new Error(`RUTs inválidos: myRut=${myRut}, otherRut=${otherRut}`)
      }

      // Verificar que no sea el mismo usuario
      if (myRut === otherRut) {
        setError('No puedes chatear contigo mismo')
        setIsCreatingChannel(false)
        return
      }

      // Ordenar RUTs alfabéticamente para generar channelId consistente
      const ruts = [myRut, otherRut].sort()
      
      // Generar channelId usando RUTs (prefijo chat-rut- para diferenciar de versiones anteriores)
      const channelId = `chat-rut-${ruts.join('-')}`

      // DEBUG FINAL
      console.error('=============================================')
      console.error('🕵️ CREACIÓN DE CANAL - USANDO RUTs')
      console.error('👤 myColaboradorRut (Usuario logueado):', myRut)
      console.error('👤 otherRut (Colaborador seleccionado):', otherRut)
      console.error('🔢 RUTs Ordenados:', ruts)
      console.error('🔑 CHANNEL ID GENERADO:', channelId)
      console.error('✅ Usando RUTs como identificadores únicos')
      console.error('=============================================')

      // Asegurar que el usuario objetivo existe en Stream Chat
      const ensureUserResponse = await fetch('/api/chat/stream-ensure-user', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rut: otherRut }),
      })

      if (!ensureUserResponse.ok) {
        const errorData = await ensureUserResponse.json()
        throw new Error(errorData.error || 'Error al asegurar usuario en Stream')
      }

      // Crear o recuperar canal usando RUTs como miembros
      const channel = chatClient.channel('messaging', channelId, {
        members: ruts, // Usar RUTs como identificadores de miembros
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

  // BLOQUEAR RENDERIZADO: No mostrar el chat hasta tener myColaboradorRut
  if (!myColaboradorRut || !chatClient) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" />
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando chat...</span>
            </Spinner>
          </div>
        ) : (
          <Alert variant="danger">
            {error || 'Error al inicializar el chat. Por favor recarga la página.'}
          </Alert>
        )}
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
                  // CRÍTICO: Usar RUT como identificador único para el chat
                  // El RUT es estable y único, no cambia como los IDs numéricos
                  const colRut = col.rut || col.persona?.rut
                  
                  if (!colRut) {
                    console.warn('[Chat Frontend] ⚠️ Colaborador sin RUT, será omitido:', {
                      email: col.email_login,
                      id: col.id,
                    })
                    return null
                  }
                  
                  const nombreCompleto = col.persona?.nombre_completo || ''
                  const isSelected = selectedColaboradorId === colRut
                  
                  return (
                    <ListGroup.Item
                      key={col.id}
                      action
                      active={isSelected}
                      onClick={() => {
                        console.log('[Chat Frontend] 🖱️ Click en contacto:', {
                          email: col.email_login,
                          nombre: nombreCompleto,
                          rut: colRut,
                        })
                        selectColaborador(colRut)
                      }}
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
                            {getColaboradorName(col)} <small style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#6c757d', fontWeight: 'normal' }}>(ID: {col.id})</small>
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
