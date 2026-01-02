# Diagnóstico Full Stack: Integridad de Datos en Chat

## 🎯 Problema Reportado
El usuario con ID 155 está intentando iniciar un chat con el usuario ID 157, pero el usuario 157 NO APARECE en la lista de contactos devuelta por la API. La lista muestra otros IDs o datos incorrectos.

## 📋 Código Fuente Completo

### 1. Backend: Endpoint `/api/chat/colaboradores/route.ts`

```typescript
/**
 * API Route para obtener colaboradores desde Strapi
 * Obtiene todos los colaboradores con sus datos de Persona relacionados
 * 
 * IMPORTANTE: Este endpoint SOLO usa Intranet-colaboradores.
 * NO usa ni referencia Intranet-Chats (content type obsoleto).
 * Stream Chat maneja su propio historial, no necesitamos cruzar datos con tablas antiguas.
 */

import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColaboradorAttributes {
  email_login: string
  rol?: string
  activo: boolean
  persona?: {
    id: number
    rut?: string
    nombres?: string
    primer_apellido?: string
    segundo_apellido?: string
    nombre_completo?: string
    emails?: Array<{ email: string; tipo?: string }>
    telefonos?: Array<{ numero: string; tipo?: string }>
    imagen?: {
      url?: string
      [key: string]: any
    }
    [key: string]: any
  }
  [key: string]: any
}

export async function GET() {
  try {
    // CRÍTICO: Fetch EXCLUSIVO de Intranet-colaboradores
    // NO usar Intranet-Chats ni ninguna otra tabla antigua
    // Solo traer colaboradores activos con sus datos de Persona
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColaboradorAttributes>>>(
      '/api/colaboradores?pagination[pageSize]=1000&sort=email_login:asc&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[persona][populate][emails]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][imagen][populate]=*&filters[activo][$eq]=true'
    )
    
    // Log detallado para debugging
    console.log('[API /chat/colaboradores] Respuesta de Strapi:', {
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      count: Array.isArray(response.data) ? response.data.length : response.data ? 1 : 0,
    })
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      const firstColaborador = response.data[0] as any
      // Los datos pueden venir directamente o en attributes
      const colaboradorData = firstColaborador.attributes || firstColaborador
      console.log('[API /chat/colaboradores] Primer colaborador ejemplo:', {
        id: firstColaborador.id,
        documentId: firstColaborador.documentId,
        email_login: colaboradorData.email_login,
        persona: colaboradorData.persona ? {
          id: colaboradorData.persona.id,
          documentId: colaboradorData.persona.documentId,
          nombre_completo: colaboradorData.persona.nombre_completo,
          nombres: colaboradorData.persona.nombres,
          primer_apellido: colaboradorData.persona.primer_apellido,
        } : null,
      })
      
      // DEBUG CRÍTICO: Verificar estructura completa del primer colaborador
      console.error('[API /chat/colaboradores] 🔍 ESTRUCTURA COMPLETA PRIMER COLABORADOR:')
      console.error(JSON.stringify(firstColaborador, null, 2))
    }
    
    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('[API /chat/colaboradores] Error al obtener colaboradores:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      { error: error.message || 'Error al obtener colaboradores' },
      { status: error.status || 500 }
    )
  }
}
```

**Query a Strapi**:
```
/api/colaboradores?
  pagination[pageSize]=1000
  &sort=email_login:asc
  &populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo
  &populate[persona][populate][emails]=*
  &populate[persona][populate][telefonos]=*
  &populate[persona][populate][imagen][populate]=*
  &filters[activo][$eq]=true
```

**Análisis de la Query**:
- ✅ `pagination[pageSize]=1000` - Límite alto, debería traer todos
- ✅ `filters[activo][$eq]=true` - Solo activos (esto podría ser el problema si el usuario 157 tiene `activo: false` o `null`)
- ✅ `populate[persona]` - Populate correcto de Persona

### 2. Frontend: Procesamiento en `page.tsx`

```typescript
// Cargar lista de colaboradores
// IMPORTANTE: Esta función SOLO obtiene colaboradores de Intranet-colaboradores
// NO usa ni referencia Intranet-Chats (content type obsoleto)
// Stream Chat maneja su propio historial, no necesitamos cruzar datos con tablas antiguas
const loadColaboradores = async () => {
  try {
    setIsLoadingContacts(true)
    const response = await fetch('/api/chat/colaboradores', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Error al cargar colaboradores')
    }

    const data = await response.json()
    
    // Normalizar datos de Strapi (pueden venir con o sin attributes)
    // CRÍTICO: Solo usar datos de Intranet-colaboradores, sin cruzar con Intranet-Chats
    const colaboradoresData = Array.isArray(data.data) ? data.data : []
    
    const normalized = colaboradoresData
      .map((col: any) => {
        // Extraer datos del colaborador
        const colaboradorAttrs = col.attributes || col
        const personaData = colaboradorAttrs.persona || null
        
        // CRÍTICO: Usar el ID del colaborador (no el de Persona)
        // Este ID debe ser el mismo que se usa en la autenticación (auth_colaborador.id)
        // NO usar IDs de Intranet-Chats ni ninguna referencia cruzada antigua
        // Strapi puede devolver 'id' o 'documentId', usar el que esté disponible
        const colaboradorId = col.id || col.documentId
        
        // VALIDACIÓN: Asegurar que tenemos un ID válido
        if (!colaboradorId) {
          console.error('[Chat] ⚠️ Colaborador sin ID válido:', {
            col: col.id,
            documentId: col.documentId,
            email: colaboradorAttrs.email_login,
          })
          return null // Filtrar colaboradores sin ID válido
        }
        
        // DEBUG: Log para verificar que estamos usando el ID correcto
        if (colaboradoresData.indexOf(col) === 0) {
          console.error('[Chat] 🔍 DEBUG PRIMER COLABORADOR NORMALIZADO:')
          console.error('Colaborador raw:', {
            id: col.id,
            documentId: col.documentId,
            email: colaboradorAttrs.email_login,
          })
          console.error('Persona raw:', personaData ? {
            id: personaData.id,
            documentId: personaData.documentId,
          } : null)
          console.error('ID que se usará (colaboradorId):', colaboradorId)
        }
        
        // Normalizar estructura
        return {
          id: colaboradorId, // Usar ID del colaborador, no el de Persona
          email_login: colaboradorAttrs.email_login,
          activo: colaboradorAttrs.activo !== false, // Default true
          persona: personaData ? {
            id: personaData.id || personaData.documentId,
            nombres: personaData.nombres,
            primer_apellido: personaData.primer_apellido,
            segundo_apellido: personaData.segundo_apellido,
            nombre_completo: personaData.nombre_completo,
            imagen: personaData.imagen ? {
              url: personaData.imagen.url || (personaData.imagen.data?.attributes?.url),
            } : undefined,
          } : undefined,
        }
      })
      // Filtrar colaboradores sin ID válido (null)
      .filter((col: Colaborador | null): col is Colaborador => col !== null)
      // Filtrar solo activos
      .filter((col: Colaborador) => col.activo !== false)
      // Filtrar el usuario actual (usar el mismo ID que se usa en autenticación)
      // CRÍTICO: No usar referencias de Intranet-Chats, solo comparar IDs de colaboradores
      // Stream Chat maneja su propio historial, no necesitamos cruzar datos con tablas antiguas
      .filter((col: Colaborador) => {
        const currentId = colaborador?.id
        const colId = col.id
        const isSame = String(colId) === String(currentId)
        if (isSame) {
          console.error('[Chat] ⚠️ Usuario actual encontrado en lista (será filtrado):', {
            currentId,
            colId,
            email: col.email_login,
          })
        }
        return !isSame
      })
    
    // DEBUG CRÍTICO: Comparar IDs
    console.error('[Chat] 🔍 VERIFICACIÓN DE IDs:')
    console.error('Usuario actual (colaborador?.id):', colaborador?.id)
    console.error('Colaboradores en lista (primeros 3):', normalized.slice(0, 3).map((c: Colaborador) => ({
      id: c.id,
      email: c.email_login,
      nombre: c.persona?.nombre_completo,
    })))
    console.error('¿Usuario actual aparece en lista?', normalized.some((c: Colaborador) => String(c.id) === String(colaborador?.id)))
    
    console.log('[Chat] Colaboradores cargados:', {
      total: normalized.length,
      sample: normalized[0] ? {
        id: normalized[0].id,
        email: normalized[0].email_login,
        nombre: normalized[0].persona?.nombre_completo,
      } : null,
    })
    
    setColaboradores(normalized)
  } catch (err: any) {
    console.error('[Chat] Error al cargar colaboradores:', err)
    setError(err.message || 'Error al cargar contactos')
  } finally {
    setIsLoadingContacts(false)
  }
}
```

**Renderizado de la Lista**:
```typescript
{colaboradores.map((col) => {
  const colId = String(col.id)
  const isSelected = selectedColaboradorId === colId
  return (
    <ListGroup.Item
      key={col.id}
      action
      active={isSelected}
      onClick={() => selectColaborador(colId)}
      // ...
    >
      {/* Renderizado del contacto */}
    </ListGroup.Item>
  )
})}
```

### 3. Schemas de Content Types

#### Schema: `api::colaborador.colaborador` (Intranet · Colaboradores)

```json
{
  "kind": "collectionType",
  "collectionName": "colaboradores",
  "info": {
    "singularName": "colaborador",
    "pluralName": "colaboradores",
    "displayName": "Intranet · Colaboradores",
    "description": "Usuarios internos que operan roles en la intranet"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "persona": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::persona.persona",
      "required": true,
      "pluginOptions": {
        "content-manager": {
          "visible": true,
          "mainField": "rut"
        }
      }
    },
    "email_login": {
      "type": "email",
      "required": true,
      "unique": true
    },
    "password": {
      "type": "password",
      "required": false,
      "private": true
    },
    "usuario": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::users-permissions.user",
      "unique": true
    },
    "rol": {
      "type": "enumeration",
      "enum": [
        "super_admin",
        "encargado_adquisiciones",
        "supervisor",
        "soporte"
      ],
      "default": "soporte"
    },
    "activo": {
      "type": "boolean",
      "default": true
    },
    "activity_logs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::activity-log.activity-log",
      "mappedBy": "usuario"
    }
  }
}
```

**Campos Clave**:
- `id`: ID numérico del colaborador (generado automáticamente por Strapi)
- `activo`: Boolean, default `true` - **CRÍTICO**: Si es `false` o `null`, no aparecerá en la lista
- `persona`: Relación oneToOne con `api::persona.persona` (requerida)
- `email_login`: Email único (requerido)

#### Schema: `api::persona.persona` (Persona)

```json
{
  "kind": "collectionType",
  "collectionName": "personas",
  "info": {
    "singularName": "persona",
    "pluralName": "personas",
    "displayName": "Persona",
    "description": "Contacto académico y general",
    "mainField": "rut"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "rut": {
      "type": "string",
      "unique": true
    },
    "nombres": {
      "type": "string"
    },
    "primer_apellido": {
      "type": "string"
    },
    "segundo_apellido": {
      "type": "string"
    },
    "nombre_apellidos": {
      "type": "string"
    },
    "iniciales": {
      "type": "string"
    },
    "nombre_completo": {
      "type": "string"
    },
    "status_nombres": {
      "type": "enumeration",
      "enum": [
        "Por Verificar",
        "Verificado",
        "Aprobado",
        "Eliminado",
        "Rechazado"
      ]
    },
    "nivel_confianza": {
      "type": "enumeration",
      "default": "baja",
      "enum": [
        "baja",
        "media",
        "alta"
      ]
    },
    "origen": {
      "type": "enumeration",
      "default": "manual",
      "enum": [
        "mineduc",
        "csv",
        "manual",
        "crm",
        "web",
        "otro"
      ]
    },
    "activo": {
      "type": "boolean",
      "default": true
    },
    "notas": {
      "type": "text"
    },
    "tags": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::persona-tag.persona-tag"
    },
    "genero": {
      "type": "enumeration",
      "enum": [
        "Mujer",
        "Hombre"
      ]
    },
    "cumpleagno": {
      "type": "date"
    },
    "cartera_asignaciones": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::cartera-asignacion.cartera-asignacion",
      "mappedBy": "ejecutivo"
    },
    "identificadores_externos": {
      "type": "json"
    },
    "emails": {
      "type": "component",
      "component": "contacto.email",
      "repeatable": true
    },
    "telefonos": {
      "type": "component",
      "component": "contacto.telefono",
      "repeatable": true
    },
    "imagen": {
      "type": "component",
      "component": "contacto.imagen",
      "repeatable": false
    }
  }
}
```

## 🔍 Análisis del Problema

### Posibles Causas de que el Usuario 157 no Aparezca

#### 1. Filtro `activo: true` (MÁS PROBABLE)
**Problema**: La query filtra por `filters[activo][$eq]=true`

**Escenarios donde el usuario 157 no aparecería**:
- El colaborador con ID 157 tiene `activo: false` en la base de datos
- El colaborador con ID 157 tiene `activo: null` (no está seteado)
- El campo `activo` no existe en el registro (aunque tiene default `true`)

**Solución**: Verificar en Strapi el valor de `activo` para el colaborador ID 157

#### 2. Filtro en Frontend: `activo !== false`
**Problema**: En el frontend hay un filtro adicional:
```typescript
.filter((col: Colaborador) => col.activo !== false)
```

**Escenarios**:
- Si `activo` es `undefined` o `null`, pasará el filtro (porque `undefined !== false` es `true`)
- Pero si viene como `false` explícito, será filtrado

#### 3. Usuario Actual Filtrado Incorrectamente
**Problema**: El filtro del usuario actual compara:
```typescript
String(colId) === String(currentId)
```

**Escenarios**:
- Si el usuario 155 tiene `colaborador.id = 155` pero en la lista aparece con ID diferente
- Si hay un problema de tipos (número vs string)

#### 4. Problema con Draft & Publish
**Problema**: El schema tiene `"draftAndPublish": true`

**Escenarios**:
- El colaborador ID 157 existe pero no está publicado (`publishedAt: null`)
- Strapi por defecto solo devuelve registros publicados

**Solución**: Agregar `publicationState=live` o `publicationState=preview` a la query

#### 5. Problema con Populate de Persona
**Problema**: La query hace populate de `persona`, pero si la relación está rota:
- Si el colaborador 157 no tiene `persona` relacionada (aunque es `required: true`)
- Si el populate falla silenciosamente

## 🛠️ Soluciones Recomendadas

### Solución 1: Remover Filtro de `activo` Temporalmente
```typescript
// TEMPORAL: Remover filtro para debugging
'/api/colaboradores?pagination[pageSize]=1000&sort=email_login:asc&populate[persona][fields]=rut,nombres,primer_apellido,segundo_apellido,nombre_completo&populate[persona][populate][emails]=*&populate[persona][populate][telefonos]=*&populate[persona][populate][imagen][populate]=*'
// Remover: &filters[activo][$eq]=true
```

### Solución 2: Agregar PublicationState
```typescript
'/api/colaboradores?publicationState=live&pagination[pageSize]=1000&...'
```

### Solución 3: Agregar Logs Específicos para Usuario 157
```typescript
// En el endpoint, después de recibir la respuesta:
const usuario157 = response.data.find((col: any) => col.id === 157 || col.documentId === '157')
console.error('[API /chat/colaboradores] 🔍 BÚSQUEDA ESPECÍFICA USUARIO 157:', {
  encontrado: !!usuario157,
  id: usuario157?.id,
  documentId: usuario157?.documentId,
  activo: usuario157?.attributes?.activo,
  publicado: !!usuario157?.publishedAt,
})
```

### Solución 4: Verificar en Base de Datos Directamente
```sql
-- Verificar si el colaborador 157 existe y está activo
SELECT id, email_login, activo, published_at 
FROM colaboradores 
WHERE id = 157;

-- Verificar si tiene persona relacionada
SELECT c.id, c.email_login, c.activo, p.id as persona_id, p.nombre_completo
FROM colaboradores c
LEFT JOIN personas p ON c.persona_id = p.id
WHERE c.id = 157;
```

## 📊 Checklist de Verificación

- [ ] Verificar en Strapi Admin: ¿Existe el colaborador con ID 157?
- [ ] Verificar en Strapi Admin: ¿El colaborador 157 tiene `activo: true`?
- [ ] Verificar en Strapi Admin: ¿El colaborador 157 está publicado (`publishedAt` no es null)?
- [ ] Verificar en Strapi Admin: ¿El colaborador 157 tiene `persona` relacionada?
- [ ] Verificar en logs del servidor: ¿El usuario 157 aparece en la respuesta de Strapi?
- [ ] Verificar en logs del frontend: ¿El usuario 157 aparece después de la normalización?
- [ ] Verificar en logs del frontend: ¿El usuario 157 es filtrado por algún filtro?

## 🎯 Próximos Pasos

1. **Agregar logs específicos** para buscar el usuario 157 en cada etapa
2. **Remover filtro de activo temporalmente** para ver si aparece
3. **Verificar en Strapi Admin** el estado del colaborador 157
4. **Agregar `publicationState=live`** a la query si es necesario

