# Análisis de Estructura de Datos para Chat

## 🎯 Objetivo
Identificar qué propiedad ID usar de forma consistente entre el usuario actual y los colaboradores de la lista para generar el `channelId` correctamente.

## 📊 Estructura de Datos

### 1. Usuario Actual (del hook `useAuth`)

**Origen**: Cookie `auth_colaborador` parseada en `useAuth`

**Estructura esperada** (basada en `stream-token/route.ts`):
```json
{
  "id": 98,                    // ← ID numérico del colaborador
  "email_login": "bastian@example.com",
  "persona": {
    "id": 123,                 // ← ID de Persona (relación oneToOne)
    "nombre_completo": "Bastian Fuentealba",
    "nombres": "Bastian",
    "primer_apellido": "Fuentealba",
    "imagen": {
      "url": "/uploads/avatar.jpg"
    }
  }
}
```

**ID usado en Stream Chat** (de `stream-token/route.ts` línea 46):
```typescript
const colaboradorId = String(colaborador.id)  // ← Usa colaborador.id (número)
```

**ID almacenado en `currentUserIdRef`** (de `page.tsx` línea 85):
```typescript
const { token, userId } = await tokenResponse.json()
currentUserIdRef.current = userId  // ← userId viene de stream-token, que usa colaborador.id
```

### 2. Colaboradores de la Lista (de `/api/chat/colaboradores`)

**Origen**: Endpoint `/api/chat/colaboradores` que hace fetch a Strapi

**Estructura de Strapi** (formato estándar):
```json
{
  "data": [
    {
      "id": 150,                // ← ID numérico del colaborador
      "documentId": "abc123",   // ← documentId de Strapi (string, opcional)
      "attributes": {
        "email_login": "matias@example.com",
        "activo": true,
        "persona": {
          "id": 456,            // ← ID de Persona
          "documentId": "def456",
          "nombre_completo": "Matias Riquelme",
          "nombres": "Matias",
          "primer_apellido": "Riquelme"
        }
      }
    }
  ]
}
```

**Normalización en `loadColaboradores`** (de `page.tsx` líneas 145-166):
```typescript
const normalized = colaboradoresData.map((col: any) => {
  const colaboradorAttrs = col.attributes || col
  return {
    id: col.id,  // ← Usa col.id (número del colaborador)
    email_login: colaboradorAttrs.email_login,
    activo: colaboradorAttrs.activo,
    persona: {
      id: personaData.id || personaData.documentId,  // ← Puede usar id o documentId
      // ...
    }
  }
})
```

**ID usado al hacer click** (de `page.tsx` línea 351-359):
```typescript
{colaboradores.map((col) => {
  const colId = String(col.id)  // ← Usa col.id convertido a string
  onClick={() => selectColaborador(colId)}
})}
```

## 🔍 Análisis del Problema

### ✅ Lo que está bien:
1. **Usuario actual**: Usa `colaborador.id` (número) → convertido a `String(colaborador.id)`
2. **Colaborador seleccionado**: Usa `col.id` (número) → convertido a `String(col.id)`
3. **Ambos usan el ID del colaborador**, no el ID de Persona

### ⚠️ Posibles problemas:

#### Problema 1: Formato de ID inconsistente
- **Usuario actual**: `colaborador.id` puede ser número `98` o string `"98"` dependiendo de cómo se guarde en la cookie
- **Colaborador de lista**: `col.id` viene de Strapi y siempre es número `150`

**Solución aplicada**: Se convierte explícitamente a String en ambos casos:
```typescript
const myId = String(currentUserIdRef.current)  // Asegura string
const otherId = String(colaboradorId)          // Asegura string
```

#### Problema 2: Strapi puede devolver `id` o `documentId`
En Strapi v5, los registros pueden tener:
- `id`: ID numérico (legacy)
- `documentId`: ID string (nuevo formato)

**Verificación necesaria**: Revisar si Strapi está devolviendo `id` o `documentId` en la respuesta.

## 📝 Ejemplos de JSON

### Ejemplo 1: Usuario Actual (Bastian, ID 98)
```json
{
  "id": 98,
  "email_login": "bastian@example.com",
  "persona": {
    "id": 123,
    "nombre_completo": "Bastian Fuentealba"
  }
}
```
**ID usado en Stream**: `"98"` (String del colaborador.id)

### Ejemplo 2: Colaborador de Lista (Matias, ID 150)
```json
{
  "id": 150,
  "documentId": "abc123xyz",
  "attributes": {
    "email_login": "matias@example.com",
    "activo": true,
    "persona": {
      "id": 456,
      "documentId": "def456uvw",
      "nombre_completo": "Matias Riquelme"
    }
  }
}
```
**ID usado al seleccionar**: `"150"` (String del col.id)

### Ejemplo 3: Generación de ChannelId
```typescript
// Usuario Bastian (98) selecciona a Matias (150)
const myId = String(98)        // "98"
const otherId = String(150)    // "150"
const sortedIds = ["150", "98"].sort()  // ["150", "98"] (orden alfabético)
const channelId = "messaging-150-98"

// Usuario Matias (150) selecciona a Bastian (98)
const myId = String(150)       // "150"
const otherId = String(98)     // "98"
const sortedIds = ["150", "98"].sort()  // ["150", "98"] (mismo orden)
const channelId = "messaging-150-98"    // ✅ Mismo ID
```

## ✅ Conclusión

### Propiedad única compartida: `colaborador.id`

**Ambos objetos comparten**:
- **Usuario actual**: `colaborador.id` (número del colaborador)
- **Colaborador seleccionado**: `col.id` (número del colaborador)

**Ambos son del mismo tipo**: ID numérico del Content Type `api::colaborador.colaborador`

### Recomendación

✅ **Usar `colaborador.id` (convertido a String) en ambos casos** - Esto ya está implementado correctamente.

### Verificación Adicional Necesaria

Para asegurar que no hay inconsistencias, agregar logs que muestren:

```typescript
console.error('🕵️ DEBUG ESTRUCTURA:')
console.error('Usuario actual - colaborador completo:', JSON.stringify(colaborador, null, 2))
console.error('Colaborador seleccionado - objeto completo:', JSON.stringify(col, null, 2))
console.error('Usuario actual - ID usado:', myId, 'tipo:', typeof myId)
console.error('Colaborador seleccionado - ID usado:', otherId, 'tipo:', typeof otherId)
```

Esto permitirá verificar si hay diferencias en la estructura que puedan causar problemas.

## 🔧 Si el problema persiste

Si después de verificar los logs los IDs siguen siendo diferentes, puede ser que:

1. **Strapi esté devolviendo `documentId` en lugar de `id`** en algunos casos
2. **La cookie `auth_colaborador` tenga una estructura diferente** a la esperada
3. **Los IDs numéricos se estén comparando como strings** y el ordenamiento alfabético no funcione como se espera (ej: "10" < "2" en orden alfabético)

**Solución para problema 3**: Si los IDs son numéricos, ordenar numéricamente antes de convertir a string:
```typescript
const sortedIds = [Number(myId), Number(otherId)].sort((a, b) => a - b).map(String)
```

