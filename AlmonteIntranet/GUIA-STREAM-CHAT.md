# 📘 Guía Completa: Implementación de Stream Chat

Esta guía te llevará paso a paso para reemplazar **COMPLETAMENTE** el sistema de chat actual por Stream Chat.

**⚠️ IMPORTANTE**: Esta implementación:
- **Elimina TODA la lógica actual** del chat (polling, API routes de mensajes, servicios, etc.)
- **Mantiene SOLO la UI/interfaz visual** como base
- **Usa Stream Chat SDK directamente en el frontend** para todo (mensajes, canales, tiempo real)
- **NO usa API routes intermedias** para mensajes (solo una para autenticación/token)

---

## 📋 Tabla de Contenidos

1. [Paso 1: Crear cuenta en Stream](#paso-1-crear-cuenta-en-stream)
2. [Paso 2: Obtener credenciales](#paso-2-obtener-credenciales)
3. [Paso 3: Instalar dependencias](#paso-3-instalar-dependencias)
4. [Paso 4: Configurar variables de entorno](#paso-4-configurar-variables-de-entorno)
5. [Paso 5: Crear cliente de Stream (server-side)](#paso-5-crear-cliente-de-stream-server-side)
6. [Paso 6: Crear API route para autenticación](#paso-6-crear-api-route-para-autenticación)
7. [Paso 7: Actualizar componente de chat con Stream SDK](#paso-7-actualizar-componente-de-chat-con-stream-sdk)
8. [Paso 8: Limpiar código innecesario](#paso-8-limpiar-código-innecesario)
9. [Paso 9: Probar la implementación](#paso-9-probar-la-implementación)

---

## Paso 1: Crear cuenta en Stream

### 1.1. Ir a la página de Stream

1. Abre tu navegador y ve a: **https://getstream.io/**
2. Haz clic en el botón **"Start for free"** o **"Sign Up"** (arriba a la derecha)

### 1.2. Registrarse

1. Ingresa tu **email corporativo**
2. Crea una **contraseña segura**
3. Acepta los términos y condiciones
4. Haz clic en **"Create Account"**

### 1.3. Verificar email

1. Revisa tu bandeja de entrada (y spam)
2. Haz clic en el enlace de verificación que Stream te envió
3. Tu cuenta quedará verificada

### 1.4. Completar perfil (opcional)

Stream puede pedirte información adicional como:
- Nombre de la empresa
- Tamaño del equipo
- Tipo de proyecto

Puedes completarlo o saltarlo por ahora.

---

## Paso 2: Obtener credenciales

### 2.1. Crear una nueva aplicación

1. Una vez dentro de Stream, verás el dashboard
2. Haz clic en **"Create App"** o **"New App"**
3. Configura tu aplicación:
   - **App Name**: `Intranet Chat` (o el nombre que prefieras)
   - **Region**: Elige la región más cercana (por ejemplo: `US East` para Estados Unidos o `EU West` para Europa)
   - **Environment**: Selecciona `Development` (puedes cambiarlo a Production después)
4. Haz clic en **"Create"**

### 2.2. Obtener las credenciales

Una vez creada la app, verás el dashboard con varias pestañas. Necesitas:

1. **API Key** (pública - para el frontend)
   - Está visible en el dashboard principal
   - Ejemplo: `abc123xyz789`
   - **Copia este valor**

2. **API Secret** (privada - solo para el backend)
   - Haz clic en la pestaña **"Chat"** o **"Overview"**
   - Busca **"API Secret"**
   - Haz clic en **"Show"** o el icono del ojo para verla
   - Ejemplo: `abc123xyz789_secret_abcdefghijklmnop`
   - **Copia este valor** (manténlo seguro, es privado)

3. **App ID** (opcional, pero útil)
   - Generalmente el mismo que el API Key
   - O lo encontrarás en la URL: `https://getstream.io/dashboard/app/[APP_ID]`

**📝 Nota importante**: El API Secret es privado y NUNCA debe estar en el código del frontend. Solo úsalo en el servidor (API routes de Next.js).

---

## Paso 3: Instalar dependencias

Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
cd frontend-ubold
npm install stream-chat stream-chat-react
```

O si usas yarn:

```bash
yarn add stream-chat stream-chat-react
```

**Explicación de los paquetes**:
- `stream-chat`: Cliente JavaScript/TypeScript para Stream Chat (server-side y client-side)
- `stream-chat-react`: Componentes React pre-construidos para Stream (opcional, pero útil)

---

## Paso 4: Configurar variables de entorno

### 4.1. Archivo `.env.local`

Abre o crea el archivo `.env.local` en la raíz del proyecto `frontend-ubold/`:

```env
# Stream Chat - Credenciales (Backend - servidor)
STREAM_CHAT_API_KEY=tu_api_key_aqui
STREAM_CHAT_API_SECRET=tu_api_secret_aqui

# Stream Chat - API Key pública (Frontend - navegador)
# Esta es la misma que STREAM_CHAT_API_KEY, pero con NEXT_PUBLIC_ para que sea accesible en el navegador
NEXT_PUBLIC_STREAM_CHAT_API_KEY=tu_api_key_aqui

# Opcional: URL de Stream (generalmente no necesitas cambiarla)
# STREAM_CHAT_URL=https://chat.stream-io-api.com
```

### 4.2. Archivo `.env` (para producción en Railway)

Si usas Railway para deploy, agrega estas variables en el dashboard de Railway:

1. Ve a tu proyecto en Railway
2. Selecciona el servicio de tu aplicación
3. Ve a la pestaña **"Variables"**
4. Agrega:
   - `STREAM_CHAT_API_KEY` = tu API key
   - `STREAM_CHAT_API_SECRET` = tu API secret
   - `NEXT_PUBLIC_STREAM_CHAT_API_KEY` = tu API key (mismo valor que STREAM_CHAT_API_KEY)

**⚠️ IMPORTANTE**: 
- Reemplaza `tu_api_key_aqui` y `tu_api_secret_aqui` con los valores reales que copiaste en el Paso 2
- El `.env.local` está en `.gitignore`, así que no se subirá a Git
- **NUNCA** subas el API Secret a Git o repositorios públicos

---

## Paso 5: Crear cliente de Stream (server-side)

Crea un nuevo archivo para el cliente de Stream que se usará en el servidor:

**Archivo**: `src/lib/stream/client.ts`

```typescript
/**
 * Cliente de Stream Chat para uso en el servidor (API routes)
 * Este cliente usa el API Secret y solo debe ejecutarse en el servidor
 */

import StreamChat from 'stream-chat'

let streamClient: StreamChat.StreamChat | null = null

/**
 * Obtiene o crea la instancia del cliente de Stream Chat
 * Este cliente es para uso en el servidor (API routes)
 */
export function getStreamClient(): StreamChat.StreamChat {
  if (streamClient) {
    return streamClient
  }

  const apiKey = process.env.STREAM_CHAT_API_KEY
  const apiSecret = process.env.STREAM_CHAT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error(
      'STREAM_CHAT_API_KEY y STREAM_CHAT_API_SECRET deben estar configuradas en las variables de entorno'
    )
  }

  streamClient = StreamChat.getInstance(apiKey, apiSecret)

  return streamClient
}
```

---

## Paso 6: Crear API route para autenticación

Stream necesita autenticar usuarios. Crea una API route que genere tokens de usuario:

**Archivo**: `src/app/api/chat/stream-token/route.ts`

```typescript
/**
 * API Route para generar tokens de autenticación de Stream Chat
 * Stream requiere que cada usuario tenga un token único para conectarse
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { getAuthColaborador } from '@/lib/auth'
import { getStreamClient } from '@/lib/stream/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (tu sistema actual)
    const authError = await requireAuth(request)
    if (authError) return authError

    const colaborador = getAuthColaborador()
    
    if (!colaborador || !colaborador.id) {
      return NextResponse.json(
        { error: 'No se encontró información del colaborador' },
        { status: 401 }
      )
    }

    const colaboradorId = String(colaborador.id)
    
    // Obtener datos del colaborador para el perfil en Stream
    const nombre = colaborador.persona?.nombre_completo || 
                  `${colaborador.persona?.nombres || ''} ${colaborador.persona?.primer_apellido || ''}`.trim() || 
                  colaborador.email_login || 
                  'Usuario'
    
    const avatar = colaborador.persona?.imagen?.url 
      ? `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${colaborador.persona.imagen.url}`
      : undefined

    // Obtener cliente de Stream
    const streamClient = getStreamClient()

    // Crear o actualizar usuario en Stream y generar token
    const token = streamClient.createToken(colaboradorId)

    // Opcional: Actualizar información del usuario en Stream
    await streamClient.upsertUser({
      id: colaboradorId,
      name: nombre,
      image: avatar,
    })

    return NextResponse.json({ 
      token,
      userId: colaboradorId,
    })
  } catch (error: any) {
    console.error('[API /chat/stream-token] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar token de Stream' },
      { status: 500 }
    )
  }
}
```

---

## Paso 7: Actualizar componente de chat con Stream SDK

**⚠️ IMPORTANTE**: En este paso reemplazaremos **TODA la lógica** del componente, pero mantendremos la **UI/interfaz visual** igual.

Vamos a usar Stream Chat SDK directamente en el componente React. Esto significa:
- ✅ Eliminamos polling
- ✅ Eliminamos llamadas a `/api/chat/mensajes`
- ✅ Usamos Stream Chat SDK para todo (mensajes, canales, tiempo real)
- ✅ Mantenemos la misma UI (estilos, estructura HTML)

### 7.1. Crear hook personalizado para Stream Chat

Primero, crea un hook que maneje la conexión y autenticación con Stream:

**Archivo**: `src/app/(admin)/(apps)/chat/hooks/useStreamChat.ts`

```typescript
/**
 * Hook personalizado para manejar Stream Chat
 */

import { useEffect, useState } from 'react'
import { StreamChat, Channel } from 'stream-chat'

interface UseStreamChatReturn {
  client: StreamChat | null
  channel: Channel | null
  isLoading: boolean
  error: string | null
}

export function useStreamChat(
  userId: string | null,
  otherUserId: string | null
): UseStreamChatReturn {
  const [client, setClient] = useState<StreamChat | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || !otherUserId) {
      setIsLoading(false)
      return
    }

    let streamClient: StreamChat | null = null

    const initializeStream = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 1. Obtener token de autenticación desde tu API
        const tokenResponse = await fetch('/api/chat/stream-token', {
          method: 'POST',
        })

        if (!tokenResponse.ok) {
          throw new Error('Error al obtener token de Stream')
        }

        const { token } = await tokenResponse.json()

        // 2. Inicializar cliente de Stream
        const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
        if (!apiKey) {
          throw new Error('NEXT_PUBLIC_STREAM_CHAT_API_KEY no está configurado')
        }

        streamClient = StreamChat.getInstance(apiKey)

        // 3. Conectar usuario con el token
        await streamClient.connectUser(
          {
            id: userId,
          },
          token
        )

        setClient(streamClient)

        // 4. Crear o obtener canal 1-a-1
        const memberIds = [userId, otherUserId].sort()
        const channelId = `chat-${memberIds[0]}-${memberIds[1]}`
        
        const streamChannel = streamClient.channel('messaging', channelId, {
          members: [userId, otherUserId],
        })

        // Watch el canal (esto crea el canal si no existe y obtiene mensajes)
        await streamChannel.watch()
        
        setChannel(streamChannel)
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

  return { client, channel, isLoading, error }
}
```

### 7.2. Actualizar variables de entorno (frontend)

Agrega la API Key pública al `.env.local`:

```env
# Stream Chat - Credenciales
STREAM_CHAT_API_KEY=tu_api_key_aqui
STREAM_CHAT_API_SECRET=tu_api_secret_aqui

# API Key pública para el frontend (necesaria para el cliente)
NEXT_PUBLIC_STREAM_CHAT_API_KEY=tu_api_key_aqui
```

**Nota**: El `NEXT_PUBLIC_` hace que la variable sea accesible en el navegador (es seguro, es la API Key pública).

### 7.3. Actualizar el componente de chat

Ahora actualiza `src/app/(admin)/(apps)/chat/page.tsx`. 

**⚠️ IMPORTANTE**: 
- Reemplaza **SOLO la lógica** (useState, useEffect, funciones de envío/recibo)
- **MANTÉN TODA la UI igual** (JSX, estilos, estructura HTML, avatares, etc.)
- Solo cambia de dónde vienen los datos (Stream en lugar de API routes)

Aquí está la estructura básica con los cambios de lógica (debes copiar el resto de la UI del componente original):

```typescript
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
import type { MessageResponse } from 'stream-chat'

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
  const [messages, setMessages] = useState<MessageType[]>([])
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Usar Stream Chat
  const { channel, isLoading: isLoadingStream, error: streamError } = useStreamChat(
    currentUserId,
    currentContact?.id || null
  )

  // Cargar contactos (esta parte se mantiene igual - solo para mostrar la lista)
  useEffect(() => {
    const cargarContactos = async () => {
      try {
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
      }
    }

    cargarContactos()
  }, [])

  // Cargar mensajes desde Stream cuando el canal cambia
  useEffect(() => {
    if (!channel) {
      setMessages([])
      return
    }

    // Función para mapear mensajes de Stream al formato que usa tu UI
    const mapStreamMessages = (streamMessages: MessageResponse[]) => {
      return streamMessages.map((msg) => {
        const userId = msg.user?.id || ''
        const fecha = msg.created_at ? new Date(msg.created_at) : new Date()

        return {
          id: msg.id || '',
          senderId: userId,
          text: msg.text || '',
          time: fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        }
      })
    }

    // Cargar mensajes iniciales
    const loadMessages = async () => {
      try {
        const state = await channel.state
        const streamMessages = state.messages || []
        const mappedMessages = mapStreamMessages(streamMessages)
        setMessages(mappedMessages)

        // Scroll al final
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } catch (err) {
        console.error('Error al cargar mensajes:', err)
      }
    }

    loadMessages()

    // Escuchar nuevos mensajes en tiempo real
    const handleNewMessage = (event: any) => {
      if (event.message) {
        const mappedMessage = mapStreamMessages([event.message])[0]
        setMessages((prev) => {
          // Evitar duplicados
          if (prev.some((m) => m.id === mappedMessage.id)) {
            return prev
          }
          return [...prev, mappedMessage]
        })

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }

    channel.on('message.new', handleNewMessage)

    // Cleanup
    return () => {
      channel.off('message.new', handleNewMessage)
    }
  }, [channel])

  // Enviar mensaje usando Stream
  const handleSendMessage = async () => {
    if (!messageText.trim() || !channel || isSending || !currentUserId) return

    const texto = messageText.trim()
    setMessageText('')
    setIsSending(true)

    try {
      await channel.sendMessage({
        text: texto,
      })
    } catch (err: any) {
      console.error('Error al enviar mensaje:', err)
      setMessageText(texto) // Restaurar el texto si falla
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

  // ============================================
  // A PARTIR DE AQUÍ, MANTÉN TODA LA UI IGUAL
  // Copia exactamente el JSX del componente original
  // Solo cambias las referencias a datos (messages, handleSendMessage, etc.)
  // ============================================
  
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

                {/* ... resto de controles (video, audio, menú) ... */}
              </>
            )}
          </CardHeader>

          <SimplebarClient className="card-body pt-0 mb-5 pb-2" style={{ maxHeight: 'calc(100vh - 317px)' }}>
            {isLoadingStream ? (
              <div className="d-flex align-items-center justify-content-center my-5">
                <Spinner animation="border" variant="primary" />
                <span className="ms-2">Conectando...</span>
              </div>
            ) : streamError ? (
              <Alert variant="danger">{streamError}</Alert>
            ) : messages.length > 0 ? (
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
                          {/* ... UI del mensaje (mantener igual) ... */}
                        </div>
                      )}

                      {/* Mensaje del usuario actual - DERECHA, AZUL */}
                      {isFromCurrentUser && (
                        <div className="d-flex align-items-start gap-2 my-3 text-end chat-item justify-content-end">
                          {/* ... UI del mensaje (mantener igual) ... */}
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
                  disabled={!currentContact || isSending || !currentUserId || !channel}
                />
                <LuMessageSquare className="app-search-icon text-muted" />
              </div>
              <Button 
                variant="primary" 
                onClick={handleSendMessage} 
                disabled={!currentContact || isSending || !messageText.trim() || !currentUserId || !channel}
              >
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
```

**📝 Nota Importante**: 
- El código de arriba muestra **solo los cambios de lógica** (imports, hooks, estados, funciones)
- **DEBES copiar TODO el JSX/HTML del componente original** y mantenerlo exactamente igual
- Solo cambias:
  - `messages` (ahora viene de Stream)
  - `handleSendMessage` (ahora usa `channel.sendMessage()`)
  - El estado de carga (`isLoadingStream` en lugar de `isLoading`)
  - Eliminas los `useEffect` de polling y llamadas a `/api/chat/mensajes`

**Ejemplo**: Si el componente original tiene `<div className="chat-message py-2 px-3 bg-warning-subtle rounded">{message.text}</div>`, manténlo exactamente igual, solo cambia de dónde viene `message`.

---

## Paso 8: Limpiar código innecesario

Ahora que estamos usando Stream directamente en el frontend, puedes **eliminar** (o dejar comentado para referencia):

- ❌ `src/app/api/chat/mensajes/route.ts` - Ya no se usa
- ❌ `src/lib/api/chat/services.ts` - Ya no se usa (si solo tenía funciones de mensajes)
- ❌ Cualquier otro código relacionado con el polling o manejo de mensajes antiguo

**✅ Mantener**:
- ✅ `src/app/api/chat/colaboradores/route.ts` - Se sigue usando para obtener la lista de contactos
- ✅ `src/app/api/chat/stream-token/route.ts` - Se usa para autenticación
- ✅ `src/lib/stream/client.ts` - Se usa en la API route de token

---

## Paso 9: Probar la implementación

### 9.1. Verificar que las variables de entorno estén configuradas

```bash
# En el terminal, dentro de frontend-ubold
cat .env.local | grep STREAM
```

Deberías ver:
```
STREAM_CHAT_API_KEY=tu_api_key
STREAM_CHAT_API_SECRET=tu_api_secret
```

### 9.2. Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 9.3. Probar el chat

1. Abre tu aplicación en el navegador: `http://localhost:3000`
2. Inicia sesión con tu usuario
3. Ve a la página de chat
4. Intenta enviar un mensaje a otro colaborador
5. Verifica que:
   - Los mensajes se envían correctamente
   - Los mensajes se guardan (refresca la página y deberían aparecer)
   - Los mensajes aparecen para ambos usuarios

### 9.4. Verificar en el dashboard de Stream

1. Ve a tu dashboard de Stream: https://getstream.io/dashboard
2. Selecciona tu aplicación
3. Ve a la pestaña **"Chat"** → **"Explorer"**
4. Deberías ver:
   - Los canales creados (uno por cada conversación)
   - Los mensajes enviados
   - Los usuarios registrados

### 9.5. Revisar logs

Si algo falla, revisa los logs en la consola del servidor (terminal donde corriste `npm run dev`) y en la consola del navegador (F12).

---

## 🔧 Solución de problemas comunes

### Error: "STREAM_CHAT_API_KEY must be set"

**Solución**: Verifica que las variables de entorno estén en `.env.local` y que hayas reiniciado el servidor de desarrollo después de agregarlas.

### Error: "Invalid API key"

**Solución**: Verifica que copiaste correctamente el API Key desde el dashboard de Stream. No debe tener espacios ni saltos de línea.

### Error: "Invalid API secret"

**Solución**: Similar al anterior, verifica el API Secret. Asegúrate de copiarlo completo.

### Los mensajes no aparecen

**Solución**: 
1. Verifica que ambos usuarios existan en Stream (se crean automáticamente cuando se autentican)
2. Revisa los logs del servidor para ver si hay errores
3. Verifica en el dashboard de Stream que los canales y mensajes se están creando

### Los mensajes se duplican

**Solución**: Esto puede pasar si el componente está haciendo polling muy frecuente. El código actual usa 1 segundo, puedes aumentarlo a 2-3 segundos si es necesario.

---

## 📚 Recursos adicionales

- **Documentación oficial de Stream Chat**: https://getstream.io/chat/docs/
- **SDK de JavaScript/TypeScript**: https://getstream.io/chat/docs/node/
- **Guía de autenticación**: https://getstream.io/chat/docs/node/auth_overview/
- **Ejemplos de código**: https://github.com/GetStream/stream-chat-js

---

## ✅ Checklist final

Antes de considerar la implementación completa, verifica:

- [ ] Cuenta creada en Stream
- [ ] API Key y API Secret copiadas
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Dependencias instaladas (`stream-chat`)
- [ ] Archivo `src/lib/stream/client.ts` creado
- [ ] API route `/api/chat/stream-token` creada
- [ ] Hook `useStreamChat` creado
- [ ] Componente de chat actualizado con Stream SDK
- [ ] Variable `NEXT_PUBLIC_STREAM_CHAT_API_KEY` configurada
- [ ] Servidor de desarrollo corriendo sin errores
- [ ] Chat funciona: enviar y recibir mensajes
- [ ] Mensajes persisten después de refrescar la página
- [ ] Variables de entorno agregadas en Railway (para producción)

---

## 🚀 Siguiente paso: Deploy a producción

Cuando todo funcione en desarrollo:

1. Agrega las variables de entorno en Railway (o tu plataforma de hosting)
2. Haz commit de los cambios (sin el `.env.local`)
3. Haz push a tu rama
4. Railway desplegará automáticamente
5. Verifica que el chat funcione en producción

---

**¡Listo!** 🎉 Tu chat ahora usa Stream Chat completamente:
- ✅ Mensajes se almacenan automáticamente en Stream
- ✅ Tiempo real con WebSockets (sin polling)
- ✅ UI original mantenida
- ✅ Sin dependencia de Strapi para mensajes
- ✅ Código más simple y mantenible

