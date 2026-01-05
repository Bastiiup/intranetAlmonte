# Prompt para Cursor: Crear Content-Type "Lead" en Strapi

Crea el content-type "Lead" en Strapi v5 con la siguiente estructura:

## Content-Type: Lead

**Nombre:** Lead (singular)
**API ID:** `api::lead.lead`
**Collection Name:** `leads`

## Campos a crear:

1. **nombre** - Text (Required: ✅)
2. **email** - Email
3. **telefono** - Text
4. **empresa** - Text
5. **monto_estimado** - Number (Decimal, Min: 0)
6. **etiqueta** - Enumeration (Required: ✅, Default: "baja")
   - Valores: `baja`, `media`, `alta`
7. **estado** - Enumeration (Required: ✅, Default: "in-progress")
   - Valores: `in-progress`, `proposal-sent`, `follow-up`, `pending`, `negotiation`, `rejected`
8. **fuente** - Text (Default: "Manual")
9. **fecha_creacion** - Date
10. **activo** - Boolean (Required: ✅, Default: true)
11. **notas** - Rich Text
12. **fecha_proximo_seguimiento** - DateTime

## Relaciones:

1. **asignado_a** - Relation (manyToOne) → `api::intranet-colaborador.intranet-colaborador`
2. **relacionado_con_persona** - Relation (manyToOne) → `api::persona.persona`
3. **relacionado_con_colegio** - Relation (manyToOne) → `api::colegio.colegio`

## Archivos a crear:

1. `src/api/lead/content-types/lead/schema.json` - Con el schema completo
2. `src/api/lead/controllers/lead.ts` - Controller usando factories
3. `src/api/lead/services/lead.ts` - Service usando factories
4. `src/api/lead/routes/lead.ts` - Routes usando factories

## Schema JSON completo:

```json
{
  "kind": "collectionType",
  "collectionName": "leads",
  "info": {
    "singularName": "lead",
    "pluralName": "leads",
    "displayName": "Lead",
    "description": "Prospectos iniciales que pueden convertirse en Oportunidades"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "nombre": {
      "type": "string",
      "required": true
    },
    "email": {
      "type": "email"
    },
    "telefono": {
      "type": "string"
    },
    "empresa": {
      "type": "string"
    },
    "monto_estimado": {
      "type": "decimal",
      "min": 0
    },
    "etiqueta": {
      "type": "enumeration",
      "enum": ["baja", "media", "alta"],
      "default": "baja",
      "required": true
    },
    "estado": {
      "type": "enumeration",
      "enum": ["in-progress", "proposal-sent", "follow-up", "pending", "negotiation", "rejected"],
      "default": "in-progress",
      "required": true
    },
    "fuente": {
      "type": "string",
      "default": "Manual"
    },
    "fecha_creacion": {
      "type": "date"
    },
    "activo": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "notas": {
      "type": "richtext"
    },
    "fecha_proximo_seguimiento": {
      "type": "datetime"
    },
    "asignado_a": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::intranet-colaborador.intranet-colaborador",
      "inversedBy": null
    },
    "relacionado_con_persona": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::persona.persona",
      "inversedBy": null
    },
    "relacionado_con_colegio": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::colegio.colegio",
      "inversedBy": null
    }
  }
}
```

## Controllers, Services y Routes:

Usa los factories de Strapi con `as any` para evitar errores de TypeScript:

**Controller (`src/api/lead/controllers/lead.ts`):**
```typescript
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::lead.lead' as any)
```

**Service (`src/api/lead/services/lead.ts`):**
```typescript
import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::lead.lead' as any)
```

**Routes (`src/api/lead/routes/lead.ts`):**
```typescript
import { factories } from '@strapi/strapi'

export default factories.createCoreRouter('api::lead.lead' as any)
```

## Después de crear:

1. Compilar Strapi: `npm run build`
2. Reiniciar Strapi: `npm run develop`
3. Configurar permisos en Settings → Roles → Public → Lead (habilitar find, findOne, create, update, delete)

¡Crea el content-type completo ahora!
