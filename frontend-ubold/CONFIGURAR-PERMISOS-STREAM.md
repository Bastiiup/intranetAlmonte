# Configuración de Permisos en Stream Dashboard

## ⚠️ PROBLEMA ENCONTRADO

Estás configurando permisos en el **scope incorrecto**. Tienes seleccionado:
- **Scope: `.app`** (APP LEVEL) ❌

Debes cambiar a:
- **Scope: `messaging`** (CHANNEL LEVEL) ✅

## Pasos para Configurar Correctamente

### 1. Cambiar el Scope a "messaging"

1. En la página de **"Roles & Permissions"**
2. Busca el dropdown **"Scope"** (que actualmente dice `.app`)
3. Haz clic en el dropdown
4. Selecciona **"messaging"** (debe estar en la sección **CHANNEL LEVEL**)

### 2. Verificar el Rol Correcto

**IMPORTANTE**: Los usuarios normales NO tienen el rol "admin". Tienen roles como:
- `user` (rol por defecto para usuarios normales)
- `channel_member` (para miembros de canales)

**Debes verificar y configurar estos roles:**

#### Opción A: Verificar rol "user"
1. En el dropdown **"Role"**, selecciona **"user"** (no "admin")
2. Asegúrate de que el **Scope** sea **"messaging"**
3. Verifica estos permisos específicos (deben estar CHECKED ✅):

**Permisos CRÍTICOS que DEBEN estar activados:**

1. ✅ **Read Channel** 
   - Descripción: "Allows read messages from the channel"
   - Action: `ReadChannel`
   - Tags: `channels`

2. ✅ **Create Message**
   - Descripción: "Allows send a new message"
   - Action: `CreateMessage`
   - Tags: `messages`

3. ✅ **Read Channel Members**
   - Descripción: "Allows read channel members"
   - Action: `ReadChannelMembers`
   - Tags: `channels`

4. ✅ **Join Channel** (opcional pero recomendado)
   - Descripción: "Allows add own channel membership (join channel)"
   - Action: `AddOwnChannelMembership`
   - Tags: `users`, `channels`

#### Opción B: Verificar rol "channel_member"
1. Si existe el rol **"channel_member"**, también verifica sus permisos
2. Debe tener los mismos permisos que "user"

### 3. Buscar los Permisos Específicos

En la lista de permisos, busca específicamente:

- **"Read Channel"** (NO "Read Own Channel")
- **"Create Message"** (NO "Create Message in Owned Channel")
- **"Read Channel Members"**

**Importante**: Necesitas las versiones SIN "Own" (las versiones generales), no las que dicen "Own" o "Owned".

### 4. Activar los Permisos

1. Busca cada permiso en la lista
2. Si no están marcados (checkbox vacío), marca el checkbox ✅
3. Si haces cambios, haz clic en **"Save"** (arriba a la derecha)

### 5. Verificar Otros Roles Importantes

También verifica estos roles (si existen):
- `channel_member`
- `moderator`
- `guest` (si permiten usuarios invitados)

## Resumen de Permisos Mínimos Necesarios

Para el rol **"user"** con scope **"messaging"**, estos permisos DEBEN estar activados:

✅ **Read Channel** - Para leer mensajes del canal
✅ **Create Message** - Para enviar mensajes
✅ **Read Channel Members** - Para ver quién está en el canal
✅ **Create Reply** - Para responder mensajes (opcional pero recomendado)
✅ **Create Reaction** - Para reacciones (opcional)

## Si No Ves Estos Permisos

1. Haz clic en **"Show Inactive"** (arriba a la derecha) para ver todos los permisos, incluso los inactivos
2. Busca los permisos mencionados arriba
3. Actívalos marcando sus checkboxes
4. Haz clic en **"Save"**

## Después de Configurar

1. Guarda los cambios con **"Save"**
2. Cierra el chat en la aplicación
3. Recarga la página
4. Abre el chat nuevamente
5. Prueba enviar y recibir mensajes

## Nota Importante

El rol "admin" ya tiene todos los permisos activados por defecto. El problema es que tus usuarios normales NO son "admin", son "user" o "channel_member", y esos roles pueden no tener los permisos correctos configurados.


