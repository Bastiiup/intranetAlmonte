'use client'
import ContactList from '@/app/(admin)/(apps)/chat/components/ContactList'
import { currentUser } from '@/app/(admin)/(apps)/chat/data'
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

// ID del usuario actual (puedes obtenerlo de sesión/autenticación)
const CURRENT_USER_ID = 1

const Page = () => {
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

  // Cargar contactos desde Strapi
  useEffect(() => {
    const cargarContactos = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/chat/clientes')
        if (!response.ok) {
          throw new Error('Error al cargar clientes')
        }
        const data = await response.json()
        
        // Mapear clientes de Strapi a ContactType
        const contactosMapeados: ContactType[] = (Array.isArray(data.data) ? data.data : [data.data]).map((cliente: any) => {
          const attrs = cliente.attributes || {}
          const ultimaActividad = attrs.ultima_actividad
          const ahora = new Date()
          const ultimaActividadDate = ultimaActividad ? new Date(ultimaActividad) : null
          
          // Considerar online si la última actividad fue en las últimas 5 minutos
          const isOnline = ultimaActividadDate 
            ? (ahora.getTime() - ultimaActividadDate.getTime()) < 5 * 60 * 1000
            : false
          
          return {
            id: String(cliente.id),
            name: attrs.nombre || 'Sin nombre',
            isOnline,
            // Puedes agregar más campos si los necesitas
          }
        })
        
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
    if (!currentContact) return

    const cargarMensajes = async (soloNuevos: boolean = false) => {
      try {
        const query = new URLSearchParams({
          cliente_id: currentContact.id,
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
        
        // Mapear mensajes de Strapi a MessageType
        const mensajesMapeados: MessageType[] = mensajesData.map((mensaje: any) => {
          const attrs = mensaje.attributes || {}
          const fecha = new Date(attrs.fecha || attrs.createdAt)
          
          return {
            id: String(mensaje.id),
            senderId: String(attrs.remitente_id),
            text: attrs.texto || '',
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
          const ultimaFecha = ultimoMensaje?.attributes?.fecha || ultimoMensaje?.attributes?.createdAt
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
  }, [currentContact, lastMessageDate])

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
          cliente_id: parseInt(currentContact.id),
          remitente_id: CURRENT_USER_ID,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al enviar mensaje')
      }

      // El polling automáticamente cargará el nuevo mensaje
      // Pero también podemos forzar una recarga inmediata
      setTimeout(() => {
        const query = new URLSearchParams({
          cliente_id: currentContact.id,
        })
        if (lastMessageDate) {
          query.append('ultima_fecha', lastMessageDate)
        }
        fetch(`/api/chat/mensajes?${query.toString()}`)
          .then((res) => res.json())
          .then((data) => {
            const mensajesData = Array.isArray(data.data) ? data.data : [data.data]
            if (mensajesData.length > 0) {
              const ultimoMensaje = mensajesData[mensajesData.length - 1]
              const attrs = ultimoMensaje.attributes || {}
              const fecha = new Date(attrs.fecha || attrs.createdAt)
              
              const nuevoMensaje: MessageType = {
                id: String(ultimoMensaje.id),
                senderId: String(attrs.remitente_id),
                text: attrs.texto || '',
                time: fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
              }
              
              setMessages((prev) => [...prev, nuevoMensaje])
              setLastMessageDate(attrs.fecha || attrs.createdAt)
              
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }
          })
      }, 200)
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
          <small>Verifica que el content type "chat-mensajes" exista en Strapi y que las variables de entorno estén configuradas.</small>
        </Alert>
      </Container>
    )
  }

  if (contacts.length === 0) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <Alert variant="info">
          No hay clientes disponibles. Asegúrate de que existan registros en WO-Clientes en Strapi.
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
                {messages.map((message) => (
                  <Fragment key={message.id}>
                    {currentContact && String(currentContact.id) !== message.senderId && (
                      <div className="d-flex align-items-start gap-2 my-3 chat-item">
                        {currentContact.avatar ? (
                          <Image src={currentContact.avatar.src} width={36} height={36} className="avatar-md rounded-circle" alt="User" />
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

                    {String(CURRENT_USER_ID) === message.senderId && (
                      <div className="d-flex align-items-start gap-2 my-3 text-end chat-item justify-content-end">
                        <div>
                          <div className="chat-message py-2 px-3 bg-info-subtle rounded">{message.text}</div>
                          <div className="text-muted d-inline-flex align-items-center gap-1 fs-xs mt-1">
                            <TbClock /> {message.time}
                          </div>
                        </div>
                        {currentUser.avatar ? (
                          <Image src={currentUser.avatar.src} width={36} height={36} className="avatar-md rounded-circle" alt="User" />
                        ) : (
                          <span className="avatar-sm flex-shrink-0">
                            <span className="avatar-title text-bg-primary fw-bold rounded-circle w-25 h-25">
                              {currentUser.name.charAt(0).toUpperCase()}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </Fragment>
                ))}
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
