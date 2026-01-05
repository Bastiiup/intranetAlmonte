# Correcciones al Schema de Oportunidad Generado por Cursor

## ✅ Lo que está correcto

- Estructura de archivos: ✅ Correcta
- Campos básicos: ✅ Todos correctos
- Relación con Persona: ✅ Correcta

## ⚠️ Correcciones Necesarias

### 1. Relación con Propietario

**❌ Incorrecto (lo que generó Cursor):**
```json
"propietario": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::colaborador.colaborador"
}
```

**✅ Correcto:**
```json
"propietario": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::intranet-colaboradores.intranet-colaboradores"
}
```

**O si el nombre del API es diferente, verificar:**
- El endpoint en Strapi es `/api/colaboradores`
- Pero el nombre del content-type puede ser `intranet-colaboradores`
- Verificar en Strapi Admin → Content-Type Builder → ver el nombre exacto

### 2. Nombre del Content-Type

**Verificar que el nombre sea exactamente:**
- Singular: `oportunidad` (minúscula)
- Plural: `oportunidades` (minúscula)
- Display Name: `Oportunidad` (con mayúscula)

### 3. Schema JSON Completo Corregido

```json
{
  "kind": "collectionType",
  "collectionName": "oportunidades",
  "info": {
    "singularName": "oportunidad",
    "pluralName": "oportunidades",
    "displayName": "Oportunidad",
    "description": "Oportunidades de venta en el CRM"
  },
  "options": {
    "draftAndPublish": false
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
    "monto": {
      "type": "decimal",
      "min": 0
    },
    "moneda": {
      "type": "enumeration",
      "enum": ["USD", "CLP", "EUR"],
      "default": "USD"
    },
    "etapa": {
      "type": "enumeration",
      "enum": [
        "Qualification",
        "Proposal Sent",
        "Negotiation",
        "Won",
        "Lost"
      ],
      "required": true,
      "default": "Qualification"
    },
    "estado": {
      "type": "enumeration",
      "enum": ["open", "in-progress", "closed"],
      "required": true,
      "default": "open"
    },
    "prioridad": {
      "type": "enumeration",
      "enum": ["low", "medium", "high"],
      "required": true,
      "default": "medium"
    },
    "fecha_cierre": {
      "type": "date"
    },
    "fuente": {
      "type": "string",
      "default": "Manual"
    },
    "activo": {
      "type": "boolean",
      "required": true,
      "default": true
    },
    "contacto": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::persona.persona"
    },
    "propietario": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::intranet-colaboradores.intranet-colaboradores"
    },
    "producto": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::producto.producto"
    }
  }
}
```

## 🔍 Cómo Verificar el Nombre Correcto del Content-Type de Colaboradores

1. Ir a Strapi Admin: https://strapi.moraleja.cl/admin
2. Ir a **Content-Type Builder**
3. Buscar el content-type de colaboradores
4. Ver el nombre exacto en el info:
   - Si dice `intranet-colaboradores` → usar `api::intranet-colaboradores.intranet-colaboradores`
   - Si dice `colaborador` → usar `api::colaborador.colaborador`
   - Si dice otro nombre → usar ese nombre

## 📝 Archivos a Corregir

### 1. `strapi/src/api/oportunidad/content-types/oportunidad/schema.json`

Reemplazar la relación de `propietario` con el target correcto.

### 2. Verificar Controllers, Services y Routes

Los archivos generados deberían estar bien, pero verificar que usen:
- `'api::oportunidad.oportunidad'` (con 'as any' si es necesario)

## ✅ Checklist de Verificación

- [ ] Schema JSON tiene el nombre correcto del content-type
- [ ] Relación `contacto` apunta a `api::persona.persona`
- [ ] Relación `propietario` apunta al content-type correcto de colaboradores
- [ ] Relación `producto` es opcional (puede no existir)
- [ ] Todos los campos tienen los tipos y defaults correctos
- [ ] Los valores de las enumeraciones están escritos exactamente como se especificó
- [ ] Controllers, Services y Routes usan `'api::oportunidad.oportunidad' as any`

## 🚀 Después de Corregir

1. Guardar el schema.json corregido
2. Reiniciar Strapi (se reinicia automáticamente al guardar)
3. Verificar en Content Manager que el content-type aparece
4. Probar crear una oportunidad de prueba
5. Verificar que las relaciones funcionan correctamente
6. Configurar permisos en Settings → Roles
