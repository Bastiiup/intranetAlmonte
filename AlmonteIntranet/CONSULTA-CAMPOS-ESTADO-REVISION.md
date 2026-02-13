# 🔍 Consulta: Campos de Estado de Revisión en Content-Type `curso`

**Fecha:** 30 de enero de 2026  
**Propósito:** Verificar si existen campos para gestionar el estado de revisión/validación de listas

---

## ❓ Preguntas para Strapi

Necesitamos verificar si los siguientes campos existen en el **Content-Type `curso`**:

### 1. Campo `estado_revision`
- **Tipo esperado:** Enumeration (borrador, revisado, publicado)
- **Propósito:** Indicar el estado de validación de la lista
- **Pregunta:** ¿Existe el campo `estado_revision` en el Content-Type `curso`?

### 2. Campo `fecha_revision`
- **Tipo esperado:** DateTime
- **Propósito:** Registrar cuándo fue revisada/aprobada la lista
- **Pregunta:** ¿Existe el campo `fecha_revision` en el Content-Type `curso`?

### 3. Campo `fecha_publicacion`
- **Tipo esperado:** DateTime
- **Propósito:** Registrar cuándo fue publicada la lista para comercialización
- **Pregunta:** ¿Existe el campo `fecha_publicacion` en el Content-Type `curso`?

### 4. Campo `notas_revision` (opcional)
- **Tipo esperado:** Text
- **Propósito:** Guardar notas del validador sobre la lista
- **Pregunta:** ¿Existe el campo `notas_revision` en el Content-Type `curso`?

### 5. Campo `validador` (opcional)
- **Tipo esperado:** String o Relation
- **Propósito:** Identificar quién validó la lista
- **Pregunta:** ¿Existe el campo `validador` en el Content-Type `curso`?

---

## 🎯 Consultas a Ejecutar

### Opción 1: Consultar el Schema del Content-Type

```bash
# En el panel de administración de Strapi:
# 1. Ir a Content-Type Builder
# 2. Seleccionar "curso"
# 3. Ver todos los campos disponibles
```

### Opción 2: Consultar mediante API

```javascript
// Obtener un curso y ver todos sus campos
GET /api/cursos/[ID]?populate=*
```

### Opción 3: Consultar el Schema JSON

```bash
# En el servidor de Strapi, revisar el archivo:
# src/api/curso/content-types/curso/schema.json
```

---

## 📋 Formato de Respuesta Solicitado

Por favor, proporcionar la lista completa de campos del Content-Type `curso`, indicando:

```
Campo: nombre_del_campo
Tipo: [String/Number/DateTime/Enumeration/etc]
Requerido: [Sí/No]
Descripción: [Breve descripción]
```

### Ejemplo:

```
Campo: nombre_curso
Tipo: String
Requerido: Sí
Descripción: Nombre del curso (ej: "1° Básico 2026")

Campo: matricula
Tipo: Number
Requerido: No
Descripción: Cantidad de estudiantes matriculados

Campo: versiones_materiales
Tipo: JSON
Requerido: No
Descripción: Historial de versiones de la lista de materiales
```

---

## 🚨 Problema Actual

Al intentar actualizar el campo `estado_revision` en un curso, Strapi devuelve el error:

```
Error 500: Invalid key estado_revision
```

Esto sugiere que:
1. ✅ El campo **no existe** en el Content-Type actual
2. ❌ El campo existe pero tiene **permisos restringidos**
3. ❌ El campo existe pero el **nombre es diferente**

---

## 🛠️ Acciones Según Resultado

### Si los campos **NO EXISTEN**:

Necesitamos crear los siguientes campos en el Content-Type `curso`:

```javascript
{
  "estado_revision": {
    "type": "enumeration",
    "enum": ["borrador", "revisado", "publicado"],
    "default": "borrador"
  },
  "fecha_revision": {
    "type": "datetime",
    "required": false
  },
  "fecha_publicacion": {
    "type": "datetime",
    "required": false
  },
  "notas_revision": {
    "type": "text",
    "required": false
  },
  "validador": {
    "type": "string",
    "required": false
  }
}
```

### Si los campos **EXISTEN con otro nombre**:

Indicar los nombres correctos para actualizar el código del frontend.

### Si los campos **EXISTEN pero con permisos restringidos**:

Verificar y actualizar los permisos en:
- Settings → Users & Permissions plugin → Roles
- Asegurar que el rol tenga permisos para actualizar estos campos

---

## 📝 Campos Confirmados que SÍ Existen

Basado en consultas anteriores, sabemos que estos campos **SÍ existen**:

```
✅ nombre_curso (String)
✅ nivel (String)
✅ grado (String/Number)
✅ anio / año (Number)
✅ matricula (Number)
✅ versiones_materiales (JSON)
✅ colegio (Relation)
✅ activo (Boolean)
```

---

## 🔄 Próximos Pasos

1. **Consultar Strapi** para verificar si los campos existen
2. **Si NO existen:** Crear los campos en el Content-Type Builder
3. **Si existen:** Verificar permisos y nombres correctos
4. **Actualizar el código** del frontend según la respuesta

---

## 📊 Estructura Actual de `versiones_materiales`

El campo `versiones_materiales` es un JSON que contiene:

```javascript
[
  {
    "pdf_id": "123",
    "pdf_url": "https://...",
    "fecha_creacion": "2026-01-30T...",
    "fecha_actualizacion": "2026-01-30T...",
    "materiales": [
      {
        "id": "producto-1",
        "nombre": "Cuaderno",
        "cantidad": "1",
        "aprobado": true  // ← Campo que gestiona la aprobación individual
      }
    ]
  }
]
```

Actualmente, el campo `aprobado` dentro de `materiales` funciona correctamente.  
Lo que falta es el **estado global** de la lista (borrador/revisado/publicado).

---

**Última actualización:** 30 de enero de 2026  
**Estado:** ⏳ Pendiente de respuesta de Strapi
