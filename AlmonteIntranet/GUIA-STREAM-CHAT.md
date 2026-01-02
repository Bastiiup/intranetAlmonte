# Guía de Implementación de Stream Chat

## 📋 Paso 1: Crear Cuenta en Stream ✅ (COMPLETADO)

1. ✅ Ve a [https://getstream.io/](https://getstream.io/)
2. ✅ Crea una cuenta (gratis hasta cierto límite)
3. ⏳ Crea una nueva aplicación
4. ⏳ En el Dashboard, ve a "Chat" → "Overview"
5. ⏳ Anota tu **API Key** y **API Secret**

### Instrucciones Detalladas:

1. **Crear una nueva App:**
   - En el dashboard de Stream, haz clic en "Create App" o el botón "+"
   - Dale un nombre (ej: "Intranet Chat" o "Moraleja Chat")
   - Selecciona la región más cercana (si aparece, generalmente "US East" o "EU West")
   - Haz clic en "Create App"

2. **Obtener las Credenciales:**
   - Una vez creada la app, verás el Dashboard
   - En la sección "Overview" o "Chat", busca:
     - **API Key**: Una cadena de texto larga (ej: `abcd1234efgh`)
     - **API Secret**: Haz clic en "Show" o "Reveal" para verla (ej: `xyz789abc...`)
   - **IMPORTANTE**: Anota ambas, especialmente el API Secret porque solo se muestra una vez

3. **Alternativamente:**
   - Ve a la sección "Chat" en el menú lateral
   - O busca "API Keys" en la configuración
   - Ahí encontrarás tu API Key y API Secret

## 📋 Paso 2: Configurar Variables de Entorno

Agrega estas variables de entorno en tu `.env.local` (desarrollo) y en Railway (producción):

```env
# Stream Chat
STREAM_CHAT_API_KEY=tu_api_key_aqui
STREAM_CHAT_API_SECRET=tu_api_secret_aqui
NEXT_PUBLIC_STREAM_CHAT_API_KEY=tu_api_key_aqui
```

**Nota:** `NEXT_PUBLIC_STREAM_CHAT_API_KEY` debe ser pública (se usa en el cliente), pero `STREAM_CHAT_API_SECRET` debe mantenerse privada (solo en el servidor).

## 📋 Paso 3: Estructura de Archivos

La implementación consta de:

1. **`lib/stream/client.ts`** - Cliente de Stream en el servidor (usa API Secret)
2. **`app/api/chat/stream-token/route.ts`** - Endpoint para generar tokens de autenticación
3. **`app/(admin)/(apps)/chat/hooks/useStreamChat.ts`** - Hook para manejar conexión y canal
4. **`app/(admin)/(apps)/chat/page.tsx`** - Componente principal del chat (ya existe, se modificará)

## 📋 Paso 4: Flujo de Funcionamiento

1. Usuario se autentica en tu app
2. Frontend llama a `/api/chat/stream-token` para obtener token de Stream
3. Frontend inicializa cliente de Stream con API Key pública
4. Frontend se conecta a Stream usando el token
5. Se crea/obtiene un canal 1-a-1 con otro usuario
6. Los mensajes se envían/reciben en tiempo real a través de Stream

## 📋 Paso 5: Conceptos Clave

### Usuarios
- Cada usuario en tu app debe tener un ID único (usamos el ID del colaborador)
- Stream almacena información básica del usuario (nombre, avatar)

### Canales
- Un canal es una conversación entre usuarios
- Para chat 1-a-1, creamos un canal con ID único basado en los IDs de los usuarios
- El ID del canal debe ser el mismo para ambos usuarios (ordenamos los IDs)

### Tokens
- Los tokens son necesarios para autenticarse en Stream
- Se generan en el servidor usando el API Secret
- Son específicos por usuario

## 📋 Paso 6: Instalación de Dependencias

```bash
npm install stream-chat stream-chat-react
```

## 📋 Paso 7: Estado de la Implementación

✅ **Completado:**
- Dependencias instaladas (`stream-chat`, `stream-chat-react`)
- Cliente de Stream en el servidor (`lib/stream/client.ts`)
- API route para generar tokens (`app/api/chat/stream-token/route.ts`)
- Hook `useStreamChat` creado (`app/(admin)/(apps)/chat/hooks/useStreamChat.ts`)

⏳ **Pendiente:**
- Integrar Stream Chat en el componente principal del chat (`page.tsx`)
- Configurar variables de entorno en Railway
- Probar la funcionalidad

## 📋 Paso 8: Próximos Pasos

1. **Configurar variables de entorno:**
   - Agregar `STREAM_CHAT_API_KEY` y `STREAM_CHAT_API_SECRET` en Railway
   - Agregar `NEXT_PUBLIC_STREAM_CHAT_API_KEY` en Railway

2. **Integrar en el componente:**
   - Reemplazar la lógica de carga de mensajes con `useStreamChat`
   - Actualizar el envío de mensajes para usar `sendMessage` del hook
   - Adaptar el formato de mensajes de Stream al formato esperado por el componente

3. **Probar:**
   - Verificar que los mensajes se cargan correctamente
   - Verificar que los mensajes se envían correctamente
   - Verificar que los mensajes se reciben en tiempo real
