# ❓ Preguntas para Strapi - Error "Invalid key region"

**Fecha:** Enero 2026  
**Problema:** Error persistente `Invalid key region` al crear `persona-trayectorias`  
**Estado:** 🔴 PENDIENTE

---

## 🐛 Problema

Al intentar crear una nueva `persona-trayectorias` mediante POST a `/api/persona-trayectorias`, Strapi rechaza la petición con el error:

```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid key region",
    "details": {
      "key": "region",
      "path": "region"
    }
  }
}
```

**IMPORTANTE:** El campo `region` NO está siendo enviado en el payload desde el frontend. Hemos verificado múltiples veces que el payload solo contiene:
- `persona` (ID numérico o `{ connect: [id] }`)
- `colegio` (ID numérico o `{ connect: [id] }`)
- `cargo` (string o null)
- `is_current` (boolean)
- `activo` (boolean)

---

## 📋 Preguntas Específicas

### 1. **Sobre el Schema de `persona-trayectorias`**

**Pregunta:** ¿El content type `persona-trayectorias` tiene un campo llamado `region` definido en su schema?

**Contexto:**
- Según nuestro diagnóstico, el schema de `persona-trayectorias` NO tiene un campo `region` directo
- Sin embargo, tiene un campo `colegio_region` (que es diferente)
- El error menciona `"path": "region"`, lo que sugiere que Strapi está esperando o rechazando este campo

**Acción requerida:** Confirmar si existe algún campo `region` (no `colegio_region`) en el schema de `persona-trayectorias`.

---

### 2. **Sobre Middlewares o Hooks**

**Pregunta:** ¿Hay algún middleware, hook (beforeCreate, beforeUpdate), o transformación automática configurada para el content type `persona-trayectorias` que pueda estar agregando o validando el campo `region`?

**Contexto:**
- El payload que enviamos NO incluye `region`
- Strapi rechaza la petición diciendo que `region` es una "key inválida"
- Esto sugiere que:
  - O Strapi está agregando `region` automáticamente desde algún lugar
  - O hay una validación que está buscando `region` y no lo encuentra (pero el error dice "Invalid key", no "Missing required field")

**Acción requerida:** Revisar si hay hooks personalizados, middlewares, o validaciones que puedan estar relacionadas con el campo `region`.

---

### 3. **Sobre el Formato de Relaciones `manyToOne`**

**Pregunta:** Para relaciones `manyToOne` en Strapi v4, ¿cuál es el formato correcto para conectar una relación?

**Contexto:**
- Hemos probado dos formatos:
  1. `{ connect: [id] }` - Formato tradicional de Strapi
  2. `id` directamente - Formato simplificado

**Ejemplo del payload que enviamos:**
```json
{
  "data": {
    "persona": 12345,  // o { "connect": [12345] }
    "colegio": 67890,  // o { "connect": [67890] }
    "cargo": "Profesor de Matemáticas",
    "is_current": true,
    "activo": true
  }
}
```

**Acción requerida:** Confirmar cuál es el formato correcto para relaciones `manyToOne` en Strapi v4, y si este formato puede estar causando que Strapi intente extraer campos del objeto relacionado (como `region` del `colegio`).

---

### 4. **Sobre `populate=deep` y Transformaciones Automáticas**

**Pregunta:** ¿El uso de `populate=deep` en otras partes del código (como en `/api/crm/colegios/[id]`) puede estar causando que Strapi espere o transforme campos de manera diferente en las peticiones POST?

**Contexto:**
- Recientemente se cambió el código para usar `populate=deep` en lugar de construir manualmente los parámetros de populate
- Esto podría estar afectando cómo Strapi interpreta las relaciones en las peticiones POST

**Acción requerida:** Verificar si hay alguna configuración global o comportamiento de Strapi que pueda estar causando transformaciones automáticas de campos cuando se usan relaciones.

---

### 5. **Sobre Validaciones del Content Type**

**Pregunta:** ¿Hay validaciones personalizadas configuradas para `persona-trayectorias` que puedan estar causando este error?

**Contexto:**
- El error es `ValidationError` con `"Invalid key region"`
- Esto sugiere que Strapi está validando que `region` NO debe estar presente
- Pero nosotros NO lo estamos enviando

**Acción requerida:** Revisar las validaciones del content type `persona-trayectorias` y confirmar si hay alguna validación que esté rechazando campos específicos.

---

### 6. **Sobre Logs del Servidor Strapi**

**Pregunta:** ¿Pueden compartir los logs del servidor Strapi cuando se intenta crear una `persona-trayectorias`?

**Contexto:**
- Necesitamos ver exactamente qué está recibiendo Strapi
- Los logs del servidor Strapi mostrarían:
  - El payload exacto que recibe
  - Cualquier transformación que se aplique
  - El punto exacto donde falla la validación

**Acción requerida:** Compartir los logs del servidor Strapi (con datos sensibles ofuscados si es necesario) para una petición POST a `/api/persona-trayectorias`.

---

## 🔍 Información Adicional

### Payload Exacto que Enviamos

```json
{
  "data": {
    "persona": 12345,
    "colegio": 67890,
    "cargo": "Profesor de Matemáticas",
    "is_current": true,
    "activo": true
  }
}
```

### Logs del Frontend

En el frontend, tenemos logs extensivos que confirman que NO enviamos `region`:

```
[API /persona-trayectorias POST] 📥 Request recibido: { ... }
[API /persona-trayectorias POST] 📤 Payload FINAL para enviar a Strapi: { ... }
[API /persona-trayectorias POST] ✅ Verificación final - tiene region: false
[Strapi Client POST] 📤 Enviando a persona-trayectorias: { tieneRegion: false, ... }
```

### Schema de `persona-trayectorias` (según nuestro diagnóstico)

Campos que SÍ existen:
- `id`, `documentId`
- `persona` (relación manyToOne)
- `colegio` (relación manyToOne)
- `cargo`, `anio`, `curso`, `asignatura`
- `is_current`, `activo`
- `fecha_inicio`, `fecha_fin`, `notas`
- `colegio_region` (⚠️ NOTA: Este es `colegio_region`, NO `region`)
- `correo`, `fecha_registro`, `ultimo_acceso`
- `org_display_name`, `role_key`, `department`
- `curso_asignatura`, `colegio_comuna`

Campos que NO existen:
- `region` (directo)
- `comuna` (directo)
- `dependencia` (directo)

---

## 🎯 Acción Inmediata Solicitada

**Por favor, revisar:**
1. ✅ El schema de `persona-trayectorias` en Strapi Admin
2. ✅ Los hooks/middlewares configurados para este content type
3. ✅ Los logs del servidor Strapi cuando se intenta crear una trayectoria
4. ✅ Si hay alguna transformación automática que pueda estar agregando `region`

**Si es posible, compartir:**
- 📋 El schema completo de `persona-trayectorias` (exportado desde Strapi)
- 📝 Los hooks/middlewares relacionados
- 📊 Los logs del servidor durante una petición POST fallida

---

---

## 🔴 Estado Actual del Problema

**Última prueba:** Enero 2026  
**Resultado:** ❌ El error persiste incluso después de:
- ✅ Cambiar formato de relaciones a `{ connect: [id] }`
- ✅ Múltiples capas de filtrado y eliminación de campos prohibidos
- ✅ Verificación exhaustiva de que `region` NO se envía en el payload

**Evidencia:**
- Los logs del frontend confirman que NO enviamos `region`
- El error persiste: `"Invalid key region"` con `"path": "region"`
- El problema está definitivamente en el backend de Strapi

**Conclusión:**
El lifecycle hook `syncColegioLocation` en Strapi está probablemente causando que Strapi valide o procese el campo `region` aunque no lo estemos enviando. Esto requiere una solución en el backend de Strapi.

---

**Última actualización:** Enero 2026  
**Contacto:** Mati (desarrollador frontend)
