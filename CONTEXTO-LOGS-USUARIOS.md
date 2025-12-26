# Contexto: Sistema de Logs de Actividades por Usuario

## 🎯 Objetivo Principal

Implementar un sistema de logs de actividades que agrupe y muestre las acciones de los usuarios **por su email/correo electrónico**, no por ID o IP. El sistema debe:

1. **Agrupar todos los logs del mismo email** en una sola entrada en la tabla principal
2. **Mostrar el nombre completo y email** del usuario que realiza cada acción
3. **Asociar logs anónimos** (sin usuario) a usuarios reales cuando sea posible (misma IP)
4. **Mostrar el usuario/email en cada log individual** en la tabla de actividades detalladas

## 🔴 Problema Original

1. **Logs no se asociaban al usuario correcto**: Los logs aparecían como "Usuario Anónimo" incluso cuando el usuario estaba autenticado
2. **Agrupación incorrecta**: Los logs se agrupaban por ID numérico o IP, causando múltiples entradas para el mismo usuario
3. **Falta de información del usuario**: No se mostraba el email del usuario que realizaba cada acción
4. **Logs duplicados**: Un mismo usuario aparecía varias veces (una vez como anónimo, otra como usuario real)

## ✅ Solución Implementada

### 1. Agrupación por Email (No por ID)

**Archivo**: `frontend-ubold/src/app/api/logs/usuarios/route.ts`

**Cambio clave**: La agrupación ahora se hace usando el **email del usuario** como clave, no el ID numérico.

```typescript
// ANTES: Agrupaba por ID numérico
const usuariosMap = new Map<number, {...}>()

// AHORA: Agrupa por email
const usuariosMap = new Map<string, {...}>()
const emailKey = emailLogin.toLowerCase().trim()
```

**Lógica**:
- Todos los logs con el mismo `email_login` se agrupan en una sola entrada
- El ID mostrado es el del log más reciente de ese email
- Los logs anónimos solo se crean si no hay un usuario real con ese email asociado a esa IP

### 2. Captura Mejorada del Usuario en Logs

**Archivo**: `frontend-ubold/src/lib/logging/service.ts`

**Mejoras**:
- **Búsqueda recursiva del ID**: Busca el ID del colaborador en toda la estructura (puede estar en `id`, `documentId`, `data.id`, `attributes.id`, etc.)
- **Extracción mejorada del email**: Prioriza `email_login` sobre otros campos
- **Logging detallado**: Agrega logs extensos para debugging

```typescript
// Función que busca el ID recursivamente
const findId = (obj: any): string | number | null => {
  if (!obj || typeof obj !== 'object') return null
  if (obj.id !== undefined && obj.id !== null) return obj.id
  if (obj.documentId !== undefined && obj.documentId !== null) return obj.documentId
  // Busca recursivamente en toda la estructura
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const found = findId(obj[key])
      if (found) return found
    }
  }
  return null
}
```

### 3. Asegurar ID en Cookie Después del Login

**Archivo**: `frontend-ubold/src/app/api/auth/login/route.ts`

**Cambio**: Garantiza que el colaborador guardado en la cookie siempre tenga el ID en el nivel superior.

```typescript
// Asegurar que el colaborador tenga ID
if (colaboradorCompleto && colaboradorId) {
  if (!colaboradorCompleto.id && !colaboradorCompleto.documentId) {
    colaboradorCompleto = {
      ...colaboradorCompleto,
      id: colaboradorId,
    }
  }
}
```

### 4. Columna Usuario/Email en Tabla de Actividades

**Archivo**: `frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/logs/usuario/[usuarioId]/components/UserActivityLogs.tsx`

**Nueva columna**: Agregada columna "Usuario / Email" que muestra el email del usuario que realizó cada acción.

```typescript
// Helper para extraer email del usuario
const getUsuarioEmail = (log: ActivityLog): string => {
  const data = getLogData(log)
  const usuario = data.usuario
  
  if (!usuario) return 'Usuario Anónimo'
  
  // Manejar diferentes estructuras de Strapi
  let usuarioData: any = null
  if (usuario.data) {
    usuarioData = usuario.data.attributes || usuario.data
  } else if (usuario.attributes) {
    usuarioData = usuario.attributes
  } else if (typeof usuario === 'object') {
    usuarioData = usuario
  }
  
  if (usuarioData) {
    return usuarioData.email_login || usuarioData.email || 'Sin email'
  }
  
  return 'Usuario Anónimo'
}
```

## 📁 Archivos Modificados

1. **`frontend-ubold/src/app/api/logs/usuarios/route.ts`**
   - Cambio de agrupación de ID a email
   - Lógica de asociación de logs anónimos a usuarios reales

2. **`frontend-ubold/src/lib/logging/service.ts`**
   - Búsqueda recursiva del ID del colaborador
   - Mejora en extracción de email y nombre
   - Logging detallado para debugging

3. **`frontend-ubold/src/app/api/auth/login/route.ts`**
   - Asegurar que el colaborador en la cookie tenga ID
   - Populate de persona para obtener nombre completo

4. **`frontend-ubold/src/app/(admin)/(apps)/(ecommerce)/logs/usuario/[usuarioId]/components/UserActivityLogs.tsx`**
   - Nueva columna "Usuario / Email"
   - Helper para extraer email de logs

5. **`frontend-ubold/src/app/api/logs/usuario/[usuarioId]/route.ts`**
   - Populate específico para traer email_login

## 🔄 Flujo de Datos

### 1. Login del Usuario
```
Usuario inicia sesión → /api/auth/login
  ↓
Strapi valida credenciales
  ↓
Se obtiene colaborador completo con persona
  ↓
Se guarda en cookie 'colaboradorData' con ID garantizado
  ↓
Se registra log de login
```

### 2. Registro de Actividad
```
Usuario realiza acción → API Route
  ↓
logActivity(request, params) se llama
  ↓
getUserFromRequest(request) extrae usuario de cookie
  ↓
Busca ID recursivamente en estructura del colaborador
  ↓
Extrae email_login y nombre
  ↓
Crea log en Strapi con usuario.id asociado
```

### 3. Visualización de Logs
```
Usuario visita /logs → /api/logs/usuarios
  ↓
Se obtienen todos los logs de Strapi
  ↓
Se agrupan por email_login (no por ID)
  ↓
Logs anónimos se asocian a usuarios reales si comparten IP
  ↓
Se muestra tabla con una entrada por email
```

### 4. Detalles de Usuario
```
Usuario hace clic en "Ver acciones" → /logs/usuario/[id]
  ↓
Se obtienen logs del usuario por ID
  ↓
Se muestra tabla con columna "Usuario / Email"
  ↓
Cada log muestra el email del usuario que lo realizó
```

## 🏗️ Arquitectura

### Estructura de Datos en Strapi

```
ActivityLog
  ├── usuario (relación manyToOne → Colaborador)
  │   ├── id / documentId
  │   ├── email_login
  │   └── persona (relación oneWay → Persona)
  │       ├── nombres
  │       ├── primer_apellido
  │       ├── segundo_apellido
  │       └── nombre_completo
  ├── accion
  ├── entidad
  ├── descripcion
  ├── fecha
  ├── ip_address
  └── user_agent
```

### Estructura de Cookie `colaboradorData`

```json
{
  "id": 119,
  "documentId": "abc123",
  "email_login": "prueba@prueba.com",
  "persona": {
    "nombres": "Prueba",
    "primer_apellido": "Escolar",
    "nombre_completo": "Prueba Escolar"
  }
}
```

## 🔧 Detalles Técnicos

### Agrupación por Email

**Clave de agrupación**:
```typescript
const emailKey = emailLogin && emailLogin !== 'Sin usuario' && emailLogin !== 'Sin email' 
  ? emailLogin.toLowerCase().trim() 
  : `id_${usuarioId}` // Fallback si no hay email
```

**Asociación de IPs**:
```typescript
// Mapa de IP → Email
const ipToEmail = new Map<string, string>()

// Si un log anónimo tiene una IP que ya está asociada a un email,
// se agrega a ese usuario en lugar de crear uno anónimo
if (ipToEmail.has(ipAddress)) {
  const emailUsuario = ipToEmail.get(ipAddress)!
  // Agregar log a usuario existente
}
```

### Extracción de Usuario desde Cookie

**Orden de búsqueda del ID**:
1. `colaborador.id`
2. `colaborador.documentId`
3. `colaborador.data.id`
4. `colaborador.data.documentId`
5. `colaborador.attributes.id`
6. Búsqueda recursiva en toda la estructura

**Extracción de nombre**:
1. `persona.nombre_completo` (si existe)
2. `persona.nombres + persona.primer_apellido` (si existe)
3. `persona.nombres` (solo nombres)
4. `email_login` (fallback)

## 🎨 Interfaz de Usuario

### Tabla Principal (`/logs`)
- **ID**: ID del log más reciente del usuario
- **Nombre**: Nombre completo de la persona
- **Usuario / Email**: Email del usuario (`email_login`)
- **Contraseña**: Campo visual con `*****`
- **Último acceso**: Fecha del log más reciente
- **Acciones**: Botón para ver detalles → `/logs/usuario/[id]`

### Tabla de Actividades (`/logs/usuario/[id]`)
- **Fecha**: Fecha y hora del log
- **Acción**: Badge con tipo de acción (crear, actualizar, eliminar, ver)
- **Entidad**: Entidad afectada (producto, pedido, etc.)
- **Descripción**: Descripción detallada de la acción
- **IP**: Dirección IP desde donde se realizó
- **Usuario / Email**: Email del usuario que realizó la acción (NUEVO)

## 🐛 Problemas Resueltos

1. ✅ **Logs sin usuario**: Ahora se captura correctamente el usuario desde la cookie
2. ✅ **Múltiples entradas para mismo usuario**: Agrupación por email resuelve esto
3. ✅ **Logs anónimos duplicados**: Se asocian a usuarios reales cuando comparten IP
4. ✅ **Falta de email en logs**: Nueva columna muestra el email en cada log
5. ✅ **ID no encontrado**: Búsqueda recursiva encuentra el ID en cualquier estructura

## 📝 Notas Importantes

1. **La agrupación es por email, no por ID**: Esto significa que si un usuario tiene múltiples IDs (por ejemplo, después de una migración), todos sus logs se agruparán correctamente.

2. **Los logs anónimos se asocian automáticamente**: Si un usuario se conecta desde una IP que tenía logs anónimos, esos logs se asocian al usuario.

3. **El ID mostrado es el más reciente**: Para navegación, se usa el ID del log más reciente del email agrupado.

4. **La cookie debe tener el ID**: El sistema garantiza que la cookie `colaboradorData` siempre tenga el ID en el nivel superior después del login.

## 🚀 Próximos Pasos (Opcionales)

1. **Filtrado por rango de fechas**: Agregar filtros de fecha en la tabla principal
2. **Exportación de logs**: Permitir exportar logs a CSV/Excel
3. **Búsqueda avanzada**: Búsqueda por entidad, acción, fecha, etc.
4. **Dashboard de estadísticas**: Gráficos de actividades por usuario, entidad, etc.

