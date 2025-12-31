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
  - `search` o `filters[colegio_nombre][$containsi]`: Búsqueda por nombre
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

**Campos principales (según schema real):**

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `rbd` | Integer | RBD (Rol Base de Datos) del colegio | ✅ Sí (único) |
| `colegio_nombre` | String (Text) | Nombre del colegio | ✅ Sí |
| `estado` | Enumeration | Estado: "Por Verificar", "Verificado", "Aprobado" | ❌ No (default: "Por Verificar") |
| `estado_nombre` | Enumeration | Estado nombre: "Por Verificar", "Verificado", "Aprobado", "Rechazado" | ❌ No |
| `rbd_digito_verificador` | String | Dígito verificador del RBD | ❌ No |
| `dependencia` | Enumeration | Tipo de dependencia (Municipal, Particular, etc.) | ❌ No |
| `ruralidad` | Enumeration | "Urbano" o "Rural" | ❌ No |
| `estado_estab` | Enumeration | Estado del establecimiento | ❌ No |
| `region` | String | Región | ❌ No |
| `provincia` | String | Provincia | ❌ No |
| `zona` | String | Zona | ❌ No |
| `telefonos` | Component (repeatable) | Componente `contacto.telefono` | ❌ No |
| `emails` | Component (repeatable) | Componente `contacto.email` | ❌ No |
| `direcciones` | Component (repeatable) | Componente `contacto.direccion` | ❌ No |
| `Website` | Component (repeatable) | Componente `contacto.website` | ❌ No |
| `logo` | Component | Componente `contacto.logo-o-avatar` | ❌ No |
| `createdAt` | DateTime | Fecha de creación (automático) | ✅ Sí |
| `updatedAt` | DateTime | Fecha de actualización (automático) | ✅ Sí |

**Relaciones:**
- `comuna` → Relación manyToOne con `api::comuna.comuna`
- `sostenedor` → Relación manyToOne con `api::colegio-sostenedor.colegio-sostenedor`
- `cartera_asignaciones` → Relación oneToMany con `api::cartera-asignacion.cartera-asignacion`
- `persona_trayectorias` → Relación oneToMany con `api::persona-trayectoria.persona-trayectoria`
- `listas_utiles` → Relación oneToMany con `api::colegio-list.colegio-list`
- `listas_escolares` → Relación oneToMany con `api::lista-escolar.lista-escolar`

**Nota importante:** 
- `telefonos`, `emails` y `direcciones` son **componentes repeatable**, no campos simples
- El frontend debe acceder a estos como arrays: `telefonos[0].numero`, `emails[0].email`, etc.

---

### 2. Content Type: `persona`

**Campos principales (según schema real):**

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `rut` | String (Text) | RUT de la persona (único) | ❌ No |
| `nombres` | String (Text) | Nombres de la persona | ❌ No |
| `primer_apellido` | String (Text) | Primer apellido | ❌ No |
| `segundo_apellido` | String (Text) | Segundo apellido | ❌ No |
| `nombre_apellidos` | String (Text) | Nombre con apellidos | ❌ No |
| `iniciales` | String (Text) | Iniciales | ❌ No |
| `nombre_completo` | String (Text) | Nombre completo | ❌ No |
| `status_nombres` | Enumeration | Estado: "Por Verificar", "Verificado", "Aprobado", "Eliminado", "Rechazado" | ❌ No |
| `nivel_confianza` | Enumeration | "baja", "media", "alta" | ❌ No (default: "baja") |
| `origen` | Enumeration | "mineduc", "csv", "manual", "crm", "web", "otro" | ❌ No (default: "manual") |
| `activo` | Boolean | Estado activo/inactivo | ❌ No (default: true) |
| `notas` | Text | Notas adicionales | ❌ No |
| `genero` | Enumeration | "Mujer" o "Hombre" | ❌ No |
| `cumpleagno` | Date | Fecha de nacimiento | ❌ No |
| `telefonos` | Component (repeatable) | Componente `contacto.telefono` | ❌ No |
| `emails` | Component (repeatable) | Componente `contacto.email` | ❌ No |
| `imagen` | Component | Componente `contacto.logo-o-avatar` | ❌ No |
| `identificadores_externos` | JSON | Identificadores externos | ❌ No |
| `createdAt` | DateTime | Fecha de creación (automático) | ✅ Sí |
| `updatedAt` | DateTime | Fecha de actualización (automático) | ✅ Sí |

**Relaciones:**
- `tags` → Relación manyToMany con `api::persona-tag.persona-tag`
- `cartera_asignaciones` → Relación oneToMany con `api::cartera-asignacion.cartera-asignacion` (mappedBy: "ejecutivo")
- `trayectorias` → Relación oneToMany con `api::persona-trayectoria.persona-trayectoria` (mappedBy: "persona")

**Nota importante:**
- `telefonos` y `emails` son **componentes repeatable**, no campos simples
- El frontend debe acceder a estos como arrays: `telefonos[0].numero`, `emails[0].email`, etc.
- Si `nombre_completo` está vacío, el frontend lo construye automáticamente desde `nombres`, `primer_apellido` y `segundo_apellido`.

---

## 🔍 Búsquedas y Filtros

### Para Colegios:
- **Búsqueda por nombre:** `filters[colegio_nombre][$containsi]=texto`
- **Búsqueda por RBD:** `filters[rbd][$eq]=12345`
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
- Nombre (`colegio_nombre`) (con enlace a detalle)
- RBD (`rbd`) en lugar de RUT
- Dirección (primera de `direcciones` component si está disponible)
- Teléfono (primero de `telefonos` component si está disponible)
- Email (primero de `emails` component si está disponible)
- Estado (`estado` enumeration)
- Botón "Ver detalle"

### Listado de Personas:
- Nombre completo (`nombre_completo`) (con enlace a detalle)
- RUT
- Género (`genero` enumeration: "Mujer" o "Hombre")
- Fecha de nacimiento (`cumpleagno` date)
- Estado (`activo` boolean)
- Botón "Ver detalle"

---

## 🎨 Funcionalidades del Frontend

### ✅ IMPLEMENTADO:

1. **Listados básicos:**
   - Tablas interactivas con ordenamiento por columnas
   - Búsqueda básica en tiempo real
   - Paginación estándar
   - Visualización de datos principales

2. **Búsqueda básica:**
   - Colegios: Por `colegio_nombre`
   - Personas: Por `nombre_completo` o RUT

3. **Fichas de detalle:**
   - Página de detalle de colegio: `/crm/colegios/[id]` ✅ IMPLEMENTADO
   - Página de detalle de persona: `/crm/personas/[id]` ✅ IMPLEMENTADO
   - Pestaña "Info" con información básica

4. **Visualización:**
   - Badges de estado
   - Iconos para teléfono, email, dirección
   - Enlaces a páginas de detalle

### 🚧 PENDIENTE:

1. **Búsqueda avanzada:**
   - Filtros múltiples
   - Búsqueda por RBD, región, comuna, etc.
   - Filtros por estado, dependencia, ruralidad

2. **Ordenamiento avanzado:**
   - Ordenamiento por múltiples columnas
   - Ordenamiento personalizado

3. **Asignaciones:**
   - Visualización de asignaciones de cartera
   - Gestión de asignaciones

4. **Actividades:**
   - Timeline de actividades
   - Historial de cambios

5. **Edición y creación:**
   - Formularios para editar colegios y personas
   - Formularios para crear nuevos registros

6. **Exportación:**
   - Exportar a Excel/CSV
   - Exportar con filtros aplicados

---

## 🔗 Rutas del Frontend

- **Listado de Colegios:** `/crm/colegios` ✅
- **Detalle de Colegio:** `/crm/colegios/[id]` ✅ IMPLEMENTADO
- **Listado de Personas:** `/crm/personas` ✅
- **Detalle de Persona:** `/crm/personas/[id]` ✅ IMPLEMENTADO

---

## 📝 Notas Técnicas

### Manejo de Variaciones de Nombres

El frontend está preparado para manejar diferentes variaciones de nombres de campos:

**Para Colegios:**
- `colegio_nombre` (campo principal de nombre)
- `rbd` (integer, no "rut")
- `direcciones` (component repeatable, acceder como array)
- `telefonos` (component repeatable, acceder como array)
- `emails` (component repeatable, acceder como array)
- `estado` (enumeration, no "activo" boolean)
- `comuna` (relation, puede accederse como objeto con `.nombre`)

**Para Personas:**
- `nombre_completo`
- `nombres`
- `primer_apellido`
- `segundo_apellido`
- `rut`
- `genero` (enumeration: "Mujer" o "Hombre")
- `cumpleagno` (date, no string)
- `activo` (boolean)
- `telefonos` (component repeatable, acceder como array)
- `emails` (component repeatable, acceder como array)

### Estructura de Respuesta Esperada

El frontend espera respuestas en formato Strapi estándar:

**Ejemplo de respuesta para Colegio:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "attributes": {
        "rbd": 12345,
        "colegio_nombre": "Colegio Ejemplo",
        "estado": "Aprobado",
        "telefonos": [
          {
            "numero": "+56 9 1234 5678",
            "tipo": "principal"
          }
        ],
        "emails": [
          {
            "email": "contacto@colegioejemplo.cl",
            "tipo": "principal"
          }
        ],
        "direcciones": [
          {
            "calle": "Calle Principal 123",
            "comuna": "Santiago"
          }
        ],
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

**Ejemplo de respuesta para Persona:**
```json
{
  "success": true,
  "data": [
    {
      "id": "456",
      "attributes": {
        "rut": "12345678-9",
        "nombres": "Juan",
        "primer_apellido": "Pérez",
        "segundo_apellido": "González",
        "nombre_completo": "Juan Pérez González",
        "genero": "Hombre",
        "cumpleagno": "1990-05-15",
        "activo": true,
        "telefonos": [
          {
            "numero": "+56 9 8765 4321",
            "tipo": "móvil"
          }
        ],
        "emails": [
          {
            "email": "juan.perez@example.com",
            "tipo": "personal"
          }
        ],
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    }
  ]
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

1. ✅ **Páginas de detalle:** Ya implementadas (`/crm/colegios/[id]` y `/crm/personas/[id]`)
2. 🚧 **Edición:** Agregar funcionalidad para editar colegios y personas desde el frontend
3. 🚧 **Creación:** Agregar formularios para crear nuevos registros
4. 🚧 **Relaciones:** Mostrar relaciones completas (personas de un colegio, trayectorias, asignaciones)
5. 🚧 **Exportación:** Agregar exportación a Excel/CSV
6. 🚧 **Búsqueda avanzada:** Implementar filtros múltiples y búsqueda por RBD, región, etc.

---

**Estado Actual:** 
- ✅ Frontend completo con listados y fichas de detalle
- ✅ Backend (Strapi) con schemas reales documentados
- 🚧 Pendiente: Funcionalidades avanzadas (búsqueda, filtros, edición, creación)

