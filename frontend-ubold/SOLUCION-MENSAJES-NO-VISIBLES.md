# Solución: Mensajes no visibles entre usuarios

## Problema
Los mensajes se envían correctamente (aparecen en Stream Dashboard logs), pero no son visibles para el otro usuario en la aplicación.

## Diagnóstico

### No es un problema de permisos de Strapi
Los content types de `persona` e `intranet-colaboradores` NO necesitan permisos especiales para Stream Chat. Stream Chat funciona independientemente de Strapi una vez que los usuarios están creados.

### Posibles causas en Stream Chat

1. **Los usuarios no están correctamente agregados como miembros del canal**
2. **Los mensajes no se están cargando históricamente**
3. **Hay un problema con la configuración de permisos en Stream Dashboard**

## Pasos para verificar y solucionar

### 1. Verificar en Stream Dashboard - Channel Viewer

1. Ve a **Stream Dashboard** → **Channel Viewer**
2. Busca un canal que debería tener mensajes (ej: `direct-115-98`)
3. Haz clic en el canal para ver los detalles
4. Verifica:
   - ✅ Que el canal tenga **2 miembros** listados
   - ✅ Que los **mensajes sean visibles** en el dashboard
   - ✅ Que los mensajes muestren el **usuario correcto** como remitente

### 2. Verificar permisos en Stream Dashboard

1. Ve a **Settings** → **Channel Types** → **messaging**
2. Verifica que estén habilitadas estas capabilities:
   - ✅ **Read Events** (habilitado)
   - ✅ **Delivery Events** (habilitado) 
   - ✅ **Typing Events** (habilitado)

### 3. Verificar User Roles en Stream Dashboard

1. Ve a **Settings** → **User Roles**
2. Verifica que el rol por defecto (o los roles que estés usando) tengan permisos para:
   - Leer mensajes
   - Enviar mensajes
   - Ver canales

### 4. Verificar en la consola del navegador

Abre la consola (F12) y busca los logs cuando seleccionas un contacto:

```
[Chat] Canal listo: {
  channelId: "direct-115-98",
  memberIds: ["115", "98"],
  membersCount: 2,
  messageCount: X,
  messages: [...]
}
```

**Verifica:**
- ✅ `memberIds` contiene los IDs de ambos usuarios
- ✅ `messageCount` es mayor a 0
- ✅ `messages` contiene los mensajes con los `user.id` correctos

### 5. Si los mensajes aparecen en los logs pero no en la UI

Si los mensajes aparecen en los logs de la consola pero no en `MessageList`, el problema es con el componente React. Esto podría indicar:
- Un problema con cómo `MessageList` está renderizando los mensajes
- Los mensajes están ahí pero no se están mostrando por algún filtro

### 6. Solución temporal: Forzar recarga del canal

Si nada funciona, intenta:
1. Cerrar completamente el chat
2. Recargar la página
3. Volver a abrir el chat con el mismo contacto

Esto forzará una nueva carga del canal desde Stream.

## Configuración recomendada en Stream Dashboard

### Channel Type "messaging" - Capabilities

Asegúrate de que estas capabilities estén habilitadas:
- ✅ Typing Events
- ✅ Read Events  
- ✅ Connection Events
- ✅ Custom Events
- ✅ Reactions
- ✅ Search
- ✅ Threads & Replies
- ✅ Quotes
- ✅ Mutes
- ✅ Uploads
- ✅ URL Enrichment
- ✅ Delivery Events

### Permisos de usuario

Los usuarios deberían tener estos permisos por defecto:
- Leer canales de los que son miembros
- Enviar mensajes en canales de los que son miembros
- Ver mensajes de otros miembros en el mismo canal

## Debugging adicional

Si el problema persiste, agrega este código temporalmente en el componente para ver qué está pasando:

```typescript
useEffect(() => {
  if (channel) {
    console.log('[Chat Debug] Estado del canal:', {
      members: Object.keys(channel.state.members || {}),
      messages: channel.state.messages?.map((m: any) => ({
        id: m.id,
        text: m.text,
        user: m.user?.id,
        created_at: m.created_at,
      })),
      messageCount: channel.state.messages?.length || 0,
    })
  }
}, [channel])
```

Esto te ayudará a ver en tiempo real qué está pasando con el canal.








