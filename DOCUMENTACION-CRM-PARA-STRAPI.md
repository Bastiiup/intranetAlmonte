# 📋 Documentación del Módulo CRM para Strapi

**Fecha:** 29-12-2025  
**Módulo:** CRM (Gestión de Colegios y Personas)  
**Estado:** ✅ Frontend implementado - Backend necesita verificación

---

## 🎯 Resumen

Se ha implementado un módulo CRM en la intranet que permite visualizar y gestionar **Colegios** y **Personas** desde la interfaz web. El frontend está completo y funcionando, conectándose a Strapi mediante APIs.

---

## 📁 Estructura del Frontend

### APIs Creadas

#### 1. `/api/crm/colegios/route.ts`
- **Método:** GET
- **Endpoint Strapi:** `/api/colegios`
- **Funcionalidad:** Obtiene listado de colegios con paginación y búsqueda
- **Parámetros:**
  - `page`: Número de página (default: 1)
  - `pagination[pageSize]` o `pageSize`: Tamaño de página (default: 10)
  - `search` o `filters[nombre][$containsi]`: Búsqueda por nombre
- **Ordenamiento:** `sort=createdAt:desc` (más recientes primero)

#### 2. `/api/crm/personas/route.ts`
- **Método:** GET
- **Endpoint Strapi:** `/api/personas`
- **Funcionalidad:** Obtiene listado de personas con paginación y búsqueda
- **Parámetros:**
  - `page`: Número de página (default: 1)
  - `pagination[pageSize]` o `pageSize`: Tamaño de página (default: 10)
  - `search` o `filters[nombre_completo][$containsi]`: Búsqueda por nombre completo
  - `filters[rut][$eq]`: Filtro por RUT exacto
- **Ordenamiento:** `sort=createdAt:desc` (más recientes primero)

---

## 🗂️ Content Types Necesarios en Strapi

### 1. Content Type: `colegio`

**Campos requeridos:**

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `nombre` | String (Text) | Nombre del colegio | ✅ Sí |
| `rut` | String (Text) | RUT del colegio | ❌ No |
| `direccion` | String (Text) | Dirección completa | ❌ No |
| `comuna` | Relation → `comuna` | Comuna donde está ubicado | ❌ No |
| `region` | String (Text) | Región | ❌ No |
| `telefono` | String (Text) | Teléfono de contacto | ❌ No |
| `email` | Email | Email de contacto | ❌ No |
| `activo` | Boolean | Estado activo/inactivo | ❌ No (default: true) |
| `createdAt` | DateTime | Fecha de creación (automático) | ✅ Sí |
| `updatedAt` | DateTime | Fecha de actualización (automático) | ✅ Sí |

**Relaciones esperadas:**
- `comuna` → Relación con content type `comuna` (si existe)
- `personas` → Relación con content type `persona` (opcional, para ver personas asociadas)
- `eventos` → Relación con content type `colegio-event` (opcional)
- `asignaciones` → Relación con content type `cartera-asignacion` (opcional)
- `trayectorias` → Relación con content type `persona-trayectoria` (opcional)

**Nota:** El frontend maneja variaciones de nombres de campos (mayúsculas/minúsculas, con/sin guiones bajos) para compatibilidad.

---

### 2. Content Type: `persona`

**Campos requeridos:**

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `rut` | String (Text) | RUT de la persona | ❌ No |
| `nombres` | String (Text) | Nombres de la persona | ❌ No |
| `primer_apellido` | String (Text) | Primer apellido | ❌ No |
| `segundo_apellido` | String (Text) | Segundo apellido | ❌ No |
| `nombre_completo` | String (Text) | Nombre completo (puede generarse automáticamente) | ❌ No |
| `genero` | Enumeration | Género: 'M', 'F', u otros | ❌ No |
| `cumpleagno` | String (Text) | Fecha de nacimiento (formato libre) | ❌ No |
| `activo` | Boolean | Estado activo/inactivo | ❌ No (default: true) |
| `origen` | String (Text) | Origen del registro (ej: 'manual', 'importado') | ❌ No |
| `createdAt` | DateTime | Fecha de creación (automático) | ✅ Sí |
| `updatedAt` | DateTime | Fecha de actualización (automático) | ✅ Sí |

**Relaciones esperadas:**
- `colegio` → Relación con content type `colegio` (opcional, para asociar persona a un colegio)
- `trayectorias` → Relación con content type `persona-trayectoria` (opcional)
- `asignaciones` → Relación con content type `cartera-asignacion` (opcional)
- `eventos` → Relación con content type `colegio-event` (opcional)

**Nota:** Si `nombre_completo` está vacío, el frontend lo construye automáticamente desde `nombres`, `primer_apellido` y `segundo_apellido`.

---

## 🔍 Búsquedas y Filtros

### Para Colegios:
- **Búsqueda por nombre:** `filters[nombre][$containsi]=texto`
- **Paginación:** `pagination[page]=1&pagination[pageSize]=10`
- **Ordenamiento:** `sort=createdAt:desc`

### Para Personas:
- **Búsqueda por nombre completo:** `filters[nombre_completo][$containsi]=texto`
- **Filtro por RUT:** `filters[rut][$eq]=12345678-9`
- **Paginación:** `pagination[page]=1&pagination[pageSize]=10`
- **Ordenamiento:** `sort=createdAt:desc`

---

## 🔐 Permisos Necesarios en Strapi

Para que el módulo funcione, los siguientes content types deben tener permisos habilitados:

### Si se usa API Token:
- El token debe tener permisos de **lectura** (`find`, `findOne`) para:
  - `colegio`
  - `persona`
  - `comuna` (si se usa relación)
  - `colegio-event` (si se usa relación)
  - `cartera-asignacion` (si se usa relación)
  - `persona-trayectoria` (si se usa relación)

### Si se usa autenticación pública:
- El rol **Public** debe tener permisos de **lectura** (`find`, `findOne`) para los content types mencionados arriba.

---

## 📊 Datos que se Muestran en el Frontend

### Listado de Colegios:
- Nombre (con enlace a detalle)
- RUT
- Dirección (con comuna si está disponible)
- Teléfono
- Email
- Estado (Activo/Inactivo)
- Botón "Ver detalle"

### Listado de Personas:
- Nombre completo (con enlace a detalle)
- RUT
- Género
- Fecha de nacimiento
- Estado (Activo/Inactivo)
- Botón "Ver detalle"

---

## 🎨 Funcionalidades del Frontend

1. **Tablas interactivas:**
   - Ordenamiento por columnas
   - Búsqueda en tiempo real
   - Paginación
   - Filtrado

2. **Búsqueda:**
   - Colegios: Por nombre
   - Personas: Por nombre completo o RUT

3. **Visualización:**
   - Badges de estado (Activo/Inactivo)
   - Iconos para teléfono, email, dirección
   - Enlaces a páginas de detalle (aún no implementadas)

---

## 🔗 Rutas del Frontend

- **Listado de Colegios:** `/crm/colegios`
- **Detalle de Colegio:** `/crm/colegios/[id]` (pendiente de implementar)
- **Listado de Personas:** `/crm/personas`
- **Detalle de Persona:** `/crm/personas/[id]` (pendiente de implementar)

---

## 📝 Notas Técnicas

### Manejo de Variaciones de Nombres

El frontend está preparado para manejar diferentes variaciones de nombres de campos:

**Para Colegios:**
- `nombre` o `NOMBRE`
- `rut` o `RUT`
- `direccion` o `DIRECCION`
- `comuna` o `COMUNA` (puede ser string o objeto con `.nombre` o `.NOMBRE`)
- `telefono` o `TELEFONO`
- `email` o `EMAIL`
- `activo` o `ACTIVO`

**Para Personas:**
- `nombre_completo` o `NOMBRE_COMPLETO`
- `nombres` o `NOMBRES`
- `primer_apellido` o `PRIMER_APELLIDO`
- `segundo_apellido` o `SEGUNDO_APELLIDO`
- `rut` o `RUT`
- `genero` o `GENERO`
- `cumpleagno` o `CUMPLEAGNO`
- `activo` o `ACTIVO`

### Estructura de Respuesta Esperada

El frontend espera respuestas en formato Strapi estándar:

```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "attributes": {
        "nombre": "Colegio Ejemplo",
        "rut": "12345678-9",
        "direccion": "Calle Principal 123",
        "activo": true,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 5,
      "total": 50
    }
  }
}
```

---

## ✅ Checklist para Strapi

- [ ] Verificar que existe el content type `colegio` con los campos mencionados
- [ ] Verificar que existe el content type `persona` con los campos mencionados
- [ ] Verificar que los campos tienen los tipos correctos
- [ ] Verificar que las relaciones están configuradas (si se usan)
- [ ] Verificar permisos de API (token o público)
- [ ] Probar endpoint `/api/colegios` con paginación y búsqueda
- [ ] Probar endpoint `/api/personas` con paginación y búsqueda
- [ ] Verificar que los datos están publicados (no en Draft)
- [ ] Verificar que `createdAt` y `updatedAt` se generan automáticamente

---

## 🚨 Problemas Comunes

### Error: "Error al obtener colegios"
- **Causa:** Content type `colegio` no existe o no tiene permisos
- **Solución:** Crear content type o verificar permisos

### La página carga pero no muestra datos
- **Causa:** Los registros están en estado Draft
- **Solución:** Publicar los registros en Strapi

### Error 404 en las APIs
- **Causa:** Las rutas `/api/crm/colegios` o `/api/crm/personas` no existen
- **Solución:** Verificar que las APIs están creadas en el frontend

### Los campos aparecen como "-" o vacíos
- **Causa:** Los nombres de campos no coinciden o están en mayúsculas
- **Solución:** Verificar nombres de campos en Strapi (el frontend maneja variaciones)

---

## 📞 Próximos Pasos

1. **Páginas de detalle:** Implementar `/crm/colegios/[id]` y `/crm/personas/[id]`
2. **Edición:** Agregar funcionalidad para editar colegios y personas desde el frontend
3. **Creación:** Agregar formularios para crear nuevos registros
4. **Relaciones:** Mostrar relaciones (personas de un colegio, colegio de una persona)
5. **Exportación:** Agregar exportación a Excel/CSV

---

**Estado Actual:** ✅ Frontend completo - Backend necesita verificación y posible ajuste de campos

