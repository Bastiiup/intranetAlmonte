# 📋 Schema de Strapi para Content Type: `empresa` / `empresas`

**Fecha:** Enero 2026  
**Propósito:** Documentación completa del schema necesario para el Content Type "Empresa" en Strapi  
**Error relacionado:** `Invalid key empresa_nombre` - Este documento describe la estructura correcta

---

## 🏗️ CONTENT TYPE: `empresa` / `empresas`

### Configuración Básica

- **Nombre Singular:** `empresa`
- **Nombre Plural:** `empresas`
- **Nombre Visual:** `Empresa` (opcionalmente "CRM · Empresas")
- **Endpoint API:** `/api/empresas`

---

## 📊 Campos Principales

### Campos Obligatorios (*)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nombre` | Text | ✅ Sí | Nombre de la empresa (alias de empresa_nombre) |
| `empresa_nombre` | Text | ✅ Sí | Nombre comercial o de la empresa |
| `slug` | Text | ✅ Sí | Slug único generado automáticamente desde el nombre |
| `razon_social` | Text | ❌ No | Razón social legal completa |
| `rut` | Text | ❌ No | RUT de la empresa (formato: XX.XXX.XXX-X) |
| `giro` | Text | ❌ No | Giro comercial de la empresa |
| `estado` | Enumeration | ❌ No | Estado de la empresa (ver opciones abajo) |
| `region` | Text | ❌ No | Región donde opera la empresa |
| `zona` | Text | ❌ No | Zona geográfica adicional |
| `website` | Text | ❌ No | Sitio web de la empresa |

### Relaciones

| Campo | Tipo | Relación | Content Type Destino |
|-------|------|----------|---------------------|
| `comuna` | Relation | manyToOne | `comunas` (Ubicación. Comuna) |

### Enumeration: `estado`

Opciones recomendadas:
- `Activa`
- `Inactiva`
- `Pendiente`
- `Suspendida`

---

## 🔄 Componentes Repeatables

### 1. Componente: `telefonos` (Repeatable)

**Nombre del componente en Strapi:** `telefonos`  
**Tipo:** Repeatable Component

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `telefono_raw` | Text | ✅ Sí | Número de teléfono (formato libre) |
| `tipo` | Enumeration | ❌ No | Tipo de teléfono (ver opciones abajo) |
| `principal` | Boolean | ❌ No | Indica si es el teléfono principal (default: false) |

**Enumeration `tipo` (telefono):**
- `Fijo`
- `Móvil`
- `Fax`
- `Oficina`
- `Otra`

---

### 2. Componente: `emails` (Repeatable)

**Nombre del componente en Strapi:** `emails`  
**Tipo:** Repeatable Component

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | Email | ✅ Sí | Dirección de correo electrónico |
| `tipo` | Enumeration | ❌ No | Tipo de email (ver opciones abajo) |
| `principal` | Boolean | ❌ No | Indica si es el email principal (default: false) |

**Enumeration `tipo` (email):**
- `Comercial`
- `Facturación`
- `Soporte`
- `Contacto General`
- `Otra`

---

### 3. Componente: `direcciones` (Repeatable)

**Nombre del componente en Strapi:** `direcciones`  
**Tipo:** Repeatable Component

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nombre_calle` | Text | ❌ No | Nombre de la calle |
| `numero_calle` | Text | ❌ No | Número de la calle |
| `complemento_direccion` | Text | ❌ No | Complemento (depto, oficina, etc.) |
| `tipo_direccion` | Enumeration | ❌ No | Tipo de dirección (ver opciones abajo) |
| `direccion_principal_envio_facturacion` | Enumeration | ❌ No | Si es principal para envío/facturación |
| `comuna` | Relation | ❌ No | manyToOne → `comunas` |

**Enumeration `tipo_direccion`:**
- `Fiscal`
- `Comercial`
- `Envío`
- `Oficina`
- `Otra`

**Enumeration `direccion_principal_envio_facturacion`:**
- `Envío`
- `Facturación`
- `Ambas`
- `Ninguna`

---

### 4. Componente: `datos_facturacion` (Single)

**Nombre del componente en Strapi:** `datos_facturacion`  
**Tipo:** Component (Single, no repeatable)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `first_name` | Text | ❌ No | Nombre de contacto para facturación |
| `last_name` | Text | ❌ No | Apellido de contacto para facturación |
| `company` | Text | ❌ No | Nombre de la empresa para facturación |
| `email` | Email | ❌ No | Email para facturación |
| `phone` | Text | ❌ No | Teléfono para facturación |
| `address_1` | Text | ❌ No | Dirección línea 1 (calle y número) |
| `address_2` | Text | ❌ No | Dirección línea 2 (depto, oficina) |
| `city` | Text | ❌ No | Ciudad |
| `state` | Text | ❌ No | Región/Estado |
| `postcode` | Text | ❌ No | Código postal |
| `country` | Text | ❌ No | País (default: "CL") |

---

## 🔗 Relaciones con Otros Content Types

### Relaciones Salientes (oneToMany)

| Campo | Tipo | Content Type Destino | Descripción |
|-------|------|---------------------|-------------|
| `oportunidades` | Relation | `oportunidades` | Oportunidades de venta asociadas a esta empresa |
| `pedidos` | Relation | `pedidos` | Pedidos asociados a esta empresa |

**Nota:** Estas relaciones pueden ser configuradas desde el content type `oportunidades` y `pedidos` como relaciones `manyToOne` hacia `empresa`.

---

## 📝 Ejemplo de Estructura JSON para Strapi

### Estructura del Schema JSON (para importar en Strapi)

```json
{
  "kind": "collectionType",
  "collectionName": "empresas",
  "info": {
    "singularName": "empresa",
    "pluralName": "empresas",
    "displayName": "Empresa",
    "description": "Empresas del CRM"
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
    "empresa_nombre": {
      "type": "string",
      "required": true
    },
    "slug": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "razon_social": {
      "type": "string"
    },
    "rut": {
      "type": "string"
    },
    "giro": {
      "type": "string"
    },
    "estado": {
      "type": "enumeration",
      "enum": [
        "Activa",
        "Inactiva",
        "Pendiente",
        "Suspendida"
      ]
    },
    "region": {
      "type": "string"
    },
    "zona": {
      "type": "string"
    },
    "website": {
      "type": "string"
    },
    "comuna": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::comuna.comuna",
      "inversedBy": null
    },
    "telefonos": {
      "type": "component",
      "repeatable": true,
      "component": "shared.telefonos"
    },
    "emails": {
      "type": "component",
      "repeatable": true,
      "component": "shared.emails"
    },
    "direcciones": {
      "type": "component",
      "repeatable": true,
      "component": "shared.direcciones"
    },
    "datos_facturacion": {
      "type": "component",
      "repeatable": false,
      "component": "shared.datos-facturacion"
    }
  }
}
```

---

## 🔧 Componentes Compartidos Necesarios

### Componente: `shared.telefonos`

```json
{
  "collectionName": "components_shared_telefonos",
  "info": {
    "displayName": "Telefonos",
    "description": ""
  },
  "options": {},
  "attributes": {
    "telefono_raw": {
      "type": "string",
      "required": true
    },
    "tipo": {
      "type": "enumeration",
      "enum": ["Fijo", "Móvil", "Fax", "Oficina", "Otra"]
    },
    "principal": {
      "type": "boolean",
      "default": false
    }
  }
}
```

### Componente: `shared.emails`

```json
{
  "collectionName": "components_shared_emails",
  "info": {
    "displayName": "Emails",
    "description": ""
  },
  "options": {},
  "attributes": {
    "email": {
      "type": "email",
      "required": true
    },
    "tipo": {
      "type": "enumeration",
      "enum": ["Comercial", "Facturación", "Soporte", "Contacto General", "Otra"]
    },
    "principal": {
      "type": "boolean",
      "default": false
    }
  }
}
```

### Componente: `shared.direcciones`

```json
{
  "collectionName": "components_shared_direcciones",
  "info": {
    "displayName": "Direcciones",
    "description": ""
  },
  "options": {},
  "attributes": {
    "nombre_calle": {
      "type": "string"
    },
    "numero_calle": {
      "type": "string"
    },
    "complemento_direccion": {
      "type": "string"
    },
    "tipo_direccion": {
      "type": "enumeration",
      "enum": ["Fiscal", "Comercial", "Envío", "Oficina", "Otra"]
    },
    "direccion_principal_envio_facturacion": {
      "type": "enumeration",
      "enum": ["Envío", "Facturación", "Ambas", "Ninguna"]
    },
    "comuna": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::comuna.comuna"
    }
  }
}
```

### Componente: `shared.datos-facturacion`

```json
{
  "collectionName": "components_shared_datos_facturacion",
  "info": {
    "displayName": "Datos Facturacion",
    "description": ""
  },
  "options": {},
  "attributes": {
    "first_name": {
      "type": "string"
    },
    "last_name": {
      "type": "string"
    },
    "company": {
      "type": "string"
    },
    "email": {
      "type": "email"
    },
    "phone": {
      "type": "string"
    },
    "address_1": {
      "type": "string"
    },
    "address_2": {
      "type": "string"
    },
    "city": {
      "type": "string"
    },
    "state": {
      "type": "string"
    },
    "postcode": {
      "type": "string"
    },
    "country": {
      "type": "string",
      "default": "CL"
    }
  }
}
```

---

## 📡 Endpoints API Esperados

Después de crear el content type, Strapi generará automáticamente:

```
GET    /api/empresas              # Listar todas las empresas
GET    /api/empresas/:id          # Obtener una empresa específica
POST   /api/empresas              # Crear nueva empresa
PUT    /api/empresas/:id          # Actualizar empresa
DELETE /api/empresas/:id          # Eliminar empresa
```

---

## ✅ Validaciones Recomendadas

1. **Campo `empresa_nombre`:**
   - Requerido
   - Mínimo 2 caracteres
   - Máximo 255 caracteres

2. **Campo `rut`:**
   - Formato: XX.XXX.XXX-X o XXXXXXXXX-X
   - Validar formato chileno si es posible

3. **Campo `email` (en componente emails):**
   - Formato de email válido
   - Puede agregarse validación de unicidad si se requiere

---

## 🔐 Permisos Recomendados

Configurar permisos en Strapi para el Content Type `empresa`:

- **find:** Public (o Authenticated)
- **findOne:** Public (o Authenticated)
- **create:** Authenticated
- **update:** Authenticated
- **delete:** Authenticated

---

## 🚨 Solución al Error: "Invalid key empresa_nombre"

Este error ocurre cuando el campo `empresa_nombre` no existe en el Content Type `empresa` en Strapi.

### Pasos para Resolver:

1. **Verificar que el Content Type existe:**
   - Ir a Strapi Admin → Content-Type Builder
   - Buscar "empresa" o "empresas"

2. **Verificar que el campo existe:**
   - Si el Content Type existe pero no tiene el campo `empresa_nombre`, agregarlo:
     - Tipo: Text
     - Nombre: `empresa_nombre`
     - Requerido: ✅ Sí

3. **Si el Content Type no existe:**
   - Crear nuevo Content Type "empresa"
   - Agregar todos los campos según este documento
   - Guardar

4. **Verificar nombre del campo:**
   - Si usaste otro nombre (ej: `nombre` o `razon_social`), actualiza el código de la API o el campo en Strapi para que coincidan

---

## 📚 Referencias

- Documentación similar: Ver `docs/crm/README.md` para schema de `colegios`
- Estructura de componentes: Similar a `colegios`, pero adaptado para empresas

---

## 🎯 Checklist de Implementación

- [ ] Crear Content Type `empresa` en Strapi
- [ ] Agregar campo `empresa_nombre` (Text, required)
- [ ] Agregar campos principales (razon_social, rut, giro, etc.)
- [ ] Crear relación `comuna` (manyToOne)
- [ ] Crear componentes repeatables: `telefonos`, `emails`, `direcciones`
- [ ] Crear componente single: `datos_facturacion`
- [ ] Configurar enumerations (estado, tipos, etc.)
- [ ] Configurar permisos del Content Type
- [ ] Probar creación de empresa desde API
- [ ] Verificar que el error "Invalid key empresa_nombre" desaparece

---

**Última actualización:** Enero 2026

