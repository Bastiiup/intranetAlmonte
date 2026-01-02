# ⚠️ PASOS INMEDIATOS PARA CONFIGURAR PERMISOS

## 🔴 PROBLEMA ACTUAL
- **Scope**: `.app` ❌ (INCORRECTO)
- **Role**: `admin` ❌ (INCORRECTO - los usuarios normales no son admin)

## ✅ CONFIGURACIÓN CORRECTA

### Paso 1: Cambiar Scope
1. Haz clic en el dropdown **"Scope"** (arriba, donde dice `.app`)
2. Selecciona **"messaging"** (debe estar en la sección **CHANNEL LEVEL**, no APP LEVEL)

### Paso 2: Cambiar Role
1. Haz clic en el dropdown **"Role"** (arriba, donde dice `admin`)
2. Selecciona **"user"** (este es el rol que usan los usuarios normales)

### Paso 3: Buscar y Activar Permisos

Ahora que tienes **Role: user** y **Scope: messaging**, busca estos permisos en la lista:

#### 🔑 Permisos CRÍTICOS (DEBEN estar CHECKED ✅):

1. **Read Channel**
   - Descripción: "Allows read messages from the channel"
   - Action: `ReadChannel`
   - Tags: `channels`
   - ✅ Debe estar CHECKED

2. **Create Message**
   - Descripción: "Allows send a new message"
   - Action: `CreateMessage`
   - Tags: `messages`
   - ✅ Debe estar CHECKED

3. **Read Channel Members**
   - Descripción: "Allows read channel members"
   - Action: `ReadChannelMembers`
   - Tags: `channels`
   - ✅ Debe estar CHECKED

#### 📝 Permisos Recomendados (también deberían estar CHECKED):

4. **Create Reply**
   - Descripción: "Allows send reply to a message"
   - Action: `CreateReply`
   - Tags: `messages`

5. **Create Reaction**
   - Descripción: "Allows add a reaction to a message"
   - Action: `CreateReaction`
   - Tags: `messages`

### Paso 4: Si No Ves los Permisos

1. Haz clic en **"Show Inactive"** (arriba a la derecha, junto a "Show Inactive")
2. Esto mostrará TODOS los permisos, incluso los desactivados
3. Busca los permisos mencionados arriba
4. Si están UNCHECKED, marca el checkbox ✅
5. Haz clic en **"Save"** (arriba a la derecha)

### Paso 5: Verificar Otro Rol (Si Existe)

También verifica el rol **"channel_member"**:
1. Cambia el Role a **"channel_member"** (si existe en la lista)
2. Verifica que tenga los mismos permisos activados
3. Guarda si haces cambios

## ⚠️ IMPORTANTE

- **NO uses "Read Own Channel"** - necesitas **"Read Channel"** (sin "Own")
- **NO uses "Create Message in Owned Channel"** - necesitas **"Create Message"** (sin restricciones)
- Los permisos con "Own" o "Owned" son más restrictivos y pueden causar problemas

## ✅ Después de Configurar

1. Haz clic en **"Save"** para guardar los cambios
2. Ve a tu aplicación de chat
3. Cierra y recarga la página
4. Prueba enviar y recibir mensajes entre dos usuarios diferentes

## 🎯 Resumen Visual

```
Role: [user] ← Cambiar de "admin" a "user"
Scope: [messaging] ← Cambiar de ".app" a "messaging"

Permisos que deben estar ✅:
- Read Channel ✅
- Create Message ✅
- Read Channel Members ✅
```

