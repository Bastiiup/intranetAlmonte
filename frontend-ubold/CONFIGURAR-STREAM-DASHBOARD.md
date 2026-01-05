# Configuración de Stream Chat Dashboard

## Problema Actual
Los mensajes se están enviando (se ven en los logs), pero no aparecen en el chat del otro usuario.

## Configuración Necesaria en Stream Dashboard

### 1. Verificar Permisos del Channel Type "messaging"

1. Ve a **Stream Dashboard** → **Settings** → **Channel Types**
2. Busca el channel type **"messaging"** (debería existir por defecto)
3. Haz clic en **"messaging"** para editarlo
4. Verifica la sección **"Permissions"** o **"Permissions & Roles"**

### 2. Configurar Permisos Básicos

Asegúrate de que los permisos estén configurados así:

**Para miembros del canal:**
- ✅ **Send Message**: Permitido
- ✅ **Read Messages**: Permitido
- ✅ **Read Channel**: Permitido
- ✅ **Update Channel**: Permitido (para actualizar el último mensaje)
- ✅ **Delete Message**: Permitido (opcional, para que puedan borrar sus propios mensajes)
- ✅ **Update Message**: Permitido (opcional, para que puedan editar sus propios mensajes)

**Para usuarios no miembros:**
- ❌ Todo deshabilitado

### 3. Verificar Configuración de Roles

1. Ve a **Settings** → **User Roles**
2. Asegúrate de que el rol por defecto tenga permisos para:
   - Crear canales
   - Enviar mensajes
   - Leer mensajes
   - Ver canales de los que son miembros

### 4. Configuración Recomendada para "messaging" Channel Type

Si puedes editarlo, asegúrate de que tenga estas configuraciones:

```json
{
  "name": "messaging",
  "permissions": [
    {
      "name": "Read Channel",
      "resources": ["channel"],
      "action": "ReadChannel",
      "owner": false,
      "same_member": false
    },
    {
      "name": "Send Message",
      "resources": ["message"],
      "action": "CreateMessage",
      "owner": false,
      "same_member": false
    },
    {
      "name": "Read Messages",
      "resources": ["message"],
      "action": "ReadMessage",
      "owner": false,
      "same_member": false
    }
  ]
}
```

### 5. Verificar en Channel Viewer

1. Ve a **Channel Viewer** en el sidebar
2. Busca un canal que se haya creado (ej: `direct-115-98`)
3. Verifica que:
   - El canal tenga 2 miembros
   - Los mensajes estén visibles
   - Ambos usuarios estén listados como miembros

### 6. Notas Importantes

- Stream Chat por defecto debería tener los permisos correctos para canales de tipo "messaging"
- Si no puedes editar el channel type "messaging", es posible que sea un tipo del sistema que no se puede modificar
- En ese caso, el problema podría estar en el código cliente

## Si el Problema Persiste

Si después de verificar esto el problema sigue, el problema probablemente está en:

1. **Cómo estamos cargando los mensajes** en el componente React
2. **El canal no está siendo "watched" correctamente**
3. **Los usuarios no están conectados al mismo tiempo**


