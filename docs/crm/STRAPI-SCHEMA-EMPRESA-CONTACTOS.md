# 📋 Schema de Strapi para Content Type: `empresa-contactos`

**Fecha:** Enero 2026  
**Propósito:** Documentación del schema necesario para el Content Type "Empresa-Contactos" en Strapi  
**Relación:** Tabla intermedia que relaciona Personas con Empresas (similar a persona-trayectorias)

---

## 🏗️ CONTENT TYPE: `empresa-contactos`

### Configuración Básica

- **Nombre Singular:** `empresa-contacto`
- **Nombre Plural:** `empresa-contactos`
- **Nombre Visual:** `Empresa Contacto` (opcionalmente "CRM · Empresa Contactos")
- **Endpoint API:** `/api/empresa-contactos`
- **Tipo:** Collection Type

---

## 📊 Campos Principales

### Campos Obligatorios (*)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `persona` | Relation | ✅ Sí | Relación manyToOne hacia `personas` |
| `empresa` | Relation | ✅ Sí | Relación manyToOne hacia `empresas` |
| `cargo` | Text | ❌ No | Cargo o posición del contacto en la empresa |

---

## 🔗 Relaciones

| Campo | Tipo | Relación | Content Type Destino |
|-------|------|----------|---------------------|
| `persona` | Relation | manyToOne | `api::persona.persona` |
| `empresa` | Relation | manyToOne | `api::empresa.empresa` |

**Nota importante:** 
- La relación se hace usando el **ID numérico** de la persona (no el RUT ni el documentId)
- El RUT se usa solo para **buscar/identificar** personas, pero la relación en Strapi requiere el ID numérico
- Similar a cómo funciona `persona-trayectorias` que relaciona Persona con Colegio

---

## 📝 Ejemplo de Estructura JSON para Strapi

### Estructura del Schema JSON (para importar en Strapi)

```json
{
  "kind": "collectionType",
  "collectionName": "empresa_contactos",
  "info": {
    "singularName": "empresa-contacto",
    "pluralName": "empresa-contactos",
    "displayName": "Empresa Contacto",
    "description": "Relación entre personas y empresas con información del cargo"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "persona": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::persona.persona",
      "inversedBy": null
    },
    "empresa": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::empresa.empresa",
      "inversedBy": null
    },
    "cargo": {
      "type": "string",
      "required": false
    }
  }
}
```

---

## 📡 Endpoints API Esperados

Después de crear el content type, Strapi generará automáticamente:

```
GET    /api/empresa-contactos              # Listar todas las relaciones
GET    /api/empresa-contactos/:id          # Obtener una relación específica
POST   /api/empresa-contactos              # Crear nueva relación
PUT    /api/empresa-contactos/:id          # Actualizar relación
DELETE /api/empresa-contactos/:id          # Eliminar relación
```

---

## 🔐 Permisos Recomendados

Configurar permisos en Strapi para el Content Type `empresa-contactos`:

### Para el rol "Public" o "Authenticated":

- **find:** ✅ Habilitado (para consultar relaciones)
- **findOne:** ✅ Habilitado (para consultar una relación específica)
- **create:** ⚠️ Solo Authenticated (para crear relaciones)
- **update:** ⚠️ Solo Authenticated (para actualizar relaciones)
- **delete:** ⚠️ Solo Authenticated (para eliminar relaciones)

### Pasos para configurar permisos:

1. Ir a **Settings** → **Users & Permissions Plugin** → **Roles**
2. Seleccionar el rol (Public o Authenticated)
3. Buscar "Empresa Contacto" en la lista
4. Marcar los permisos necesarios
5. Guardar

---

## ✅ Validaciones Recomendadas

1. **Campo `cargo`:**
   - Opcional
   - Máximo 255 caracteres
   - Ejemplos: "Gerente de Ventas", "Director Comercial", "Ejecutivo de Cuentas"

2. **Relación `persona`:**
   - Requerida
   - Debe apuntar a un registro válido de `personas`

3. **Relación `empresa`:**
   - Requerida
   - Debe apuntar a un registro válido de `empresas`

---

## 🔄 Uso en la Aplicación

### Crear una relación empresa-contacto:

```javascript
POST /api/empresa-contactos
{
  "data": {
    "persona": { "connect": [123] },  // ID numérico de la persona
    "empresa": { "connect": [456] },  // ID numérico de la empresa
    "cargo": "Gerente de Ventas"
  }
}
```

### Consultar relaciones de una persona:

```javascript
GET /api/empresa-contactos?filters[persona][id][$eq]=123&populate[empresa]=true
```

### Consultar relaciones de una empresa:

```javascript
GET /api/empresa-contactos?filters[empresa][id][$eq]=456&populate[persona]=true
```

---

## 📌 Notas Importantes

1. **Tabla Intermedia:** Este content type actúa como tabla intermedia para la relación many-to-many entre `personas` y `empresas`, similar a cómo `persona-trayectorias` relaciona Personas con Colegios.

2. **Relación con Persona:** 
   - El content-type está **directamente conectado** al content-type `persona` mediante una relación `manyToOne`
   - Una persona puede tener múltiples registros en `empresa-contactos` (una por cada empresa)
   - El RUT se usa para **buscar** la persona, pero la relación se hace con el **ID numérico** de la persona

3. **Cargo:** El campo `cargo` permite almacenar información adicional sobre la relación (similar a cómo `persona-trayectorias` almacena el cargo en un colegio).

4. **Múltiples Relaciones:** Una persona puede estar relacionada con múltiples empresas, y una empresa puede tener múltiples contactos.

5. **ID Numérico:** Las relaciones usan el ID numérico (no el documentId ni el RUT) para las operaciones `connect` en Strapi. El formato es: `persona: { connect: [personaIdNum] }`

6. **Flujo de Creación:**
   - Si tienes el RUT de una persona, primero debes buscarla: `GET /api/personas?filters[rut][$eq]=12345678-9`
   - Obtener el ID numérico de la persona encontrada
   - Usar ese ID numérico para crear la relación: `POST /api/empresa-contactos` con `persona_id: 123`

---

## 🚀 Pasos para Crear en Strapi

1. Ir a **Content-Type Builder**
2. Click en **"Create new collection type"**
3. Nombre: `empresa-contacto` (singular) / `empresa-contactos` (plural)
4. Agregar campos:
   - `persona` (Relation → manyToOne → `personas`)
   - `empresa` (Relation → manyToOne → `empresas`)
   - `cargo` (Text → opcional)
5. Guardar
6. Configurar permisos (ver sección anterior)
7. Listo ✅

