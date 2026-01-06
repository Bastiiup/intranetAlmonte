# Prompt para Cursor: Crear Content-Types "Actividad" y "Campaña" en Strapi

## Contexto
Necesito crear dos content-types en Strapi para el módulo CRM:
1. **Actividad** - Para registrar todas las interacciones (llamadas, emails, reuniones, notas, etc.)
2. **Campaña** - Para gestionar campañas de marketing dirigidas a segmentos específicos

## Instrucciones para Cursor

Usa este prompt en Cursor para crear ambos content-types en Strapi. Puedes hacerlo de dos formas:

### Opción 1: Crear ambos content-types en un solo prompt
Copia y pega todo el contenido de este archivo en Cursor cuando estés trabajando en el proyecto de Strapi.

### Opción 2: Crear uno por uno
Crea primero "Actividad" y luego "Campaña" por separado.

---

## CONTENT-TYPE 1: ACTIVIDAD

### Nombre del Content-Type
`actividad` (singular, Strapi lo pluralizará a `actividades`)

### Campos a crear:

#### 1. `tipo` (Enumeration)
- **Tipo:** Enumeration
- **Valores permitidos:**
  - `llamada`
  - `email`
  - `reunion`
  - `nota`
  - `cambio_estado`
  - `tarea`
  - `recordatorio`
  - `otro`
- **Requerido:** Sí
- **Default:** `nota`

#### 2. `titulo` (Text)
- **Tipo:** Text (Short text)
- **Requerido:** Sí
- **Ejemplo:** "Llamada de seguimiento con Juan Pérez"

#### 3. `descripcion` (Textarea)
- **Tipo:** Textarea (Long text)
- **Requerido:** No
- **Ejemplo:** "Cliente interesado en renovar contrato. Discutir nuevos precios."

#### 4. `fecha` (DateTime)
- **Tipo:** DateTime
- **Requerido:** Sí
- **Default:** Fecha y hora actual

#### 5. `estado` (Enumeration)
- **Tipo:** Enumeration
- **Valores permitidos:**
  - `completada`
  - `pendiente`
  - `cancelada`
  - `en_progreso`
- **Requerido:** Sí
- **Default:** `pendiente`

#### 6. `notas` (Textarea)
- **Tipo:** Textarea (Long text)
- **Requerido:** No
- **Ejemplo:** "Notas adicionales sobre la actividad"

#### 7. `relacionado_con_contacto` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-One con `persona`
- **Requerido:** No
- **Descripción:** La persona/contacto relacionada con esta actividad

#### 8. `relacionado_con_lead` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-One con `lead`
- **Requerido:** No
- **Descripción:** El lead relacionado con esta actividad

#### 9. `relacionado_con_oportunidad` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-One con `oportunidad`
- **Requerido:** No
- **Descripción:** La oportunidad relacionada con esta actividad

#### 10. `relacionado_con_colegio` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-One con `colegio`
- **Requerido:** No
- **Descripción:** El colegio relacionado con esta actividad

#### 11. `creado_por` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-One con `colaborador`
- **Requerido:** Sí
- **Descripción:** El colaborador que creó/registró esta actividad

#### 12. Campos del sistema (automáticos)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `publishedAt` (DateTime)
- `createdBy` (User)
- `updatedBy` (User)

### Configuración adicional:
- **Display name:** `Actividad`
- **API ID (singular):** `actividad`
- **API ID (plural):** `actividades`
- **Draft & Publish:** Habilitado (opcional, puedes deshabilitarlo si no lo necesitas)

---

## CONTENT-TYPE 2: CAMPAÑA

### Nombre del Content-Type
`campana` (singular, Strapi lo pluralizará a `campanas`)

### Campos a crear:

#### 1. `nombre` (Text)
- **Tipo:** Text (Short text)
- **Requerido:** Sí
- **Ejemplo:** "Q4 Lead Nurture Campaign"

#### 2. `descripcion` (Textarea)
- **Tipo:** Textarea (Long text)
- **Requerido:** No
- **Ejemplo:** "Campaña de email marketing para nutrir leads del Q4"

#### 3. `presupuesto` (Number)
- **Tipo:** Number (Decimal)
- **Requerido:** Sí
- **Default:** 0
- **Ejemplo:** 12500.00

#### 4. `objetivo` (Number)
- **Tipo:** Number (Decimal)
- **Requerido:** Sí
- **Default:** 0
- **Ejemplo:** 80000.00
- **Descripción:** Objetivo de ingresos o conversiones de la campaña

#### 5. `estado` (Enumeration)
- **Tipo:** Enumeration
- **Valores permitidos:**
  - `en_progreso`
  - `exitosa`
  - `programada`
  - `fallida`
  - `en_curso`
- **Requerido:** Sí
- **Default:** `programada`

#### 6. `tags` (JSON)
- **Tipo:** JSON
- **Requerido:** No
- **Ejemplo:** `["Email", "Retargeting", "Automation"]`
- **Descripción:** Array de strings con tags/categorías de la campaña

#### 7. `fecha_inicio` (Date)
- **Tipo:** Date
- **Requerido:** Sí
- **Descripción:** Fecha de inicio de la campaña

#### 8. `fecha_fin` (Date)
- **Tipo:** Date
- **Requerido:** No
- **Descripción:** Fecha de finalización prevista o real

#### 9. `creado_por` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-One con `colaborador`
- **Requerido:** Sí
- **Descripción:** El colaborador que creó la campaña

#### 10. `contactos` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-Many con `persona`
- **Requerido:** No
- **Descripción:** Contactos objetivo de la campaña

#### 11. `leads` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-Many con `lead`
- **Requerido:** No
- **Descripción:** Leads objetivo de la campaña

#### 12. `colegios` (Relation)
- **Tipo:** Relation
- **Relación:** Many-to-Many con `colegio`
- **Requerido:** No
- **Descripción:** Colegios objetivo de la campaña

#### 13. Campos del sistema (automáticos)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `publishedAt` (DateTime)
- `createdBy` (User)
- `updatedBy` (User)

### Configuración adicional:
- **Display name:** `Campaña`
- **API ID (singular):** `campana`
- **API ID (plural):** `campanas`
- **Draft & Publish:** Habilitado (opcional)

---

## Pasos para crear en Strapi Admin

### Método 1: Usando Strapi Admin UI

1. Ve a **Content-Type Builder** en el panel de administración
2. Click en **"Create new collection type"**
3. Ingresa el nombre: `Actividad` (o `Campaña`)
4. Agrega cada campo según la especificación anterior
5. Configura las relaciones según se indica
6. Guarda el content-type
7. Repite para el segundo content-type

### Método 2: Usando archivos de schema (Recomendado para Cursor)

Si estás usando Cursor en el proyecto de Strapi, puedes crear los archivos de schema directamente:

#### Para Actividad:
Crea el archivo: `src/api/actividad/content-types/actividad/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "actividades",
  "info": {
    "singularName": "actividad",
    "pluralName": "actividades",
    "displayName": "Actividad",
    "description": "Actividades del CRM: llamadas, emails, reuniones, notas, etc."
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "tipo": {
      "type": "enumeration",
      "enum": [
        "llamada",
        "email",
        "reunion",
        "nota",
        "cambio_estado",
        "tarea",
        "recordatorio",
        "otro"
      ],
      "default": "nota",
      "required": true
    },
    "titulo": {
      "type": "string",
      "required": true
    },
    "descripcion": {
      "type": "text"
    },
    "fecha": {
      "type": "datetime",
      "required": true
    },
    "estado": {
      "type": "enumeration",
      "enum": [
        "completada",
        "pendiente",
        "cancelada",
        "en_progreso"
      ],
      "default": "pendiente",
      "required": true
    },
    "notas": {
      "type": "text"
    },
    "relacionado_con_contacto": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::persona.persona"
    },
    "relacionado_con_lead": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::lead.lead"
    },
    "relacionado_con_oportunidad": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::oportunidad.oportunidad"
    },
    "relacionado_con_colegio": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::colegio.colegio"
    },
    "creado_por": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::colaborador.colaborador",
      "required": true
    }
  }
}
```

#### Para Campaña:
Crea el archivo: `src/api/campana/content-types/campana/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "campanas",
  "info": {
    "singularName": "campana",
    "pluralName": "campanas",
    "displayName": "Campaña",
    "description": "Campañas de marketing del CRM"
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
    "descripcion": {
      "type": "text"
    },
    "presupuesto": {
      "type": "decimal",
      "required": true,
      "default": 0
    },
    "objetivo": {
      "type": "decimal",
      "required": true,
      "default": 0
    },
    "estado": {
      "type": "enumeration",
      "enum": [
        "en_progreso",
        "exitosa",
        "programada",
        "fallida",
        "en_curso"
      ],
      "default": "programada",
      "required": true
    },
    "tags": {
      "type": "json"
    },
    "fecha_inicio": {
      "type": "date",
      "required": true
    },
    "fecha_fin": {
      "type": "date"
    },
    "creado_por": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::colaborador.colaborador",
      "required": true
    },
    "contactos": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::persona.persona"
    },
    "leads": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::lead.lead"
    },
    "colegios": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::colegio.colegio"
    }
  }
}
```

---

## Configurar Permisos

Después de crear los content-types, configura los permisos:

1. Ve a **Settings** → **Users & Permissions Plugin** → **Roles** → **Public**
2. Encuentra `Actividad` y `Campaña` en la lista
3. Habilita los siguientes permisos:
   - ✅ `find`
   - ✅ `findOne`
   - ✅ `create`
   - ✅ `update`
   - ✅ `delete`

**Nota:** Si usas autenticación, también configura los permisos para el rol `Authenticated`.

---

## Verificación

Después de crear los content-types:

1. Reinicia Strapi si es necesario
2. Verifica que aparezcan en el menú lateral de Strapi Admin
3. Prueba crear una actividad y una campaña manualmente
4. Verifica que las relaciones funcionen correctamente

---

## Notas Importantes

- Asegúrate de que los content-types relacionados (`persona`, `lead`, `oportunidad`, `colegio`, `colaborador`) ya existan en Strapi antes de crear las relaciones
- Los nombres de los campos deben coincidir exactamente con los especificados
- Si algún content-type relacionado tiene un nombre diferente, ajusta el `target` en las relaciones
- El campo `tags` en Campaña es JSON, así que puedes almacenar arrays de strings

---

## Siguiente Paso

Una vez creados los content-types en Strapi, el siguiente paso es crear las API routes en Next.js para conectar el frontend con estos content-types.
