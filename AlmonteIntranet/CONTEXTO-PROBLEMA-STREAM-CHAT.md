# Contexto Completo: Problema con Stream Chat

## 📋 Resumen del Problema

### Problema Principal
Stream Chat no funciona correctamente en la aplicación Next.js desplegada en Railway. Los síntomas son:

1. **Error de CSP (Content Security Policy)**: El navegador bloquea el uso de `eval()` en JavaScript
   - Error: `Content Security Policy of your site blocks the use of 'eval' in JavaScript`
   - Directiva bloqueada: `script-src`

2. **Error de Conexión WebSocket**: No se pueden establecer conexiones WebSocket con Stream Chat
   - Error: `Refused to connect to 'wss://chat.stream-io-api.com/...' because it violates the following Content Security Policy directive: "connect-src ..."`
   - El CSP está bloqueando conexiones a `wss://chat.stream-io-api.com`

3. **Mensajes no visibles**: Los mensajes se guardan en Stream Dashboard pero no se muestran en la UI del chat
   - Los mensajes aparecen en Stream Dashboard (se guardan correctamente)
   - Los mensajes NO aparecen en la interfaz del chat
   - Solo se ven los mensajes propios, no los de otros usuarios

## 🔍 Diagnóstico Realizado

### 1. Verificación de Permisos en Stream Dashboard
- ✅ **Role**: `user` (correcto, no `admin`)
- ✅ **Scope**: `messaging` (correcto, no `.app`)
- ✅ **Permisos activos**:
  - `Read Channel` ✅
  - `Create Message` ✅
  - `Read Channel Members` ✅

**Conclusión**: Los permisos en Stream Dashboard están correctamente configurados. El problema NO es de permisos.

### 2. Verificación de Versiones
- `stream-chat`: `^9.27.2` (última versión disponible)
- `stream-chat-react`: `^13.13.1` (última versión disponible)

**Conclusión**: Las versiones están actualizadas. No es un problema de versión antigua.

### 3. Análisis del Error de CSP
El error indica que:
- Stream Chat usa `eval()` o `new Function()` internamente (común en librerías modernas para optimización)
- El CSP actual no permite `'unsafe-eval'`
- Railway puede estar agregando un CSP más restrictivo que sobrescribe nuestros headers

## 🛠️ Soluciones Implementadas

### 1. Configuración de CSP en `next.config.ts`

**Ubicación**: `frontend-ubold/next.config.ts`

```typescript
async headers() {
  const cspValue = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com https://getstream.io",
    "style-src 'self' 'unsafe-inline' https://*.getstream.io",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https:",
    "connect-src 'self' https://*.getstream.io https://*.stream-io-api.com https://getstream.io wss://*.getstream.io ws://*.getstream.io wss://*.stream-io-api.com ws://*.stream-io-api.com wss://chat.stream-io-api.com",
    "frame-src 'self' https://*.getstream.io",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
  ].join('; ')

  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: cspValue,
        },
        {
          key: 'X-Content-Security-Policy',
          value: cspValue,
        },
      ],
    },
  ]
}
```

**Puntos clave**:
- `'unsafe-eval'` en `script-src` para permitir `eval()` que Stream Chat necesita
- `wss://chat.stream-io-api.com` específicamente agregado (dominio que intenta conectar)
- Header adicional `X-Content-Security-Policy` para compatibilidad

### 2. Configuración de CSP en `middleware.ts`

**Ubicación**: `frontend-ubold/src/middleware.ts`

```typescript
const response = NextResponse.next()

const cspValue = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com https://getstream.io",
  "style-src 'self' 'unsafe-inline' https://*.getstream.io",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://*.getstream.io https://*.stream-io-api.com https://getstream.io wss://*.getstream.io ws://*.getstream.io wss://*.stream-io-api.com ws://*.stream-io-api.com wss://chat.stream-io-api.com",
  "frame-src 'self' https://*.getstream.io",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
].join('; ')

response.headers.set('Content-Security-Policy', cspValue)
response.headers.set('X-Content-Security-Policy', cspValue)

return response
```

**Puntos clave**:
- El middleware se ejecuta en cada request y establece el CSP
- Esto debería tener prioridad sobre otros headers

### 3. Configuración de CSP en `layout.tsx`

**Ubicación**: `frontend-ubold/src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  // ... otros metadata
  other: {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com https://getstream.io",
      "style-src 'self' 'unsafe-inline' https://*.getstream.io",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https:",
      "connect-src 'self' https://*.getstream.io https://*.stream-io-api.com https://getstream.io wss://*.getstream.io ws://*.getstream.io wss://*.stream-io-api.com ws://*.stream-io-api.com wss://chat.stream-io-api.com",
      "frame-src 'self' https://*.getstream.io",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
    ].join('; '),
  },
}
```

**Puntos clave**:
- CSP en metadata para que se incluya en el HTML
- Mismo CSP que en los otros lugares para consistencia

### 4. Mejoras en el Código del Chat

**Ubicación**: `frontend-ubold/src/app/(admin)/(apps)/chat/page.tsx`

**Cambios realizados**:
- ✅ Agregada suscripción a eventos en tiempo real (`message.new`, `message.updated`, `message.deleted`)
- ✅ Mejorado el logging para debugging
- ✅ Agregada verificación de miembros del canal
- ✅ Agregado botón de prueba para enviar mensajes manualmente
- ✅ Mejorada la carga de mensajes históricos con `watch()` y `query()`
- ✅ Agregado monitoreo del estado del canal con `useEffect`

**Código clave**:
```typescript
// Suscripción a eventos
channel.on('message.new', (event: any) => {
  console.log('[Chat] 📨 Nuevo mensaje recibido:', {
    id: event.message?.id,
    text: event.message?.text?.substring(0, 50),
    user: event.message?.user?.id,
  })
})

// Watch con opciones completas
await channel.watch({
  state: true,
  watch: true,
  presence: true,
})
```

## 📁 Estructura del Proyecto

```
frontend-ubold/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Layout principal con CSP en metadata
│   │   ├── (admin)/
│   │   │   └── (apps)/
│   │   │       └── chat/
│   │   │           └── page.tsx          # Componente principal del chat
│   │   └── api/
│   │       └── chat/
│   │           ├── stream-token/
│   │           │   └── route.ts          # Genera tokens de Stream Chat
│   │           ├── stream-ensure-user/
│   │           │   └── route.ts          # Asegura que usuarios existan en Stream
│   │           └── colaboradores/
│   │               └── route.ts         # Lista de colaboradores para chat
│   ├── lib/
│   │   └── stream/
│   │       └── client.ts                 # Cliente de Stream Chat (servidor)
│   └── middleware.ts                     # Middleware con CSP headers
├── next.config.ts                        # Configuración de Next.js con CSP headers
└── package.json                         # Dependencias: stream-chat@^9.27.2, stream-chat-react@^13.13.1
```

## 🔧 Configuración Actual

### Variables de Entorno Necesarias

**Frontend (Next.js)**:
- `NEXT_PUBLIC_STREAM_API_KEY` o `NEXT_PUBLIC_STREAM_CHAT_API_KEY` - API Key de Stream Chat
- `NEXT_PUBLIC_STRAPI_URL` - URL del backend Strapi

**Backend (API Routes)**:
- `STREAM_API_KEY` o `STREAM_CHAT_API_KEY` - API Key de Stream Chat
- `STREAM_SECRET_KEY` o `STREAM_CHAT_API_SECRET` - API Secret de Stream Chat

### Flujo de Autenticación

1. Usuario inicia sesión → se guarda cookie `auth_colaborador`
2. Frontend llama a `/api/chat/stream-token` → genera token JWT para Stream Chat
3. Frontend conecta a Stream Chat con el token
4. Usuario selecciona contacto → se crea/obtiene canal `direct-{userId1}-{userId2}`
5. Canal se suscribe con `watch()` → carga mensajes históricos
6. Usuario envía mensaje → Stream Chat lo guarda y notifica a otros miembros

## ⚠️ Problema Pendiente

### Si el CSP Sigue Bloqueando Después del Deploy

**Causa probable**: Railway está agregando un CSP más restrictivo que sobrescribe nuestros headers.

**Solución**:
1. Verificar en Railway → Settings → Networking → Headers
2. Si hay un CSP configurado allí, modificarlo para incluir:
   ```
   script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.getstream.io https://*.stream-io-api.com;
   connect-src 'self' https://*.getstream.io https://*.stream-io-api.com wss://*.getstream.io ws://*.getstream.io wss://*.stream-io-api.com ws://*.stream-io-api.com wss://chat.stream-io-api.com;
   ```

**Cómo verificar**:
1. Abre DevTools (F12) → Network
2. Selecciona cualquier request → Headers
3. Busca `Content-Security-Policy`
4. Si NO incluye `'unsafe-eval'`, Railway está sobrescribiendo

## 📝 Logs de Debugging

El código del chat incluye logging extensivo. En la consola del navegador deberías ver:

```
[Chat] API Key disponible: Sí (oculta)
[Chat] ✅ Usuario conectado: 98
[Chat] Seleccionando colaborador: { currentUserId: "98", otherUserId: "150" }
[Chat] Creando canal: { channelId: "direct-98-150", ... }
[Chat] ✅ watch() completado exitosamente
[Chat] Canal listo: { messageCount: X, messages: [...] }
[Chat] 📨 Nuevo mensaje recibido: { id: "...", text: "...", user: "150" }
```

## 🎯 Estado Actual

- ✅ CSP configurado en 3 lugares (next.config.ts, middleware.ts, layout.tsx)
- ✅ Código del chat mejorado con suscripción a eventos y mejor logging
- ✅ Permisos en Stream Dashboard verificados y correctos
- ✅ Versiones de Stream Chat actualizadas
- ⚠️ **Pendiente**: Verificar si Railway sobrescribe los headers después del deploy

## 🔄 Próximos Pasos

1. **Desplegar los cambios** a Railway
2. **Verificar en producción** si el CSP se aplica correctamente
3. **Si Railway sobrescribe**: Configurar CSP directamente en Railway
4. **Si persiste el problema**: Contactar soporte de Railway o considerar usar un proxy reverso (Nginx) para controlar headers

## 📚 Referencias

- [Next.js CSP Documentation](https://nextjs.org/docs/app/guides/content-security-policy)
- [Stream Chat React Documentation](https://getstream.io/chat/docs/react/)
- [Stream Chat JavaScript SDK](https://getstream.io/chat/docs/javascript/)

