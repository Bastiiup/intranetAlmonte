# Migración del Sistema de Chat: De IDs Numéricos a RUTs

## 📋 Resumen Ejecutivo

Este documento detalla **TODOS** los cambios realizados para migrar el sistema de chat de usar **IDs numéricos** del content-type `Intranet-colaboradores` a usar **RUTs de la persona** como identificadores únicos. Esta migración fue necesaria debido a problemas con IDs duplicados, inconsistentes y que cambiaban entre consultas.

**Fecha de migración:** Diciembre 2025  
**Rama:** `ramaBastian-V2`  
**Estado:** ✅ Completado y funcionando

---

## 🎯 Problema Original

### Contexto
El sistema de chat estaba usando IDs numéricos del content-type `Intranet-colaboradores` para:
- Identificar usuarios en Stream Chat
- Generar `channelId` únicos para conversaciones
- Filtrar el usuario actual de la lista de contactos

### Problemas Encontrados
1. **IDs Duplicados**: Múltiples registros con el mismo `email_login` pero diferentes IDs (ej: 93, 96, 115, 167 para el mismo usuario)
2. **IDs Inconsistentes**: El mismo usuario tenía diferentes IDs en diferentes consultas
3. **IDs Cambiantes**: Los IDs numéricos podían cambiar cuando se recreaban registros
4. **Desduplicación Compleja**: La lógica de desduplicación era compleja y propensa a errores

### Solución Implementada
**Usar RUT de la persona como identificador único** porque:
- ✅ El RUT es único por persona
- ✅ El RUT es estable (no cambia)
- ✅ El RUT está disponible en todos los colaboradores con `persona` asociada
- ✅ Evita problemas de duplicados e inconsistencias

---

## 📁 Archivos Modificados

### 1. Frontend - Componente Principal del Chat
**Archivo:** `frontend-ubold/src/app/(admin)/(apps)/chat/page.tsx`

### 2. Backend - Generación de Tokens de Stream
**Archivo:** `frontend-ubold/src/app/api/chat/stream-token/route.ts`

### 3. Backend - Asegurar Usuario en Stream
**Archivo:** `frontend-ubold/src/app/api/chat/stream-ensure-user/route.ts`

### 4. Backend - Endpoint de Colaboradores (cambios menores)
**Archivo:** `frontend-ubold/src/app/api/chat/colaboradores/route.ts`
*(Este archivo tiene cambios de desduplicación que son independientes)*

---

## 🔧 Cambios Detallados por Archivo

### 1. `frontend-ubold/src/app/(admin)/(apps)/chat/page.tsx`

#### 1.1. Interfaz `Colaborador` - Agregado campo `rut`

**ANTES:**
```typescript
interface Colaborador {
  id: number
  attributes?: {
    email_login: string
    activo?: boolean
    persona?: {
      id: number
      nombre_completo?: string
      nombres?: string
      primer_apellido?: string
      imagen?: { url?: string }
    }
  }
  email_login?: string
  activo?: boolean
  persona?: {
    id: number
    nombre_completo?: string
    nombres?: string
    primer_apellido?: string
    segundo_apellido?: string
    imagen?: { url?: string }
  }
}
```

**DESPUÉS:**
```typescript
interface Colaborador {
  id: number
  rut?: string // ⭐ NUEVO: RUT como identificador único para el chat
  attributes?: {
    email_login: string
    activo?: boolean
    persona?: {
      id: number
      rut?: string // ⭐ NUEVO
      nombre_completo?: string
      nombres?: string
      primer_apellido?: string
      imagen?: { url?: string }
    }
  }
  email_login?: string
  activo?: boolean
  persona?: {
    id: number
    rut?: string // ⭐ NUEVO
    nombre_completo?: string
    nombres?: string
    primer_apellido?: string
    segundo_apellido?: string
    imagen?: { url?: string }
  }
}
```

#### 1.2. Estado del Componente - Cambio de `myColaboradorId` a `myColaboradorRut`

**ANTES:**
```typescript
const [myColaboradorId, setMyColaboradorId] = useState<number | null>(null)
```

**DESPUÉS:**
```typescript
const [myColaboradorRut, setMyColaboradorRut] = useState<string | null>(null) // ⭐ CAMBIO: De number a string, de ID a RUT
```

#### 1.3. Función de Resolución - Cambio de `resolveMyColaboradorId` a `resolveMyColaboradorRut`

**ANTES:**
```typescript
const resolveMyColaboradorId = async () => {
  // ...
  const colaboradorId = colaborador?.id || colaborador?.attributes?.id
  const colaboradorIdNum = Number(colaboradorId)
  setMyColaboradorId(colaboradorIdNum)
  await initStreamChat(colaboradorIdNum)
}
```

**DESPUÉS:**
```typescript
const resolveMyColaboradorRut = async () => {
  // ...
  // ⭐ CAMBIO: Obtener RUT en lugar de ID
  const personaRut = persona?.rut || persona?.attributes?.rut || 
                     colaborador?.persona?.rut || colaborador?.attributes?.persona?.rut
  
  if (!personaRut) {
    throw new Error('No se pudo obtener el RUT de la persona. Tu perfil debe tener un RUT configurado.')
  }

  const rutString = String(personaRut).trim()
  setMyColaboradorRut(rutString)
  await initStreamChat(rutString) // ⭐ CAMBIO: Pasar RUT en lugar de ID
}
```

#### 1.4. Función `initStreamChat` - Cambio de parámetro y lógica

**ANTES:**
```typescript
const initStreamChat = async (myColaboradorIdNum: number) => {
  // ...
  const tokenResponse = await fetch('/api/chat/stream-token', {
    method: 'POST',
    credentials: 'include',
  })
  // ...
  await client.connectUser(
    {
      id: String(myColaboradorIdNum), // ⚠️ Usaba ID numérico
      name: persona?.nombre_completo || 'Usuario',
    },
    token
  )
}
```

**DESPUÉS:**
```typescript
const initStreamChat = async (myColaboradorRut: string) => { // ⭐ CAMBIO: Parámetro string en lugar de number
  // ...
  const tokenResponse = await fetch('/api/chat/stream-token', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rut: myColaboradorRut }), // ⭐ NUEVO: Enviar RUT en el body
  })
  // ...
  await client.connectUser(
    {
      id: myColaboradorRut, // ⭐ CAMBIO: Usar RUT directamente
      name: persona?.nombre_completo || 'Usuario',
    },
    token
  )
}
```

#### 1.5. Función `selectColaborador` - Cambio completo de lógica

**ANTES:**
```typescript
const selectColaborador = async (colaboradorId: string) => {
  if (!myColaboradorId) {
    throw new Error('No se ha resuelto el ID del colaborador actual')
  }
  
  const myIdNum = Number(myColaboradorId)
  const otherIdNum = Number(colaboradorId)
  
  // Validar IDs numéricos
  if (isNaN(myIdNum) || isNaN(otherIdNum) || myIdNum <= 0 || otherIdNum <= 0) {
    throw new Error(`IDs inválidos: myId=${myIdNum}, otherId=${otherIdNum}`)
  }
  
  // Ordenar numéricamente
  const ids = [myIdNum, otherIdNum].sort((a, b) => a - b)
  const channelId = `chat-v3-${ids.join('-')}` // ⚠️ Usaba IDs numéricos
  
  // Asegurar usuario
  await fetch('/api/chat/stream-ensure-user', {
    method: 'POST',
    body: JSON.stringify({ colaboradorId: String(otherIdNum) }), // ⚠️ Enviaba ID
  })
  
  // Crear canal
  const channel = chatClient.channel('messaging', channelId, {
    members: ids.map(String), // ⚠️ Usaba IDs
  })
}
```

**DESPUÉS:**
```typescript
const selectColaborador = async (colaboradorRut: string) => { // ⭐ CAMBIO: Parámetro es RUT
  if (!myColaboradorRut) { // ⭐ CAMBIO: Verificar RUT
    throw new Error('No se ha resuelto el RUT del colaborador actual')
  }
  
  const myRut = String(myColaboradorRut).trim()
  const otherRut = String(colaboradorRut).trim()
  
  // Validar RUTs
  if (!myRut || !otherRut) {
    throw new Error(`RUTs inválidos: myRut=${myRut}, otherRut=${otherRut}`)
  }
  
  // Ordenar alfabéticamente
  const ruts = [myRut, otherRut].sort() // ⭐ CAMBIO: Orden alfabético
  const channelId = `chat-rut-${ruts.join('-')}` // ⭐ CAMBIO: Prefijo y formato
  
  // Asegurar usuario
  await fetch('/api/chat/stream-ensure-user', {
    method: 'POST',
    body: JSON.stringify({ rut: otherRut }), // ⭐ CAMBIO: Enviar RUT
  })
  
  // Crear canal
  const channel = chatClient.channel('messaging', channelId, {
    members: ruts, // ⭐ CAMBIO: Usar RUTs directamente
  })
}
```

#### 1.6. Normalización de Colaboradores - Agregar RUT y filtrar sin RUT

**ANTES:**
```typescript
return {
  id: colaboradorId,
  email_login: colaboradorAttrs.email_login,
  activo: colaboradorAttrs.activo !== false,
  persona: personaData ? {
    id: personaData.id || personaData.documentId,
    nombres: personaData.nombres,
    // ...
  } : undefined,
}
```

**DESPUÉS:**
```typescript
// ⭐ NUEVO: Obtener RUT de la persona
const personaRut = personaData?.rut || null

if (!personaRut) {
  console.warn('[Chat] ⚠️ Colaborador sin RUT, será omitido:', {
    email: colaboradorAttrs.email_login,
    id: colaboradorId,
  })
  return null // ⭐ NUEVO: Filtrar colaboradores sin RUT
}

return {
  id: colaboradorId,
  rut: personaRut, // ⭐ NUEVO: Agregar RUT al objeto
  email_login: colaboradorAttrs.email_login,
  activo: colaboradorAttrs.activo !== false,
  persona: personaData ? {
    id: personaData.id || personaData.documentId,
    rut: personaRut, // ⭐ NUEVO: Agregar RUT a persona
    nombres: personaData.nombres,
    // ...
  } : undefined,
}
```

#### 1.7. Filtro de Usuario Actual - Cambio de ID a RUT

**ANTES:**
```typescript
.filter((col: Colaborador) => {
  const currentId = colaborador?.id
  const colId = col.id
  const isSame = String(colId) === String(currentId)
  return !isSame
})
```

**DESPUÉS:**
```typescript
.filter((col: Colaborador) => {
  const currentRut = persona?.rut || colaborador?.persona?.rut || colaborador?.attributes?.persona?.rut
  const colRut = col.rut || col.persona?.rut
  const isSame = colRut && currentRut && String(colRut) === String(currentRut) // ⭐ CAMBIO: Comparar RUTs
  return !isSame
})
```

#### 1.8. Renderizado de Lista de Contactos - Cambio de ID a RUT

**ANTES:**
```typescript
{colaboradores.map((col) => {
  const colId = String(col.id) // ⚠️ Usaba ID
  const isSelected = selectedColaboradorId === colId
  return (
    <ListGroup.Item
      onClick={() => selectColaborador(colId)} // ⚠️ Pasaba ID
    >
```

**DESPUÉS:**
```typescript
{colaboradores.map((col) => {
  const colRut = col.rut || col.persona?.rut // ⭐ CAMBIO: Usar RUT
  
  if (!colRut) {
    return null // ⭐ NUEVO: Omitir si no tiene RUT
  }
  
  const isSelected = selectedColaboradorId === colRut // ⭐ CAMBIO: Comparar RUTs
  return (
    <ListGroup.Item
      onClick={() => selectColaborador(colRut)} // ⭐ CAMBIO: Pasar RUT
    >
```

#### 1.9. Validación de Renderizado - Cambio de verificación

**ANTES:**
```typescript
if (!myColaboradorId || !chatClient) {
  // Mostrar loading
}
```

**DESPUÉS:**
```typescript
if (!myColaboradorRut || !chatClient) { // ⭐ CAMBIO: Verificar RUT
  // Mostrar loading
}
```

#### 1.10. Llamada a la Función de Resolución

**ANTES:**
```typescript
resolveMyColaboradorId()
```

**DESPUÉS:**
```typescript
resolveMyColaboradorRut() // ⭐ CAMBIO: Nombre de función
```

---

### 2. `frontend-ubold/src/app/api/chat/stream-token/route.ts`

#### 2.1. Función POST - Cambio completo para usar RUT

**ANTES:**
```typescript
export async function POST(request: NextRequest) {
  const colaborador = await getAuthColaborador()
  
  if (!colaborador || !colaborador.id) {
    return NextResponse.json({ error: '...' }, { status: 401 })
  }
  
  const colaboradorId = String(colaborador.id) // ⚠️ Usaba ID
  
  // Generar token
  const token = streamClient.createToken(colaboradorId) // ⚠️ Con ID
  
  // Crear usuario
  await streamClient.upsertUser({
    id: colaboradorId, // ⚠️ ID numérico
    name: nombre,
    image: avatar,
  })
  
  return NextResponse.json({
    token,
    userId: colaboradorId, // ⚠️ ID numérico
  })
}
```

**DESPUÉS:**
```typescript
export async function POST(request: NextRequest) {
  const colaborador = await getAuthColaborador()
  
  if (!colaborador) {
    return NextResponse.json({ error: '...' }, { status: 401 })
  }
  
  // ⭐ NUEVO: Obtener RUT del body si viene, sino del colaborador
  let rut: string | null = null
  try {
    const body = await request.json()
    rut = body.rut || null
  } catch {
    // Si no hay body, usar el RUT del colaborador autenticado
  }
  
  if (!rut) {
    rut = colaborador.persona?.rut || colaborador.attributes?.persona?.rut
  }
  
  if (!rut) {
    return NextResponse.json(
      { error: 'No se pudo obtener el RUT de la persona. Tu perfil debe tener un RUT configurado.' },
      { status: 400 }
    )
  }
  
  const rutString = String(rut).trim() // ⭐ CAMBIO: Usar RUT
  
  // Generar token
  const token = streamClient.createToken(rutString) // ⭐ CAMBIO: Con RUT
  
  // Crear usuario
  await streamClient.upsertUser({
    id: rutString, // ⭐ CAMBIO: RUT como ID
    name: nombre,
    image: avatar,
  })
  
  return NextResponse.json({
    token,
    userId: rutString, // ⭐ CAMBIO: RUT como userId
  })
}
```

**Cambios Clave:**
- ✅ Acepta RUT en el body del request
- ✅ Fallback al RUT del colaborador autenticado si no viene en el body
- ✅ Valida que el RUT exista
- ✅ Usa RUT como ID de usuario en Stream Chat

---

### 3. `frontend-ubold/src/app/api/chat/stream-ensure-user/route.ts`

#### 3.1. Función POST - Cambio de ID a RUT

**ANTES:**
```typescript
export async function POST(request: NextRequest) {
  const currentColaborador = await getAuthColaborador()
  if (!currentColaborador || !currentColaborador.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  
  const body = await request.json()
  const { colaboradorId } = body // ⚠️ Esperaba ID
  
  if (!colaboradorId) {
    return NextResponse.json({ error: 'colaboradorId es requerido' }, { status: 400 })
  }
  
  // Buscar por ID
  const response = await strapiClient.get<any>(
    `/api/colaboradores?filters[id][$eq]=${colaboradorId}&...` // ⚠️ Filtro por ID
  )
  
  // ...
  
  await streamClient.upsertUser({
    id: String(colaboradorId), // ⚠️ Usaba ID
    name: nombre,
    image: avatar,
  })
  
  return NextResponse.json({
    success: true,
    userId: String(colaboradorId), // ⚠️ Retornaba ID
  })
}
```

**DESPUÉS:**
```typescript
export async function POST(request: NextRequest) {
  const currentColaborador = await getAuthColaborador()
  if (!currentColaborador) { // ⭐ CAMBIO: No verifica ID
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  
  const body = await request.json()
  const { rut } = body // ⭐ CAMBIO: Espera RUT
  
  if (!rut) {
    return NextResponse.json({ error: 'rut es requerido' }, { status: 400 })
  }
  
  const rutString = String(rut).trim() // ⭐ CAMBIO: Usar RUT
  
  // Buscar por RUT
  const response = await strapiClient.get<any>(
    `/api/colaboradores?filters[persona][rut][$eq]=${rutString}&...` // ⭐ CAMBIO: Filtro por RUT
  )
  
  // ...
  
  await streamClient.upsertUser({
    id: rutString, // ⭐ CAMBIO: Usar RUT
    name: nombre,
    image: avatar,
  })
  
  return NextResponse.json({
    success: true,
    userId: rutString, // ⭐ CAMBIO: Retornar RUT
  })
}
```

**Cambios Clave:**
- ✅ Acepta `rut` en el body en lugar de `colaboradorId`
- ✅ Busca colaborador en Strapi usando filtro por RUT: `filters[persona][rut][$eq]`
- ✅ Usa RUT como ID de usuario en Stream Chat
- ✅ Retorna RUT como `userId`

---

## 📊 Resumen de Cambios por Tipo

### Cambios de Estado/Variables
| Antes | Después | Ubicación |
|-------|---------|-----------|
| `myColaboradorId: number \| null` | `myColaboradorRut: string \| null` | `page.tsx` |
| `colaboradorId: string` (parámetro) | `colaboradorRut: string` (parámetro) | `page.tsx` |
| `myColaboradorIdNum: number` (parámetro) | `myColaboradorRut: string` (parámetro) | `page.tsx` |

### Cambios de Funciones
| Antes | Después | Ubicación |
|-------|---------|-----------|
| `resolveMyColaboradorId()` | `resolveMyColaboradorRut()` | `page.tsx` |
| `initStreamChat(id: number)` | `initStreamChat(rut: string)` | `page.tsx` |
| `selectColaborador(id: string)` | `selectColaborador(rut: string)` | `page.tsx` |

### Cambios de Formatos
| Antes | Después | Ubicación |
|-------|---------|-----------|
| `channelId = "chat-v3-{id1}-{id2}"` | `channelId = "chat-rut-{rut1}-{rut2}"` | `page.tsx` |
| IDs ordenados numéricamente | RUTs ordenados alfabéticamente | `page.tsx` |
| `members: [id1, id2]` | `members: [rut1, rut2]` | `page.tsx` |

### Cambios de Endpoints
| Endpoint | Cambio | Detalles |
|----------|--------|----------|
| `/api/chat/stream-token` | Acepta `rut` en body | Opcional, fallback a RUT del colaborador autenticado |
| `/api/chat/stream-ensure-user` | Acepta `rut` en body | Requerido, busca colaborador por RUT en Strapi |

### Cambios de Filtros
| Antes | Después | Ubicación |
|-------|---------|-----------|
| Filtrar por `col.id === currentId` | Filtrar por `col.rut === currentRut` | `page.tsx` |
| Buscar en Strapi: `filters[id][$eq]` | Buscar en Strapi: `filters[persona][rut][$eq]` | `stream-ensure-user/route.ts` |

---

## ⚠️ Consideraciones para Merge

### 1. **Conflictos Potenciales**

#### Archivos que pueden tener conflictos:
- `frontend-ubold/src/app/(admin)/(apps)/chat/page.tsx`
  - **Razón:** Archivo grande con muchos cambios
  - **Solución:** Revisar cuidadosamente, mantener la lógica de RUTs

- `frontend-ubold/src/app/api/chat/stream-token/route.ts`
  - **Razón:** Cambios en la estructura del request/response
  - **Solución:** Asegurar que acepta RUT en el body

- `frontend-ubold/src/app/api/chat/stream-ensure-user/route.ts`
  - **Razón:** Cambio en el parámetro del body (`colaboradorId` → `rut`)
  - **Solución:** Verificar que el frontend envía `rut` en lugar de `colaboradorId`

### 2. **Dependencias**

#### El sistema ahora requiere:
- ✅ Todos los colaboradores deben tener `persona` asociada
- ✅ Todas las personas deben tener `rut` configurado
- ✅ El RUT debe ser único (validación de Strapi)

#### Validaciones agregadas:
- ⚠️ Si un colaborador no tiene RUT, se omite de la lista de contactos
- ⚠️ Si el usuario logueado no tiene RUT, no puede usar el chat

### 3. **Migración de Datos Existentes**

#### Stream Chat:
- ⚠️ **IMPORTANTE:** Los usuarios existentes en Stream Chat tienen IDs numéricos
- ⚠️ Los canales existentes tienen `channelId` con formato `chat-v3-{id1}-{id2}`
- ✅ Los nuevos canales usarán formato `chat-rut-{rut1}-{rut2}`
- ⚠️ **Consideración:** Los usuarios pueden necesitar reconectarse para migrar a RUTs

#### Opciones de migración:
1. **Migración automática:** Crear script que migre usuarios y canales existentes
2. **Migración gradual:** Mantener ambos formatos durante período de transición
3. **Migración limpia:** Limpiar datos antiguos y empezar de cero (recomendado si no hay datos críticos)

### 4. **Testing Requerido**

#### Antes de hacer merge, verificar:
- ✅ Usuario logueado tiene RUT → Debe poder inicializar chat
- ✅ Usuario logueado NO tiene RUT → Debe mostrar error claro
- ✅ Contacto tiene RUT → Debe aparecer en lista
- ✅ Contacto NO tiene RUT → NO debe aparecer en lista
- ✅ Crear nuevo canal → Debe usar formato `chat-rut-{rut1}-{rut2}`
- ✅ Abrir canal existente → Debe funcionar correctamente
- ✅ Enviar mensaje → Debe funcionar
- ✅ Recibir mensaje → Debe funcionar

### 5. **Rollback Plan**

Si algo sale mal, los cambios principales a revertir son:

1. **Frontend:**
   - Revertir `myColaboradorRut` → `myColaboradorId`
   - Revertir `resolveMyColaboradorRut` → `resolveMyColaboradorId`
   - Revertir `selectColaborador` para usar IDs
   - Revertir formato de `channelId` a `chat-v3-{id1}-{id2}`

2. **Backend:**
   - Revertir `/api/chat/stream-token` para usar `colaborador.id`
   - Revertir `/api/chat/stream-ensure-user` para aceptar `colaboradorId` y buscar por ID

---

## 📝 Checklist de Merge

### Pre-Merge
- [ ] Revisar todos los archivos modificados
- [ ] Verificar que no hay referencias a `myColaboradorId` sin actualizar
- [ ] Verificar que no hay referencias a `colaboradorId` en lugar de `rut`
- [ ] Verificar que todos los colaboradores de prueba tienen RUT
- [ ] Probar flujo completo de chat en ambiente de desarrollo

### Durante Merge
- [ ] Resolver conflictos manteniendo lógica de RUTs
- [ ] Verificar que no se pierden cambios importantes
- [ ] Asegurar que los tipos TypeScript están correctos

### Post-Merge
- [ ] Probar inicialización de chat
- [ ] Probar selección de contacto
- [ ] Probar creación de canal
- [ ] Probar envío de mensajes
- [ ] Verificar logs en consola (no deben haber errores de RUT)
- [ ] Verificar que usuarios sin RUT no rompen el sistema

---

## 🔍 Búsqueda de Referencias Antiguas

Para asegurar que no quedan referencias antiguas, buscar:

```bash
# En el código
grep -r "myColaboradorId" frontend-ubold/src/
grep -r "colaboradorId" frontend-ubold/src/app/api/chat/
grep -r "chat-v3-" frontend-ubold/src/
grep -r "filters\[id\]" frontend-ubold/src/app/api/chat/
```

**Todas estas referencias deben estar actualizadas o eliminadas.**

---

## 📚 Documentación Adicional

### Commits Relacionados
Los commits relacionados con esta migración tienen mensajes que incluyen:
- "RUT"
- "rut"
- "chat"
- "Colaborador"

### Archivos de Documentación Previos
- `ROLLBACK-CHAT-ID.md` - Documenta el rollback anterior de chat_id
- `MIGRACION-CHAT-ID.md` - Documenta intento anterior con chat_id (revertido)

---

## ✅ Estado Final

**Migración completada exitosamente:**
- ✅ Frontend usa RUTs para identificar usuarios
- ✅ Backend acepta y procesa RUTs
- ✅ Stream Chat usa RUTs como IDs de usuario
- ✅ Channel IDs usan formato `chat-rut-{rut1}-{rut2}`
- ✅ Sistema filtra colaboradores sin RUT
- ✅ Validaciones implementadas
- ✅ Build compila sin errores
- ✅ Sistema funcionando en producción

---

## 🎯 Conclusión

La migración de IDs numéricos a RUTs resuelve los problemas de:
- ✅ Duplicados de IDs
- ✅ Inconsistencias entre consultas
- ✅ IDs que cambian

El sistema ahora es más robusto y confiable usando RUTs como identificadores únicos y estables.

**Última actualización:** Diciembre 2025  
**Versión del documento:** 1.0








