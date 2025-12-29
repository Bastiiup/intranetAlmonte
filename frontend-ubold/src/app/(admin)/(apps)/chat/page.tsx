'use client'
import ContactList from '@/app/(admin)/(apps)/chat/components/ContactList'
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
import { useStreamChat } from './hooks/useStreamChat'

const Page = () => {
  const { colaborador, persona } = useAuth()
  const currentUserId = colaborador?.id ? String(colaborador.id) : null

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
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [contactsLoading, setContactsLoading] = useState(true)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Usar Stream Chat hook
  const {
    messages,
    isLoading: streamLoading,
    error: streamError,
    sendMessage: streamSendMessage,
  } = useStreamChat(currentUserId, currentContact?.id || null)

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages])

  // Cargar contactos
  useEffect(() => {
    const cargarContactos = async () => {
      try {
        setContactsLoading(true)
        const response = await fetch('/api/chat/colaboradores')
        if (!response.ok) throw new Error('Error al cargar colaboradores')
        const data = await response.json()

        if (!data.data || (Array.isArray(data.data) && data.data.length === 0)) {
          setContacts([])
          return
        }

        const colaboradoresArray = Array.isArray(data.data) ? data.data : [data.data]

        const obtenerNombrePersona = (persona: any): string => {
          if (!persona) return ''
          if (persona.nombre_completo) return persona.nombre_completo
          const partes = []
          if (persona.nombres) partes.push(persona.nombres)
          if (persona.primer_apellido) partes.push(persona.primer_apellido)
          if (persona.segundo_apellido) partes.push(persona.segundo_apellido)
          return partes.length > 0 ? partes.join(' ') : persona.rut || ''
        }

        const obtenerAvatar = (persona: any): string | null => {
          if (!persona?.imagen?.url) return null
          return `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${persona.imagen.url}`
        }

        const contactosMapeados: ContactType[] = colaboradoresArray
          .filter((colaborador: any) => {
            const colaboradorData = colaborador.attributes || colaborador
            return colaborador?.id && colaboradorData.activo && colaboradorData.persona
          })
          .map((colaborador: any) => {
            const colaboradorData = colaborador.attributes || colaborador
            const persona = colaboradorData.persona
            const nombre = obtenerNombrePersona(persona)
            const avatar = obtenerAvatar(persona)

            return {
              id: String(colaborador.id),
              name: nombre.trim(),
              isOnline: false,
              avatar: avatar ? { src: avatar } : undefined,
            }
          })
          .filter((c: ContactType | null) => c !== null) as ContactType[]

        setContacts(contactosMapeados)
        if (contactosMapeados.length > 0 && !currentContact) {
          setCurrentContact(contactosMapeados[0])
        }
      } catch (err: any) {
        console.error('Error al cargar contactos:', err)
        setContactsError(err.message || 'Error al cargar contactos')
      } finally {
        setContactsLoading(false)
      }
    }

    cargarContactos()
  }, [])

  // Los mensajes se cargan automáticamente a través del hook useStreamChat

  // Enviar mensaje usando Stream Chat
  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentContact || isSending || !currentUserId) return

    const texto = messageText.trim()
    setMessageText('')
    setIsSending(true)

    try {
      await streamSendMessage(texto)
      // El mensaje se agregará automáticamente a través del hook
    } catch (err: any) {
      console.error('Error al enviar mensaje:', err)
      setContactsError(err.message || 'Error al enviar mensaje')
      setMessageText(texto) // Restaurar el texto si hay error
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const isLoading = contactsLoading || streamLoading
  const error = contactsError || streamError

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
        </Alert>
      </Container>
    )
  }

  if (contacts.length === 0) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Chat" subtitle="Apps" />
        <Alert variant="info">
          No hay colaboradores disponibles.
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
                  const messageSenderId = String(message.senderId)
                  const currentUserIdStr = currentUserId ? String(currentUserId) : null
                  const isFromCurrentUser = currentUserIdStr !== null && messageSenderId === currentUserIdStr

                  return (
                    <Fragment key={message.id}>
                      {/* Mensaje del otro usuario - IZQUIERDA, AMARILLO */}
                      {currentContact && currentUserIdStr && !isFromCurrentUser && (
                        <div className="d-flex align-items-start gap-2 my-3 chat-item">
                          {currentContact.avatar ? (
                            <Image 
                              src={typeof currentContact.avatar === 'object' && 'src' in currentContact.avatar 
                                ? currentContact.avatar.src 
                                : String(currentContact.avatar)} 
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

                      {/* Mensaje del usuario actual - DERECHA, AZUL */}
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
                  disabled={!currentContact || isSending || !currentUserId}
                />
                <LuMessageSquare className="app-search-icon text-muted" />
              </div>
              <Button variant="primary" onClick={handleSendMessage} disabled={!currentContact || isSending || !messageText.trim() || !currentUserId}>
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
