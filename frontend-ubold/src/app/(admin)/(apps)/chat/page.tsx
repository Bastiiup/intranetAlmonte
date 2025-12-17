'use client'
import ContactList from '@/app/(admin)/(apps)/chat/components/ContactList'
// Ya no usamos currentUser de data.ts, usamos datos reales del colaborador autenticado
import { ContactType, MessageType } from '@/app/(admin)/(apps)/chat/types'
import SimplebarClient from '@/components/client-wrapper/SimplebarClient'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  Container,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  FormControl,
  Offcanvas,
  OverlayTrigger,
  Tooltip,
  Alert,
  Spinner,
} from 'react-bootstrap'
import { LuMessageSquare } from 'react-icons/lu'
import {
  TbBellOff,
  TbCircleFilled,
  TbClock,
  TbDotsVertical,
  TbMenu2,
  TbMessageCircleOff,
  TbPhone,
  TbSend2,
  TbTrash,
  TbUser,
  TbVideo,
} from 'react-icons/tb'
import { useAuth } from '@/hooks/useAuth'

const Page = () => {
  const { colaborador, persona } = useAuth()
  const currentUserId = colaborador?.id ? String(colaborador.id) : null
  
  // Obtener datos del usuario actual para mostrar en mensajes
  const currentUserData = {
    id: currentUserId || '1',
    name: persona ? (persona.nombre_completo || `${persona.nombres || ''} ${persona.primer_apellido || ''}`.trim() || 'Usuario') : 'Usuario',
    avatar: persona?.imagen?.url 
      ? { src: `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.url}` }
      : undefined,
  }
  const [show, setShow] = useState(false)
  const [contacts, setContacts] = useState<ContactType[]>([])
  const [currentContact, setCurrentContact] = useState<ContactType | null>(null)
  const [messages, setMessages] = useState<MessageType[]>([])
  const [messageText, setMessageText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMessageDate, setLastMessageDate] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar contactos (colaboradores) desde Strapi
  useEffect(() => {
    const cargarContactos = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/chat/colaboradores')
        if (!response.ok) {
          throw new Error('Error al cargar colaboradores')
        }
        const data = await response.json()
        
        // Debug: Log de la respuesta completa
        console.log('[Chat] Datos recibidos de Strapi:', {
          hasData: !!data.data,
          isArray: Array.isArray(data.data),
          count: Array.isArray(data.data) ? data.data.length : data.data ? 1 : 0,
          sample: Array.isArray(data.data) ? data.data[0] : data.data,
        })
        
        // Verificar que hay datos
        if (!data.data || (Array.isArray(data.data) && data.data.length === 0)) {
          console.warn('[Chat] No se encontraron colaboradores en Strapi')
          setContacts([])
          setError('No se encontraron colaboradores. Verifica que existan registros activos en Intranet-Colaboradores en Strapi.')
          return
        }
        
        // Mapear colaboradores de Strapi a ContactType
        const colaboradoresArray = Array.isArray(data.data) ? data.data : [data.data]
        
        // Debug: Ver estructura completa del primer colaborador
        if (colaboradoresArray.length > 0) {
          const primerColaborador = colaboradoresArray[0]
          console.log('[Chat] Estructura completa del primer colaborador:', JSON.stringify(primerColaborador, null, 2))
        }
        
        // Función auxiliar para obtener nombre completo de Persona
        const obtenerNombrePersona = (persona: any): string => {
          if (!persona) return ''
          
          if (persona.nombre_completo) {
            return persona.nombre_completo
          }
          
          const partes = []
          if (persona.nombres) partes.push(persona.nombres)
          if (persona.primer_apellido) partes.push(persona.primer_apellido)
          if (persona.segundo_apellido) partes.push(persona.segundo_apellido)
          
          return partes.length > 0 ? partes.join(' ') : persona.rut || ''
        }
        
        // Función auxiliar para obtener avatar de Persona
        const obtenerAvatar = (persona: any): string | null => {
          if (!persona?.imagen?.url) return null
          return `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.url}`
        }
        
        const contactosMapeados: ContactType[] = colaboradoresArray
          .filter((colaborador: any) => {
            // Los datos pueden venir directamente o en attributes
            const colaboradorData = colaborador.attributes || colaborador
            
            // Solo incluir colaboradores activos con persona relacionada
            if (!colaborador || !colaborador.id || !colaboradorData.activo) return false
            if (!colaboradorData.persona) return false
            
            const nombre = obtenerNombrePersona(colaboradorData.persona)
            return !!nombre && nombre.trim() !== ''
          })
          .map((colaborador: any) => {
            // Los datos pueden venir directamente o en attributes
            const colaboradorData = colaborador.attributes || colaborador
            const persona = colaboradorData.persona
            const nombre = obtenerNombrePersona(persona)
            
            if (!nombre || nombre.trim() === '') {
              console.error('[Chat] ERROR: Colaborador sin nombre después del filtro:', {
                id: colaborador.id,
                email_login: colaboradorData.email_login,
              })
              return null
            }
            
            // Por ahora, considerar todos como offline (luego podemos implementar lógica de última actividad)
            const isOnline = false
            
            const avatar = obtenerAvatar(persona)
            
            // Debug: Log de cada colaborador mapeado
            console.log('[Chat] Colaborador mapeado:', {
              id: colaborador.id,
              nombre: nombre.trim(),
              email_login: colaboradorData.email_login,
              rol: colaboradorData.rol,
              isOnline,
              tieneAvatar: !!avatar,
            })
            
            return {
              id: String(colaborador.id),
              name: nombre.trim(),
              isOnline,
              avatar: avatar ? { src: avatar } : undefined,
            }
          })
          .filter((contacto: ContactType | null) => contacto !== null) as ContactType[]
        
        console.log('[Chat] Total contactos mapeados:', contactosMapeados.length)
        
        setContacts(contactosMapeados)
        if (contactosMapeados.length > 0 && !currentContact) {
          setCurrentContact(contactosMapeados[0])
        }
        setError(null)
      } catch (err: any) {
        console.error('Error al cargar contactos:', err)
        setError(err.message || 'Error al cargar contactos')
      } finally {
        setIsLoading(false)
      }
    }
    
    cargarContactos()
  }, [])

    // Cargar mensajes y configurar polling
  useEffect(() => {
    if (!currentContact || !currentUserId) return

    const cargarMensajes = async (soloNuevos: boolean = false) => {
      try {
        // Obtener mensajes entre el usuario actual y el contacto seleccionado
        // Necesitamos obtener mensajes donde:
        // - remitente_id = currentUserId Y colaborador_id = currentContact.id
        // - O remitente_id = currentContact.id Y colaborador_id = currentUserId
        const query = new URLSearchParams({
          colaborador_id: currentContact.id,
          remitente_id: currentUserId,
        })
        
        if (soloNuevos && lastMessageDate) {
          query.append('ultima_fecha', lastMessageDate)
        }
        
        const response = await fetch(`/api/chat/mensajes?${query.toString()}`)
        if (!response.ok) {
          // Si es 404, el content type no existe aún - no mostrar error repetitivo
          if (response.status === 404) {
            if (!soloNuevos) {
              // Solo mostrar el error la primera vez, no en cada polling
              console.warn('Content type intranet-chats no encontrado en Strapi. Asegúrate de que esté creado y Strapi reiniciado.')
            }
            return
          }
          throw new Error('Error al cargar mensajes')
        }
        
        const data = await response.json()
        const mensajesData = Array.isArray(data.data) ? data.data : [data.data]
        
        // Debug: Ver estructura del primer mensaje
        if (mensajesData.length > 0) {
          console.log('[Chat] Estructura del primer mensaje:', JSON.stringify(mensajesData[0], null, 2))
        }
        
        // Mapear mensajes de Strapi a MessageType
        // Los datos pueden venir directamente o en attributes
        const mensajesMapeados: MessageType[] = mensajesData.map((mensaje: any) => {
          // Los datos pueden venir directamente o en attributes
          const mensajeData = mensaje.attributes || mensaje
          const texto = mensajeData.texto || mensajeData.TEXTO || ''
          const remitenteId = mensajeData.remitente_id || mensajeData.REMITENTE_ID || 1
          const fecha = mensajeData.fecha ? new Date(mensajeData.fecha) : new Date(mensajeData.createdAt || Date.now())
          
          // Asegurar que el ID del remitente sea string para comparación consistente
          const remitenteIdStr = String(remitenteId)
          
          console.log('[Chat] Mensaje mapeado:', {
            id: mensaje.id,
            texto,
            remitenteId: remitenteIdStr,
            currentUserId,
            isFromCurrentUser: remitenteIdStr === currentUserId,
            fecha: fecha.toISOString(),
          })
          
          return {
            id: String(mensaje.id),
            senderId: remitenteIdStr, // Asegurar que sea string
            text: texto,
            time: fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          }
        })
        
        if (soloNuevos) {
          // Agregar solo los nuevos mensajes
          setMessages((prev) => {
            const nuevosIds = new Set(mensajesMapeados.map((m) => m.id))
            const mensajesExistentes = prev.filter((m) => !nuevosIds.has(m.id))
            return [...mensajesExistentes, ...mensajesMapeados]
          })
        } else {
          // Reemplazar todos los mensajes
          setMessages(mensajesMapeados)
        }
        
        // Actualizar última fecha del mensaje más reciente
        if (mensajesMapeados.length > 0) {
          const ultimoMensaje = mensajesData[mensajesData.length - 1]
          const ultimoMensajeData = ultimoMensaje.attributes || ultimoMensaje
          // Los datos pueden venir directamente o en attributes
          const ultimaFecha = ultimoMensajeData?.fecha || ultimoMensajeData?.createdAt
          if (ultimaFecha) {
            setLastMessageDate(ultimaFecha)
          }
        }
        
        // Scroll al final
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } catch (err: any) {
        // Solo loguear errores que no sean 404 (ya manejados arriba)
        if (err.status !== 404) {
          console.error('Error al cargar mensajes:', err)
        }
      }
    }
    
    // Cargar mensajes iniciales
    cargarMensajes(false)
    
    // Configurar polling cada 1 segundo
    pollingIntervalRef.current = setInterval(() => {
      cargarMensajes(true)
    }, 1000)
    
    // Limpiar intervalo al cambiar de contacto o desmontar
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [currentContact, lastMessageDate, currentUserId])

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentContact || isSending) return

    const texto = messageText.trim()
    setMessageText('')
    setIsSending(true)

    try {
      const response = await fetch('/api/chat/mensajes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texto,
          colaborador_id: parseInt(currentContact.id), // ID del colaborador con quien chateas
          remitente_id: colaborador?.id || 1, // ID del colaborador autenticado (quien envía)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Chat] Error al enviar mensaje:', {
          status: response.status,
          error: errorData,
        })
        throw new Error(errorData.error || 'Error al enviar mensaje')
      }

      const responseData = await response.json()
      console.log('[Chat] Mensaje enviado exitosamente:', responseData)

      // Agregar el mensaje enviado inmediatamente al estado local
      // para que aparezca de inmediato mientras se recarga desde el servidor
      const mensajeEnviado: MessageType = {
        id: responseData.data?.id ? String(responseData.data.id) : `temp-${Date.now()}`,
        senderId: String(colaborador?.id || 1),
        text: texto,
        time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      }
      
      // Agregar el mensaje al estado inmediatamente
      setMessages((prev) => {
        // Evitar duplicados
        const existe = prev.some((m) => m.id === mensajeEnviado.id || (m.text === mensajeEnviado.text && m.senderId === mensajeEnviado.senderId && Math.abs(new Date(m.time).getTime() - new Date().getTime()) < 2000))
        if (existe) return prev
        return [...prev, mensajeEnviado]
      })

      // Forzar recarga completa de mensajes después de enviar
      // Esto asegura que el mensaje enviado aparezca inmediatamente
      // y que cualquier mensaje nuevo del otro colaborador también se cargue
      setTimeout(() => {
        // Recargar todos los mensajes (no solo nuevos) para asegurar que aparezca el que acabamos de enviar
        const query = new URLSearchParams({
          colaborador_id: currentContact.id,
          remitente_id: currentUserId || '',
        })
        // No usar ultima_fecha para forzar recarga completa
        fetch(`/api/chat/mensajes?${query.toString()}`)
          .then((res) => {
            if (!res.ok) {
              console.error('[Chat] Error al recargar mensajes:', res.status)
              return
            }
            return res.json()
          })
          .then((data) => {
            if (!data) return
            
            const mensajesData = Array.isArray(data.data) ? data.data : [data.data]
            console.log('[Chat] Mensajes recargados después de enviar:', mensajesData.length)
            
            if (mensajesData.length > 0) {
              // Mapear mensajes
              const mensajesMapeados: MessageType[] = mensajesData.map((mensaje: any) => {
                const mensajeData = mensaje.attributes || mensaje
                const texto = mensajeData.texto || ''
                const remitenteId = mensajeData.remitente_id || 1
                const fecha = mensajeData.fecha ? new Date(mensajeData.fecha) : new Date(mensajeData.createdAt || Date.now())
                
                return {
                  id: String(mensaje.id),
                  senderId: String(remitenteId),
                  text: texto,
                  time: fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
                }
              })
              
              // Reemplazar todos los mensajes
              setMessages(mensajesMapeados)
              
              // Actualizar última fecha
              const ultimoMensaje = mensajesData[mensajesData.length - 1]
              const ultimoMensajeData = ultimoMensaje.attributes || ultimoMensaje
              const ultimaFecha = ultimoMensajeData?.fecha || ultimoMensajeData?.createdAt
              if (ultimaFecha) {
                setLastMessageDate(ultimaFecha)
              }
              
              // Scroll al final
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }
          })
          .catch((err) => {
            console.error('[Chat] Error al recargar mensajes después de enviar:', err)
          })
      }, 800) // Esperar 800ms para que Strapi procese el mensaje
    } catch (err: any) {
      console.error('Error al enviar mensaje:', err)
      setError(err.message || 'Error al enviar mensaje')
      // Restaurar el texto del mensaje si falla
      setMessageText(texto)
    } finally {
      setIsSending(false)
    }
  }

  // Manejar Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isLoading && contacts.length === 0) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" />
          <span className="ms-2">Cargando contactos...</span>
        </div>
      </Container>
    )
  }

  if (error && contacts.length === 0) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
          <br />
          <small>Verifica que el content type "intranet-chats" exista en Strapi y que las variables de entorno estén configuradas.</small>
        </Alert>
      </Container>
    )
  }

  if (contacts.length === 0) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <Alert variant="info">
          No hay colaboradores disponibles. Asegúrate de que existan registros activos en Intranet-Colaboradores en Strapi.
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Chat" subtitle="Apps" />

      <div className="outlook-box gap-1">
        <Offcanvas responsive="lg" show={show} onHide={() => setShow(!show)} className="outlook-left-menu outlook-left-menu-lg">
          <ContactList contacts={contacts} setContact={setCurrentContact} />
        </Offcanvas>

        <Card className="h-100 mb-0 rounded-start-0 flex-grow-1">
          <CardHeader className="card-bg">
            <div className="d-lg-none d-inline-flex gap-2">
              <button className="btn btn-default btn-icon" type="button" onClick={() => setShow(!show)}>
                <TbMenu2 className="fs-lg" />
              </button>
            </div>

            {currentContact && (
              <>
                <div className="flex-grow-1">
                  <h5 className="mb-1 lh-base fs-lg">
                    <Link href="/users/profile" className="link-reset">
                      {currentContact.name}
                    </Link>
                  </h5>
                  <p className="mb-0 lh-sm text-muted" style={{ paddingTop: '1px' }}>
                    <TbCircleFilled className={`me-1 ${currentContact.isOnline ? 'text-success' : 'text-danger'}`} />{' '}
                    {currentContact.isOnline ? 'Activo' : 'Desconectado'}
                  </p>
                </div>

                <div className="d-flex align-items-center gap-1">
                  <OverlayTrigger placement="top" overlay={<Tooltip>Video Call</Tooltip>}>
                    <button type="button" className="btn btn-default btn-icon">
                      <TbVideo className="fs-lg" />
                    </button>
                  </OverlayTrigger>

                  <OverlayTrigger placement="top" overlay={<Tooltip>Audio Call</Tooltip>}>
                    <button type="button" className="btn btn-default btn-icon">
                      <TbPhone className="fs-lg" />
                    </button>
                  </OverlayTrigger>

                  <Dropdown align="end">
                    <DropdownToggle as={'button'} className="btn btn-default btn-icon drop-arrow-none">
                      <TbDotsVertical className="fs-lg" />
                    </DropdownToggle>

                    <DropdownMenu>
                      <DropdownItem>
                        <TbUser className="me-2" /> Ver Perfil
                      </DropdownItem>
                      <DropdownItem>
                        <TbBellOff className="me-2" /> Silenciar Notificaciones
                      </DropdownItem>
                      <DropdownItem>
                        <TbTrash className="me-2" /> Eliminar Chat
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </>
            )}
          </CardHeader>

          <SimplebarClient className="card-body pt-0 mb-5 pb-2" style={{ maxHeight: 'calc(100vh - 317px)' }}>
            {messages.length > 0 ? (
              <>
                {messages.map((message) => {
                  // Asegurar comparación consistente de IDs (ambos como strings)
                  const messageSenderId = String(message.senderId)
                  const currentUserIdStr = currentUserId ? String(currentUserId) : null
                  const isFromCurrentUser = currentUserIdStr !== null && messageSenderId === currentUserIdStr
                  
                  return (
                  <Fragment key={message.id}>
                    {currentContact && currentUserIdStr && !isFromCurrentUser && (
                      <div className="d-flex align-items-start gap-2 my-3 chat-item">
                        {currentContact.avatar ? (
                          <Image 
                            src={typeof currentContact.avatar === 'object' && 'src' in currentContact.avatar 
                              ? currentContact.avatar.src 
                              : (currentContact.avatar as any).src} 
                            width={36} 
                            height={36} 
                            className="avatar-md rounded-circle" 
                            alt="User" 
                          />
                        ) : (
                          <span className="avatar-sm flex-shrink-0">
                            <span className="avatar-title text-bg-primary fw-bold rounded-circle">
                              {currentContact.name.charAt(0).toUpperCase()}
                            </span>
                          </span>
                        )}
                        <div>
                          <div className="chat-message py-2 px-3 bg-warning-subtle rounded">{message.text}</div>
                          <div className="text-muted d-inline-flex align-items-center gap-1 fs-xs mt-1">
                            <TbClock /> {message.time}
                          </div>
                        </div>
                      </div>
                    )}

                    {isFromCurrentUser && (
                      <div className="d-flex align-items-start gap-2 my-3 text-end chat-item justify-content-end">
                        <div>
                          <div className="chat-message py-2 px-3 bg-info-subtle rounded">{message.text}</div>
                          <div className="text-muted d-inline-flex align-items-center gap-1 fs-xs mt-1">
                            <TbClock /> {message.time}
                          </div>
                        </div>
                        {currentUserData.avatar ? (
                          <Image src={currentUserData.avatar.src} width={36} height={36} className="avatar-md rounded-circle" alt="User" />
                        ) : (
                          <span className="avatar-sm flex-shrink-0">
                            <span className="avatar-title text-bg-primary fw-bold rounded-circle w-25 h-25">
                              {currentUserData.name.charAt(0).toUpperCase()}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </Fragment>
                  )
                })}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="d-flex align-items-center justify-content-center my-5">
                <TbMessageCircleOff size={18} className="text-muted me-1" />
                <span>No hay mensajes. Comienza la conversación.</span>
              </div>
            )}
          </SimplebarClient>

          <CardFooter className="bg-body-secondary border-top border-dashed border-bottom-0 position-absolute bottom-0 w-100">
            <div className="d-flex gap-2">
              <div className="app-search flex-grow-1">
                <FormControl
                  type="text"
                  className="py-2 bg-light-subtle border-light"
                  placeholder="Escribe un mensaje..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!currentContact || isSending}
                />
                <LuMessageSquare className="app-search-icon text-muted" />
              </div>
              <Button variant="primary" onClick={handleSendMessage} disabled={!currentContact || isSending || !messageText.trim()}>
                {isSending ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar <TbSend2 className="ms-1 fs-xl" />
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Container>
  )
}

export default Page
